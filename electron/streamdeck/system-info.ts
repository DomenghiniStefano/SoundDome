// System info gathering for Stream Deck stat display
const os = require('os');
const { execFile } = require('child_process');

export interface SystemStats {
  cpuPercent: number;
  ramPercent: number;
  ramUsedGb: number;
  ramTotalGb: number;
  gpuPercent: number;
  gpuTempC: number;
  cpuTempC: number;
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

// Cached GPU/temp data (updated via async PowerShell calls)
let cachedGpuPercent = 0;
let cachedGpuTemp = 0;
let cachedCpuTemp = 0;
let gpuQueryPending = false;

function updateGpuStats() {
  if (gpuQueryPending) return;
  gpuQueryPending = true;

  // PowerShell one-liner to get GPU utilization and temp via WMI
  // Works with NVIDIA and AMD GPUs that expose Win32_VideoController
  const script = `
$gpu = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'engtype_3D' } | Measure-Object -Property UtilizationPercentage -Maximum
$temp = (Get-CimInstance MSAcpi_ThermalZoneTemperature -Namespace root/wmi -ErrorAction SilentlyContinue | Select-Object -First 1).CurrentTemperature
$cpuTemp = if ($temp) { [math]::Round(($temp - 2732) / 10, 0) } else { 0 }
# Try nvidia-smi for GPU info
try {
  $nv = & 'nvidia-smi' --query-gpu=utilization.gpu,temperature.gpu --format=csv,noheader,nounits 2>$null
  if ($nv) {
    $parts = $nv.Split(',')
    Write-Output "$($parts[0].Trim())|$($parts[1].Trim())|$cpuTemp"
  } else {
    $gpuUtil = if ($gpu.Maximum) { $gpu.Maximum } else { 0 }
    Write-Output "$gpuUtil|0|$cpuTemp"
  }
} catch {
  $gpuUtil = if ($gpu.Maximum) { $gpu.Maximum } else { 0 }
  Write-Output "$gpuUtil|0|$cpuTemp"
}`.trim();

  execFile('powershell.exe', ['-NoProfile', '-NoLogo', '-Command', script], {
    windowsHide: true,
    timeout: 5000,
  }, (err: Error | null, stdout: string) => {
    gpuQueryPending = false;
    if (err) {
      console.error('[SystemInfo] GPU query error:', err.message);
      return;
    }
    const line = stdout.trim();
    const parts = line.split('|');
    if (parts.length >= 3) {
      cachedGpuPercent = parseInt(parts[0]) || 0;
      cachedGpuTemp = parseInt(parts[1]) || 0;
      cachedCpuTemp = parseInt(parts[2]) || 0;
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
  };
}

let gpuPollTimer: ReturnType<typeof setInterval> | null = null;

export function startGpuPolling() {
  // Initial query
  updateGpuStats();
  // Poll every 3 seconds
  gpuPollTimer = setInterval(updateGpuStats, 3000);
}

export function stopGpuPolling() {
  if (gpuPollTimer) {
    clearInterval(gpuPollTimer);
    gpuPollTimer = null;
  }
}
