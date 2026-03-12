/**
 * Ring-buffer that bridges Web Audio's variable-size blocks (e.g. 128 samples)
 * to RNNoise's fixed 480-sample frames.
 *
 * Push input samples in any chunk size; pop exactly `frameSize` samples when
 * enough have accumulated. Same pattern for the output side.
 */
export class FrameAccumulator {
  private readonly frameSize: number;
  private inputBuffer: Float32Array;
  private inputWritePos = 0;
  private outputBuffer: Float32Array;
  private outputReadPos = 0;
  private outputAvailable = 0;

  constructor(frameSize: number) {
    this.frameSize = frameSize;
    // Pre-allocate buffers large enough for several frames
    this.inputBuffer = new Float32Array(frameSize * 4);
    this.outputBuffer = new Float32Array(frameSize * 4);
  }

  /**
   * Append incoming samples to the input accumulator.
   */
  pushInput(samples: Float32Array): void {
    this.ensureInputCapacity(this.inputWritePos + samples.length);
    this.inputBuffer.set(samples, this.inputWritePos);
    this.inputWritePos += samples.length;
  }

  /**
   * Returns true if at least one full frame is available for processing.
   */
  hasInputFrame(): boolean {
    return this.inputWritePos >= this.frameSize;
  }

  /**
   * Extract exactly `frameSize` samples from the input buffer.
   * Caller must check `hasInputFrame()` first.
   */
  popInputFrame(): Float32Array {
    const frame = this.inputBuffer.slice(0, this.frameSize);
    // Shift remaining samples to the front
    const remaining = this.inputWritePos - this.frameSize;
    if (remaining > 0) {
      this.inputBuffer.copyWithin(0, this.frameSize, this.inputWritePos);
    }
    this.inputWritePos = remaining;
    return frame;
  }

  /**
   * Append a processed frame to the output accumulator.
   */
  pushOutput(frame: Float32Array): void {
    this.ensureOutputCapacity(this.outputReadPos + this.outputAvailable + frame.length);
    this.outputBuffer.set(frame, this.outputReadPos + this.outputAvailable);
    this.outputAvailable += frame.length;
  }

  /**
   * Fill `target` from the output accumulator. If not enough samples are
   * available, the remaining portion of `target` is zero-filled.
   */
  popOutput(target: Float32Array): void {
    const toCopy = Math.min(this.outputAvailable, target.length);
    if (toCopy > 0) {
      target.set(this.outputBuffer.subarray(this.outputReadPos, this.outputReadPos + toCopy));
    }
    if (toCopy < target.length) {
      target.fill(0, toCopy);
    }
    this.outputReadPos += toCopy;
    this.outputAvailable -= toCopy;
    // Compact when we've consumed a lot
    if (this.outputReadPos > this.frameSize * 2) {
      if (this.outputAvailable > 0) {
        this.outputBuffer.copyWithin(0, this.outputReadPos, this.outputReadPos + this.outputAvailable);
      }
      this.outputReadPos = 0;
    }
  }

  /**
   * Reset all internal state (e.g. when toggling noise suppression).
   */
  reset(): void {
    this.inputWritePos = 0;
    this.outputReadPos = 0;
    this.outputAvailable = 0;
  }

  private ensureInputCapacity(needed: number): void {
    if (needed <= this.inputBuffer.length) return;
    const newBuf = new Float32Array(needed * 2);
    newBuf.set(this.inputBuffer.subarray(0, this.inputWritePos));
    this.inputBuffer = newBuf;
  }

  private ensureOutputCapacity(needed: number): void {
    if (needed <= this.outputBuffer.length) return;
    const newBuf = new Float32Array(needed * 2);
    newBuf.set(this.outputBuffer.subarray(this.outputReadPos, this.outputReadPos + this.outputAvailable));
    this.outputReadPos = 0;
    this.outputBuffer = newBuf;
  }
}
