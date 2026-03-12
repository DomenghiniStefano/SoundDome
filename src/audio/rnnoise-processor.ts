import { Rnnoise, type DenoiseState } from '@shiguredo/rnnoise-wasm';
import { FrameAccumulator } from './frame-accumulator';
import { log } from '../utils/logger';
import { RNNOISE_BUFFER_SIZE, RNNOISE_PCM_SCALE } from '../enums/constants';

let rnnoise: Rnnoise | null = null;
let denoiseState: DenoiseState | null = null;
let accumulator: FrameAccumulator | null = null;
let processorNode: ScriptProcessorNode | null = null;

/**
 * Creates a ScriptProcessorNode that applies RNNoise noise suppression.
 * Mono in → mono out. Returns null on WASM load failure (graceful degradation).
 */
export async function createNoiseSuppressionNode(
  ctx: AudioContext
): Promise<ScriptProcessorNode | null> {
  try {
    if (!rnnoise) {
      rnnoise = await Rnnoise.load();
    }
    denoiseState = rnnoise.createDenoiseState();
    accumulator = new FrameAccumulator(rnnoise.frameSize);

    const node = ctx.createScriptProcessor(RNNOISE_BUFFER_SIZE, 1, 1);
    node.onaudioprocess = (e: AudioProcessingEvent) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);

      if (!denoiseState || !accumulator) {
        output.set(input);
        return;
      }

      // Scale float [-1,1] → 16-bit PCM range and push
      const scaled = new Float32Array(input.length);
      for (let i = 0; i < input.length; i++) {
        scaled[i] = input[i] * RNNOISE_PCM_SCALE;
      }
      accumulator.pushInput(scaled);

      // Process all available frames
      while (accumulator.hasInputFrame()) {
        const frame = accumulator.popInputFrame();
        denoiseState.processFrame(frame);
        // frame is modified in-place by processFrame
        accumulator.pushOutput(frame);
      }

      // Read processed samples back, scale to float
      const processed = new Float32Array(output.length);
      accumulator.popOutput(processed);
      for (let i = 0; i < output.length; i++) {
        output[i] = processed[i] / RNNOISE_PCM_SCALE;
      }
    };

    processorNode = node;
    return node;
  } catch (err) {
    log.error('[RNNoise] Failed to load WASM or create processor:', err);
    return null;
  }
}

/**
 * Tears down the noise suppression node and frees WASM memory.
 */
export function destroyNoiseSuppressionNode(): void {
  if (processorNode) {
    processorNode.onaudioprocess = null;
    processorNode.disconnect();
    processorNode = null;
  }
  if (denoiseState) {
    denoiseState.destroy();
    denoiseState = null;
  }
  if (accumulator) {
    accumulator.reset();
    accumulator = null;
  }
}
