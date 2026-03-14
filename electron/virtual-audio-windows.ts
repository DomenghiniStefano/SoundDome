import { execSync } from 'child_process';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { log } from './logger';

const TAG = '[virtual-audio-windows]';

// MMDevice property keys (PKEY_Device_DeviceDesc and device format)
const DEVICE_DESC_KEY = '{a45c254e-df1c-4efd-8020-67d146a850e0},2';
const DEVICE_FORMAT_KEY = '{f19f064d-082c-4e27-bc73-6882a1bb8e4c},0';

// MMDevices registry paths (PowerShell registry provider format)
const MMDEVICES_BASE = 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio';
const RENDER_PATH = `${MMDEVICES_BASE}\\Render`;

// PROPVARIANT header is 8 bytes before the WAVEFORMATEX data
const PROPVARIANT_HEADER_SIZE = 8;

// Detected at startup, returned via IPC to renderer
let detectedSampleRate = 0;

/**
 * Auto-configure communications ducking and detect VB-CABLE sample rate on Windows.
 * Called once at startup — idempotent, never throws.
 */
export function configureWindowsAudio(): void {
  if (process.platform !== 'win32') return;

  try {
    disableCommunicationsDucking();
  } catch (err) {
    log.warn(TAG, 'Failed to disable communications ducking:', err);
  }

  try {
    detectedSampleRate = detectVBCableSampleRate();
  } catch (err) {
    log.warn(TAG, 'Failed to detect VB-CABLE sample rate:', err);
  }
}

/**
 * Returns the detected VB-CABLE sample rate (e.g. 44100, 48000),
 * or 0 if VB-CABLE was not found.
 */
export function getVBCableSampleRate(): number {
  return detectedSampleRate;
}

/**
 * Disable the "reduce other apps volume by 80% during calls" Windows setting.
 * Writes to HKCU — no elevation needed.
 */
function disableCommunicationsDucking(): void {
  const keyPath = 'HKCU\\SOFTWARE\\Microsoft\\Multimedia\\Audio';
  const valueName = 'UserDuckingPreference';

  // Check current value first
  try {
    const output = execSync(
      `reg query "${keyPath}" /v ${valueName}`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    if (output.includes('0x3')) {
      log.info(TAG, 'Communications ducking already disabled');
      return;
    }
  } catch {
    // Key doesn't exist yet — proceed to create
  }

  execSync(
    `reg add "${keyPath}" /v ${valueName} /t REG_DWORD /d 3 /f`,
    { stdio: 'ignore' },
  );
  log.info(TAG, 'Disabled communications ducking');
}

/**
 * Detect VB-CABLE's sample rate by reading "CABLE Input" (Render) device format
 * from the registry. Read-only — no admin needed, no modifications.
 * Returns the sample rate (e.g. 44100) or 0 if not found.
 */
function detectVBCableSampleRate(): number {
  const scriptPath = path.join(app.getPath('temp'), 'sounddome-discover.ps1');
  const script = `
$descKey = '${DEVICE_DESC_KEY}'
$formatKey = '${DEVICE_FORMAT_KEY}'

Get-ChildItem '${RENDER_PATH}' -ErrorAction SilentlyContinue | ForEach-Object {
    $props = Get-Item "$($_.PSPath)\\Properties" -ErrorAction SilentlyContinue
    if (-not $props) { return }
    $desc = $props.GetValue($descKey)
    if ($desc -eq 'CABLE Input') {
        $format = $props.GetValue($formatKey)
        if ($format) {
            $hex = ($format | ForEach-Object { $_.ToString('x2') }) -join ''
            Write-Output $hex
        }
    }
}`.trim();

  try {
    fs.writeFileSync(scriptPath, script, 'utf-8');
    const output = execSync(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000 },
    );

    const formatHex = output.trim();
    if (!formatHex) {
      log.info(TAG, 'VB-CABLE not found');
      return 0;
    }

    const rate = getSampleRate(formatHex);
    log.info(TAG, `VB-CABLE detected at ${rate} Hz`);
    return rate;
  } catch (err) {
    log.warn(TAG, 'Failed to detect VB-CABLE sample rate:', err);
    return 0;
  } finally {
    try { fs.unlinkSync(scriptPath); } catch { /* ignore */ }
  }
}

/**
 * Extract sample rate from the format blob hex string.
 * The blob has an 8-byte PROPVARIANT header, then WAVEFORMATEX:
 *   wFormatTag(2) nChannels(2) nSamplesPerSec(4) ...
 * Sample rate is at byte offset 8+4 = 12 from blob start, little-endian uint32.
 */
function getSampleRate(formatHex: string): number {
  const offset = (PROPVARIANT_HEADER_SIZE + 4) * 2; // byte 12 in hex chars
  if (formatHex.length < offset + 8) return 0;

  const bytes = formatHex.substring(offset, offset + 8).match(/.{2}/g)!;
  return (
    parseInt(bytes[0], 16) |
    (parseInt(bytes[1], 16) << 8) |
    (parseInt(bytes[2], 16) << 16) |
    (parseInt(bytes[3], 16) << 24)
  ) >>> 0;
}
