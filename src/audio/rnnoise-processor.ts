import { log } from '../utils/logger';

let workletNode: AudioWorkletNode | null = null;
let wasmBytes: ArrayBuffer | null = null;
let registeredCtx: WeakRef<AudioContext> | null = null;

/**
 * Captures the raw WASM binary during the first load of the
 * @shiguredo/rnnoise-wasm Emscripten module. The captured bytes are later
 * sent to the AudioWorklet thread for compilation + instantiation.
 */
async function ensureWasmBytes(): Promise<ArrayBuffer> {
  if (wasmBytes) return wasmBytes;

  const origInstantiate = WebAssembly.instantiate;
  WebAssembly.instantiate = async function (source: any, imports: any) {
    if (!wasmBytes && (source instanceof ArrayBuffer || ArrayBuffer.isView(source))) {
      // Copy the bytes before the original call potentially detaches the buffer
      wasmBytes = source instanceof ArrayBuffer
        ? source.slice(0)
        : source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    }
    return origInstantiate.call(WebAssembly, source, imports);
  } as typeof WebAssembly.instantiate;

  try {
    const { Rnnoise } = await import('@shiguredo/rnnoise-wasm');
    await Rnnoise.load();
  } finally {
    WebAssembly.instantiate = origInstantiate;
  }

  if (!wasmBytes) {
    throw new Error('Failed to capture RNNoise WASM binary');
  }
  return wasmBytes;
}

/**
 * Creates an AudioWorkletNode that applies RNNoise noise suppression.
 * Mono in → mono out. Returns null on failure (graceful degradation).
 */
export async function createNoiseSuppressionNode(
  ctx: AudioContext
): Promise<AudioWorkletNode | null> {
  try {
    const bytes = await ensureWasmBytes();

    // Register the worklet processor once per AudioContext (re-register if context changed)
    if (!registeredCtx || registeredCtx.deref() !== ctx) {
      const workletUrl = new URL('./rnnoise-worklet-processor.js', import.meta.url);
      await ctx.audioWorklet.addModule(workletUrl);
      registeredCtx = new WeakRef(ctx);
    }

    const node = new AudioWorkletNode(ctx, 'rnnoise-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });

    // Wait for the worklet to confirm WASM initialization.
    // Set onmessage BEFORE posting init to avoid race.
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('RNNoise worklet init timeout')), 5000);
      node.port.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'log') {
          const level = e.data.level === 'error' ? 'error' : 'info';
          log[level](e.data.message);
          return;
        }
        clearTimeout(timeout);
        if (e.data.type === 'ready') {
          resolve();
        } else if (e.data.type === 'error') {
          reject(new Error(e.data.message));
        }
      };
      // Send raw WASM bytes — compiled WebAssembly.Module can have cloning issues in worklets
      node.port.postMessage({ type: 'init', wasmBytes: bytes });
    });

    workletNode = node;
    return node;
  } catch (err) {
    log.error('[RNNoise] Failed to create AudioWorklet processor:', err);
    return null;
  }
}

/**
 * Tears down the noise suppression worklet node.
 */
export function destroyNoiseSuppressionNode(): void {
  if (workletNode) {
    workletNode.port.postMessage({ type: 'destroy' });
    workletNode.disconnect();
    workletNode = null;
  }
}
