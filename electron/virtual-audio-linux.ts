import { execSync } from 'child_process';
import { log } from './logger';

const SINK_NAME = 'SoundDome';
const SINK_DESCRIPTION = 'SoundDome Virtual Mic';

let moduleId: number | null = null;

/**
 * Load a PulseAudio/PipeWire null sink for virtual mic routing on Linux.
 * Must be called before window creation so the sink is available when
 * the renderer enumerates audio devices.
 */
export function loadLinuxVirtualAudio(): void {
  if (process.platform !== 'linux') return;

  try {
    // Check that pactl is available
    execSync('pactl --version', { stdio: 'ignore' });
  } catch {
    log.warn('[virtual-audio-linux] pactl not found — skipping null sink setup');
    return;
  }

  // Check if the sink already exists (crash recovery — previous instance didn't unload)
  try {
    const list = execSync('pactl list short sinks', { encoding: 'utf-8' });
    const existing = list.split('\n').find((line) => line.includes(SINK_NAME));
    if (existing) {
      const id = parseInt(existing.split('\t')[0], 10);
      if (!isNaN(id)) {
        moduleId = id;
        log.info(`[virtual-audio-linux] Reusing existing sink (id=${id})`);
        return;
      }
    }
  } catch {
    // pactl list failed — continue to create
  }

  try {
    const output = execSync(
      `pactl load-module module-null-sink sink_name=${SINK_NAME} sink_properties=device.description="${SINK_DESCRIPTION}"`,
      { encoding: 'utf-8' },
    );
    moduleId = parseInt(output.trim(), 10);
    log.info(`[virtual-audio-linux] Loaded null sink (module=${moduleId})`);
  } catch (err) {
    log.warn('[virtual-audio-linux] Failed to load null sink:', err);
  }
}

/**
 * Unload the null sink on app quit.
 */
export function unloadLinuxVirtualAudio(): void {
  if (process.platform !== 'linux' || moduleId === null) return;

  try {
    execSync(`pactl unload-module ${moduleId}`, { stdio: 'ignore' });
    log.info(`[virtual-audio-linux] Unloaded null sink (module=${moduleId})`);
  } catch (err) {
    log.warn('[virtual-audio-linux] Failed to unload null sink:', err);
  }
  moduleId = null;
}
