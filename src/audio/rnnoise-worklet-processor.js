/**
 * AudioWorkletProcessor that runs RNNoise noise suppression on the audio thread.
 *
 * Receives raw WASM bytes via port.postMessage({ type: 'init', wasmBytes }).
 * Compiles and instantiates the WASM module with minimal Emscripten-compatible stubs,
 * then calls raw RNNoise C exports (rnnoise_create, rnnoise_process_frame, rnnoise_destroy).
 *
 * Frame accumulation (bridging 128-sample render quanta to 480-sample RNNoise frames)
 * is handled inline — no external imports allowed in worklet processors.
 */

const PCM_SCALE = 32768;

class RnnoiseWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.wasmReady = false;
    this.wasmExports = null;
    this.wasmMemory = null;
    this.denoiseState = 0;
    this.frameSize = 480;
    this.inputBufPtr = 0;
    this.outputBufPtr = 0;
    this.heapF32 = null;

    // Inline ring buffer for frame accumulation
    this.inputRing = new Float32Array(480 * 4);
    this.inputWritePos = 0;
    this.outputRing = new Float32Array(480 * 4);
    this.outputReadPos = 0;
    this.outputAvailable = 0;

    this.port.onmessage = (e) => {
      if (e.data.type === 'init') {
        this._initWasm(e.data.wasmBytes);
      } else if (e.data.type === 'destroy') {
        this._destroyState();
      }
    };
  }

  async _initWasm(wasmBytes) {
    try {
      const wasmModule = await WebAssembly.compile(wasmBytes);
      const instance = await WebAssembly.instantiate(wasmModule, {
        env: {
          __assert_fail: () => { /* no-op in audio thread */ },
          emscripten_resize_heap: () => 0,
        },
        wasi_snapshot_preview1: {
          fd_write: () => 0,
        },
      });

      const exports = instance.exports;
      this.wasmExports = exports;
      this.wasmMemory = exports.memory;

      // Initialize Emscripten runtime (sets up stack, calls constructors)
      if (exports.__wasm_call_ctors) {
        exports.__wasm_call_ctors();
      }

      this.frameSize = exports.rnnoise_get_frame_size();
      this.denoiseState = exports.rnnoise_create(0);

      // Allocate input/output buffers in WASM linear memory (float32 = 4 bytes each)
      this.inputBufPtr = exports.malloc(this.frameSize * 4);
      this.outputBufPtr = exports.malloc(this.frameSize * 4);

      this.heapF32 = new Float32Array(this.wasmMemory.buffer);

      // Re-init ring buffers for the actual frame size
      this.inputRing = new Float32Array(this.frameSize * 4);
      this.outputRing = new Float32Array(this.frameSize * 4);
      this.inputWritePos = 0;
      this.outputReadPos = 0;
      this.outputAvailable = 0;

      this.wasmReady = true;
      this.port.postMessage({ type: 'ready' });
    } catch (err) {
      this.port.postMessage({ type: 'log', level: 'error', message: '[RNNoise Worklet] Init failed: ' + String(err) });
      this.port.postMessage({ type: 'error', message: String(err) });
    }
  }

  _destroyState() {
    if (this.wasmExports && this.denoiseState) {
      this.wasmExports.rnnoise_destroy(this.denoiseState);
      if (this.inputBufPtr) this.wasmExports.free(this.inputBufPtr);
      if (this.outputBufPtr) this.wasmExports.free(this.outputBufPtr);
    }
    this.wasmReady = false;
    this.denoiseState = 0;
    this.inputBufPtr = 0;
    this.outputBufPtr = 0;
    this.heapF32 = null;
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];

    if (!input || !output) return true;

    if (!this.wasmReady || !this.heapF32 || !this.wasmExports) {
      output.set(input);
      return true;
    }

    // Refresh HEAPF32 view if WASM memory grew
    if (this.heapF32.buffer !== this.wasmMemory.buffer) {
      this.heapF32 = new Float32Array(this.wasmMemory.buffer);
    }

    const blockSize = input.length;

    // Push input samples scaled to 16-bit PCM range
    this._ensureInputCapacity(this.inputWritePos + blockSize);
    for (let i = 0; i < blockSize; i++) {
      this.inputRing[this.inputWritePos + i] = input[i] * PCM_SCALE;
    }
    this.inputWritePos += blockSize;

    // Process all complete 480-sample frames
    const inputOffset = this.inputBufPtr >> 2;
    const outputOffset = this.outputBufPtr >> 2;

    while (this.inputWritePos >= this.frameSize) {
      // Copy frame into WASM input buffer
      this.heapF32.set(this.inputRing.subarray(0, this.frameSize), inputOffset);

      // rnnoise_process_frame(state, output_ptr, input_ptr) — C signature: (st, out, in)
      this.wasmExports.rnnoise_process_frame(this.denoiseState, this.outputBufPtr, this.inputBufPtr);

      // Read denoised frame from WASM output buffer
      this._ensureOutputCapacity(this.outputReadPos + this.outputAvailable + this.frameSize);
      this.outputRing.set(
        this.heapF32.subarray(outputOffset, outputOffset + this.frameSize),
        this.outputReadPos + this.outputAvailable
      );
      this.outputAvailable += this.frameSize;

      // Shift remaining input samples to the front
      const remaining = this.inputWritePos - this.frameSize;
      if (remaining > 0) {
        this.inputRing.copyWithin(0, this.frameSize, this.inputWritePos);
      }
      this.inputWritePos = remaining;
    }

    // Pop denoised samples, scale back to float [-1, 1]
    const toCopy = Math.min(this.outputAvailable, blockSize);
    if (toCopy > 0) {
      for (let i = 0; i < toCopy; i++) {
        output[i] = this.outputRing[this.outputReadPos + i] / PCM_SCALE;
      }
    }
    if (toCopy < blockSize) {
      output.fill(0, toCopy);
    }
    this.outputReadPos += toCopy;
    this.outputAvailable -= toCopy;

    // Compact output ring when read position drifts too far
    if (this.outputReadPos > this.frameSize * 2) {
      if (this.outputAvailable > 0) {
        this.outputRing.copyWithin(0, this.outputReadPos, this.outputReadPos + this.outputAvailable);
      }
      this.outputReadPos = 0;
    }

    return true;
  }

  _ensureInputCapacity(needed) {
    if (needed <= this.inputRing.length) return;
    const newBuf = new Float32Array(needed * 2);
    newBuf.set(this.inputRing.subarray(0, this.inputWritePos));
    this.inputRing = newBuf;
  }

  _ensureOutputCapacity(needed) {
    if (needed <= this.outputRing.length) return;
    const newBuf = new Float32Array(needed * 2);
    newBuf.set(this.outputRing.subarray(this.outputReadPos, this.outputReadPos + this.outputAvailable));
    this.outputReadPos = 0;
    this.outputRing = newBuf;
  }
}

registerProcessor('rnnoise-processor', RnnoiseWorkletProcessor);
