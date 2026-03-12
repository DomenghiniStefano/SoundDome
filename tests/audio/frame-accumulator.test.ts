import { describe, it, expect, beforeEach } from 'vitest';
import { FrameAccumulator } from '../../src/audio/frame-accumulator';

describe('FrameAccumulator', () => {
  const FRAME_SIZE = 480;
  let acc: FrameAccumulator;

  beforeEach(() => {
    acc = new FrameAccumulator(FRAME_SIZE);
  });

  describe('input side', () => {
    it('has no input frame initially', () => {
      expect(acc.hasInputFrame()).toBe(false);
    });

    it('has input frame after pushing exactly frameSize samples', () => {
      acc.pushInput(new Float32Array(FRAME_SIZE));
      expect(acc.hasInputFrame()).toBe(true);
    });

    it('has no input frame when fewer than frameSize samples pushed', () => {
      acc.pushInput(new Float32Array(FRAME_SIZE - 1));
      expect(acc.hasInputFrame()).toBe(false);
    });

    it('accumulates multiple small pushes', () => {
      const chunkSize = 128;
      // Push 3 chunks of 128 = 384 < 480
      for (let i = 0; i < 3; i++) {
        acc.pushInput(new Float32Array(chunkSize));
      }
      expect(acc.hasInputFrame()).toBe(false);

      // Push 1 more chunk = 512 >= 480
      acc.pushInput(new Float32Array(chunkSize));
      expect(acc.hasInputFrame()).toBe(true);
    });

    it('popInputFrame returns exactly frameSize samples', () => {
      acc.pushInput(new Float32Array(FRAME_SIZE));
      const frame = acc.popInputFrame();
      expect(frame.length).toBe(FRAME_SIZE);
    });

    it('preserves sample values through push/pop', () => {
      const input = new Float32Array(FRAME_SIZE);
      for (let i = 0; i < FRAME_SIZE; i++) {
        input[i] = i;
      }
      acc.pushInput(input);
      const frame = acc.popInputFrame();
      for (let i = 0; i < FRAME_SIZE; i++) {
        expect(frame[i]).toBe(i);
      }
    });

    it('keeps remainder after popping a frame', () => {
      // Push 600 samples: should yield 1 frame with 120 remaining
      const input = new Float32Array(600);
      for (let i = 0; i < 600; i++) {
        input[i] = i;
      }
      acc.pushInput(input);

      expect(acc.hasInputFrame()).toBe(true);
      const frame1 = acc.popInputFrame();
      expect(frame1.length).toBe(FRAME_SIZE);
      expect(frame1[0]).toBe(0);
      expect(frame1[FRAME_SIZE - 1]).toBe(FRAME_SIZE - 1);

      // 120 remaining, not enough for another frame
      expect(acc.hasInputFrame()).toBe(false);

      // Push 360 more → 480 total remaining
      acc.pushInput(new Float32Array(360));
      expect(acc.hasInputFrame()).toBe(true);

      const frame2 = acc.popInputFrame();
      // First sample of frame2 should be FRAME_SIZE (= 480)
      expect(frame2[0]).toBe(FRAME_SIZE);
    });

    it('handles multiple frames from a single large push', () => {
      acc.pushInput(new Float32Array(FRAME_SIZE * 3));
      let count = 0;
      while (acc.hasInputFrame()) {
        acc.popInputFrame();
        count++;
      }
      expect(count).toBe(3);
    });
  });

  describe('output side', () => {
    it('zero-fills target when no output available', () => {
      const target = new Float32Array(128);
      target.fill(999);
      acc.popOutput(target);
      for (let i = 0; i < target.length; i++) {
        expect(target[i]).toBe(0);
      }
    });

    it('fills target from pushed output', () => {
      const frame = new Float32Array(FRAME_SIZE);
      for (let i = 0; i < FRAME_SIZE; i++) {
        frame[i] = i + 1;
      }
      acc.pushOutput(frame);

      const target = new Float32Array(128);
      acc.popOutput(target);
      for (let i = 0; i < 128; i++) {
        expect(target[i]).toBe(i + 1);
      }
    });

    it('consumes output across multiple pops', () => {
      const frame = new Float32Array(FRAME_SIZE);
      for (let i = 0; i < FRAME_SIZE; i++) {
        frame[i] = i;
      }
      acc.pushOutput(frame);

      // Pop 128 samples 3 times = 384
      for (let pop = 0; pop < 3; pop++) {
        const target = new Float32Array(128);
        acc.popOutput(target);
        for (let i = 0; i < 128; i++) {
          expect(target[i]).toBe(pop * 128 + i);
        }
      }

      // Pop 128 more: 96 real samples + 32 zeros
      const target = new Float32Array(128);
      acc.popOutput(target);
      for (let i = 0; i < 96; i++) {
        expect(target[i]).toBe(384 + i);
      }
      for (let i = 96; i < 128; i++) {
        expect(target[i]).toBe(0);
      }
    });

    it('handles multiple pushed frames', () => {
      const frame1 = new Float32Array(FRAME_SIZE).fill(1);
      const frame2 = new Float32Array(FRAME_SIZE).fill(2);
      acc.pushOutput(frame1);
      acc.pushOutput(frame2);

      const target1 = new Float32Array(FRAME_SIZE);
      acc.popOutput(target1);
      expect(target1[0]).toBe(1);
      expect(target1[FRAME_SIZE - 1]).toBe(1);

      const target2 = new Float32Array(FRAME_SIZE);
      acc.popOutput(target2);
      expect(target2[0]).toBe(2);
      expect(target2[FRAME_SIZE - 1]).toBe(2);
    });
  });

  describe('reset', () => {
    it('clears all accumulated input and output', () => {
      acc.pushInput(new Float32Array(FRAME_SIZE));
      const frame = new Float32Array(FRAME_SIZE).fill(42);
      acc.pushOutput(frame);

      acc.reset();

      expect(acc.hasInputFrame()).toBe(false);
      const target = new Float32Array(128);
      acc.popOutput(target);
      for (let i = 0; i < 128; i++) {
        expect(target[i]).toBe(0);
      }
    });
  });

  describe('edge cases', () => {
    it('handles zero-length push', () => {
      acc.pushInput(new Float32Array(0));
      expect(acc.hasInputFrame()).toBe(false);
    });

    it('handles frameSize of 1', () => {
      const tiny = new FrameAccumulator(1);
      tiny.pushInput(new Float32Array([42]));
      expect(tiny.hasInputFrame()).toBe(true);
      const frame = tiny.popInputFrame();
      expect(frame.length).toBe(1);
      expect(frame[0]).toBe(42);
    });

    it('grows input buffer when needed', () => {
      // Push a very large chunk to force buffer growth
      const large = new Float32Array(FRAME_SIZE * 10);
      for (let i = 0; i < large.length; i++) {
        large[i] = i;
      }
      acc.pushInput(large);

      let count = 0;
      while (acc.hasInputFrame()) {
        const frame = acc.popInputFrame();
        expect(frame[0]).toBe(count * FRAME_SIZE);
        count++;
      }
      expect(count).toBe(10);
    });
  });
});
