// System info gathering for Stream Deck stat display
const os = require('os');
const { execFile } = require('child_process');
import { log } from '../logger';

const GPU_QUERY_TIMEOUT_MS = 8000;
const GPU_POLL_INTERVAL_MS = 3000;

export interface SystemStats {
  cpuPercent: number;
  ramPercent: number;
  ramUsedGb: number;
  ramTotalGb: number;
  gpuPercent: number;
  gpuTempC: number;
  cpuTempC: number;
  gpuVramPercent: number;
  gpuVramUsedGb: number;
  gpuVramTotalGb: number;
  diskPercent: number;
  diskUsedGb: number;
  diskTotalGb: number;
  netUpMbps: number;
  netDownMbps: number;
  uptimeHours: number;
}

// CPU usage tracking
let prevCpuTimes: { idle: number; total: number } | null = null;

function getCpuTimes(): { idle: number; total: number } {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }
  return { idle, total };
}

function getCpuPercent(): number {
  const current = getCpuTimes();
  if (!prevCpuTimes) {
    prevCpuTimes = current;
    return 0;
  }
  const idleDelta = current.idle - prevCpuTimes.idle;
  const totalDelta = current.total - prevCpuTimes.total;
  prevCpuTimes = current;
  if (totalDelta === 0) return 0;
  return Math.round((1 - idleDelta / totalDelta) * 100);
}

function getRamInfo(): { percent: number; usedGb: number; totalGb: number } {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    percent: Math.round((used / total) * 100),
    usedGb: Math.round((used / (1024 ** 3)) * 10) / 10,
    totalGb: Math.round((total / (1024 ** 3)) * 10) / 10,
  };
}

// Cached async data (updated via PowerShell calls)
let cachedGpuPercent = 0;
let cachedGpuTemp = 0;
let cachedCpuTemp = 0;
let cachedGpuVramUsedGb = 0;
let cachedGpuVramTotalGb = 0;
let cachedGpuVramPercent = 0;
let cachedDiskPercent = 0;
let cachedDiskUsedGb = 0;
let cachedDiskTotalGb = 0;
let cachedNetUpMbps = 0;
let cachedNetDownMbps = 0;
let gpuQueryPending = false;

// Network tracking
let prevNetBytes: { sent: number; recv: number; time: number } | null = null;

function updateGpuStats() {
  if (gpuQueryPending) return;
  gpuQueryPending = true;

  const script = `
$gpu = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'engtype_3D' } | Measure-Object -Property UtilizationPercentage -Maximum
$temp = (Get-CimInstance MSAcpi_ThermalZoneTemperature -Namespace root/wmi -ErrorAction SilentlyContinue | Select-Object -First 1).CurrentTemperature
$cpuTemp = if ($temp) { [math]::Round(($temp - 2732) / 10, 0) } else { 0 }
# Disk (system drive)
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction SilentlyContinue
$diskTotal = if ($disk) { [math]::Round($disk.Size / 1GB, 1) } else { 0 }
$diskFree = if ($disk) { [math]::Round($disk.FreeSpace / 1GB, 1) } else { 0 }
$diskUsed = $diskTotal - $diskFree
$diskPct = if ($diskTotal -gt 0) { [math]::Round($diskUsed / $diskTotal * 100) } else { 0 }
# Network
$net = Get-CimInstance Win32_PerfRawData_Tcpip_NetworkInterface -ErrorAction SilentlyContinue | Measure-Object -Property BytesSentPersec,BytesReceivedPersec -Sum
$netSent = ($net | Where-Object { $_.Property -eq 'BytesSentPersec' }).Sum
$netRecv = ($net | Where-Object { $_.Property -eq 'BytesReceivedPersec' }).Sum
if (-not $netSent) { $netSent = 0 }
if (-not $netRecv) { $netRecv = 0 }
# Try nvidia-smi for GPU info + VRAM
try {
  $nv = & 'nvidia-smi' --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>$null
  if ($nv) {
    $parts = $nv.Split(',')
    Write-Output "$($parts[0].Trim())|$($parts[1].Trim())|$cpuTemp|$($parts[2].Trim())|$($parts[3].Trim())|$diskPct|$diskUsed|$diskTotal|$netSent|$netRecv"
  } else {
    $gpuUtil = if ($gpu.Maximum) { $gpu.Maximum } else { 0 }
    Write-Output "$gpuUtil|0|$cpuTemp|0|0|$diskPct|$diskUsed|$diskTotal|$netSent|$netRecv"
  }
} catch {
  $gpuUtil = if ($gpu.Maximum) { $gpu.Maximum } else { 0 }
  Write-Output "$gpuUtil|0|$cpuTemp|0|0|$diskPct|$diskUsed|$diskTotal|$netSent|$netRecv"
}`.trim();

  execFile('powershell.exe', ['-NoProfile', '-NoLogo', '-Command', script], {
    windowsHide: true,
    timeout: GPU_QUERY_TIMEOUT_MS,
  }, (err: Error | null, stdout: string) => {
    gpuQueryPending = false;
    if (err) {
      log.error('[SystemInfo] GPU query error:', err.message);
      return;
    }
    const line = stdout.trim();
    const parts = line.split('|');
    if (parts.length >= 10) {
      cachedGpuPercent = parseInt(parts[0]) || 0;
      cachedGpuTemp = parseInt(parts[1]) || 0;
      cachedCpuTemp = parseInt(parts[2]) || 0;
      const vramUsedMb = parseInt(parts[3]) || 0;
      const vramTotalMb = parseInt(parts[4]) || 0;
      cachedGpuVramUsedGb = Math.round(vramUsedMb / 1024 * 10) / 10;
      cachedGpuVramTotalGb = Math.round(vramTotalMb / 1024 * 10) / 10;
      cachedGpuVramPercent = vramTotalMb > 0 ? Math.round(vramUsedMb / vramTotalMb * 100) : 0;
      cachedDiskPercent = parseInt(parts[5]) || 0;
      cachedDiskUsedGb = parseFloat(parts[6]) || 0;
      cachedDiskTotalGb = parseFloat(parts[7]) || 0;

      // Network rate calculation
      const netSent = parseInt(parts[8]) || 0;
      const netRecv = parseInt(parts[9]) || 0;
      const now = Date.now();
      if (prevNetBytes) {
        const dt = (now - prevNetBytes.time) / 1000;
        if (dt > 0) {
          cachedNetUpMbps = Math.round((netSent - prevNetBytes.sent) / dt / 1024 / 1024 * 10) / 10;
          cachedNetDownMbps = Math.round((netRecv - prevNetBytes.recv) / dt / 1024 / 1024 * 10) / 10;
          if (cachedNetUpMbps < 0) cachedNetUpMbps = 0;
          if (cachedNetDownMbps < 0) cachedNetDownMbps = 0;
        }
      }
      prevNetBytes = { sent: netSent, recv: netRecv, time: now };
    }
  });
}

export function getSystemStats(): SystemStats {
  const ram = getRamInfo();
  return {
    cpuPercent: getCpuPercent(),
    ramPercent: ram.percent,
    ramUsedGb: ram.usedGb,
    ramTotalGb: ram.totalGb,
    gpuPercent: cachedGpuPercent,
    gpuTempC: cachedGpuTemp,
    cpuTempC: cachedCpuTemp,
    gpuVramPercent: cachedGpuVramPercent,
    gpuVramUsedGb: cachedGpuVramUsedGb,
    gpuVramTotalGb: cachedGpuVramTotalGb,
    diskPercent: cachedDiskPercent,
    diskUsedGb: cachedDiskUsedGb,
    diskTotalGb: cachedDiskTotalGb,
    netUpMbps: cachedNetUpMbps,
    netDownMbps: cachedNetDownMbps,
    uptimeHours: Math.round(os.uptime() / 3600 * 10) / 10,
  };
}

let gpuPollTimer: ReturnType<typeof setInterval> | null = null;

export function startGpuPolling() {
  // Initial query
  updateGpuStats();
  // Poll at regular interval
  gpuPollTimer = setInterval(updateGpuStats, GPU_POLL_INTERVAL_MS);
}

export function stopGpuPolling() {
  if (gpuPollTimer) {
    clearInterval(gpuPollTimer);
    gpuPollTimer = null;
  }
}
