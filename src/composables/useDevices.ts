import _ from 'lodash';
import { DeviceKind } from '../enums/audio';
import { VBCABLE_FILTER_KEYWORD } from '../enums/constants';

export function useDevices() {
  async function enumerateOutputDevices(): Promise<{ deviceId: string; label: string }[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return _(devices)
      .filter({ kind: DeviceKind.OUTPUT })
      .map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Device ${d.deviceId.substring(0, 8)}`
      }))
      .value();
  }

  async function enumerateInputDevices(): Promise<{ deviceId: string; label: string }[]> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) track.stop();
    } catch {
      // Permission denied — labels may be empty
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return _(devices)
      .filter(d => d.kind === DeviceKind.INPUT && !d.label.toLowerCase().includes(VBCABLE_FILTER_KEYWORD))
      .map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${d.deviceId.substring(0, 8)}`
      }))
      .value();
  }

  return { enumerateOutputDevices, enumerateInputDevices };
}
