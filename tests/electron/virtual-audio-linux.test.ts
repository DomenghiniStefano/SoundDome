import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockExecSync = vi.fn();

vi.mock('child_process', () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

// Must import after mock setup
let loadLinuxVirtualAudio: typeof import('../../electron/virtual-audio-linux').loadLinuxVirtualAudio;
let unloadLinuxVirtualAudio: typeof import('../../electron/virtual-audio-linux').unloadLinuxVirtualAudio;

describe('virtual-audio-linux', () => {
  const originalPlatform = process.platform;

  function setPlatform(value: string) {
    Object.defineProperty(process, 'platform', { value, writable: true });
  }

  beforeEach(async () => {
    mockExecSync.mockReset();
    // Re-import to reset module state (moduleId)
    vi.resetModules();
    vi.mock('child_process', () => ({
      execSync: (...args: unknown[]) => mockExecSync(...args),
    }));
    const mod = await import('../../electron/virtual-audio-linux');
    loadLinuxVirtualAudio = mod.loadLinuxVirtualAudio;
    unloadLinuxVirtualAudio = mod.unloadLinuxVirtualAudio;
  });

  afterEach(() => {
    setPlatform(originalPlatform);
  });

  it('should be a no-op on Windows', () => {
    setPlatform('win32');
    loadLinuxVirtualAudio();
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('should be a no-op on macOS', () => {
    setPlatform('darwin');
    loadLinuxVirtualAudio();
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('should skip when pactl is not found', () => {
    setPlatform('linux');
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd === 'pactl --version') throw new Error('not found');
    });
    loadLinuxVirtualAudio();
    expect(mockExecSync).toHaveBeenCalledTimes(1);
    expect(mockExecSync).toHaveBeenCalledWith('pactl --version', { stdio: 'ignore' });
  });

  it('should load null sink when pactl is available', () => {
    setPlatform('linux');
    mockExecSync.mockImplementation((cmd: string, opts?: Record<string, unknown>) => {
      if (cmd === 'pactl --version') return;
      if (cmd === 'pactl list short sinks') return '';
      if (cmd.includes('load-module')) return '42\n';
      if (opts?.stdio === 'ignore') return;
    });

    loadLinuxVirtualAudio();

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('load-module module-null-sink sink_name=SoundDome'),
      expect.any(Object),
    );
  });

  it('should reuse existing sink on crash recovery', () => {
    setPlatform('linux');
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd === 'pactl --version') return;
      if (cmd === 'pactl list short sinks') return '7\tSoundDome\tmodule-null-sink\ts16le 2ch 44100Hz\tIDLE\n';
    });

    loadLinuxVirtualAudio();

    // Should NOT call load-module since sink already exists
    expect(mockExecSync).not.toHaveBeenCalledWith(
      expect.stringContaining('load-module'),
      expect.any(Object),
    );
  });

  it('should unload module on quit', () => {
    setPlatform('linux');
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd === 'pactl --version') return;
      if (cmd === 'pactl list short sinks') return '';
      if (cmd.includes('load-module')) return '42\n';
    });

    loadLinuxVirtualAudio();
    unloadLinuxVirtualAudio();

    expect(mockExecSync).toHaveBeenCalledWith('pactl unload-module 42', { stdio: 'ignore' });
  });

  it('should not unload if no module was loaded', () => {
    setPlatform('linux');
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd === 'pactl --version') throw new Error('not found');
    });

    loadLinuxVirtualAudio();
    unloadLinuxVirtualAudio();

    // Only the pactl --version check should have been called
    expect(mockExecSync).toHaveBeenCalledTimes(1);
  });

  it('should not unload on non-Linux platforms', () => {
    setPlatform('win32');
    unloadLinuxVirtualAudio();
    expect(mockExecSync).not.toHaveBeenCalled();
  });
});
