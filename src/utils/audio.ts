import { COMPRESSOR_PRESETS } from '../enums/constants';
import { CompressorPreset } from '../enums/audio';
import { log } from './logger';

export async function trySetSinkId(
  target: { setSinkId: (id: string) => Promise<void> },
  deviceId: string,
  label: string
): Promise<void> {
  try {
    await target.setSinkId(deviceId);
  } catch (err) {
    log.warn(`[Audio] setSinkId failed for ${label} device ${deviceId} — using default output:`, err);
  }
}

export function applyCompressorPreset(comp: DynamicsCompressorNode, presetName: string) {
  const preset = COMPRESSOR_PRESETS[presetName as keyof typeof COMPRESSOR_PRESETS]
    || COMPRESSOR_PRESETS[CompressorPreset.MEDIUM];
  comp.threshold.value = preset.threshold;
  comp.knee.value = preset.knee;
  comp.ratio.value = preset.ratio;
  comp.attack.value = preset.attack;
  comp.release.value = preset.release;
}
