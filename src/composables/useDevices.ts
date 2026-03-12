import _ from 'lodash';
import { DeviceKind, COMMUNICATIONS_DEVICE_ID, DEFAULT_DEVICE_ID } from '../enums/audio';
import { VIRTUAL_DEVICE_FILTER_KEYWORDS, VIRTUAL_MIC_KEYWORDS } from '../enums/constants';

export function isVirtualAudioDevice(label: string): boolean {
  const lower = label.toLowerCase();
  return _.some(VIRTUAL_MIC_KEYWORDS, keyword => lower.includes(keyword));
}

function isVirtualDeviceInput(label: string): boolean {
  const lower = label.toLowerCase();
  return _.some(VIRTUAL_DEVICE_FILTER_KEYWORDS, keyword => lower.includes(keyword));
}

export function resolveDeviceId(
  devices: { deviceId: string; label: string }[],
  savedId: string,
  savedLabel: string
): { deviceId: string; label: string } | null {
  if (!savedId && !savedLabel) return null;
  const byId = _.find(devices, { deviceId: savedId });
  if (byId) return byId;
  if (savedLabel) {
    const byLabel = _.find(devices, { label: savedLabel });
    if (byLabel) return byLabel;
  }
  return null;
}

export function useDevices() {
  async function enumerateOutputDevices(): Promise<{ deviceId: string; label: string }[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return _(devices)
      .filter(d => d.kind === DeviceKind.OUTPUT && d.deviceId !== COMMUNICATIONS_DEVICE_ID && d.deviceId !== DEFAULT_DEVICE_ID)
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
      .filter(d => d.kind === DeviceKind.INPUT && d.deviceId !== COMMUNICATIONS_DEVICE_ID && d.deviceId !== DEFAULT_DEVICE_ID && !isVirtualDeviceInput(d.label))
      .map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${d.deviceId.substring(0, 8)}`
      }))
      .value();
  }

  return { enumerateOutputDevices, enumerateInputDevices };
}
