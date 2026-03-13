import { svgWrap, svgToDeviceJpeg, getSharp, escapeXml, generateTextImage, SIZE } from './images';
import { JPEG_QUALITY, LCD_STRIP_WIDTH, LCD_STRIP_HEIGHT } from './constants';
import type { SystemStats } from './system-info';

// SVG icon paths for LCD strip info display (24x24 viewBox)
const INFO_ICON_SPEAKER = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
const INFO_ICON_MIC = '<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>';
const INFO_ICON_HEADPHONES = '<path d="M12 1C7.03 1 3 5.03 3 10v6c0 1.66 1.34 3 3 3h1v-7H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-2v7h1c1.66 0 3-1.34 3-3v-6c0-4.97-4.03-9-9-9zM7 14v4H6c-.55 0-1-.45-1-1v-3h2zm12 3c0 .55-.45 1-1 1h-1v-4h2v3z"/>';

export interface InfoDisplayData {
  speakerVolume: number;
  micVolume: number;
  speakerEnabled: boolean;
  micEnabled: boolean;
}

export async function generateInfoDisplay(data: InfoDisplayData): Promise<Buffer> {
  const sharp = getSharp();
  const w = LCD_STRIP_WIDTH;
  const h = LCD_STRIP_HEIGHT;

  const sectionH = Math.floor(h / 3);
  const sections = [
    { icon: INFO_ICON_SPEAKER, label: 'Speaker', value: data.speakerVolume, enabled: data.speakerEnabled, color: '#1db954' },
    { icon: INFO_ICON_HEADPHONES, label: 'Output', value: data.micVolume, enabled: data.micEnabled, color: '#3498db' },
    { icon: INFO_ICON_MIC, label: 'Mic', value: data.micVolume, enabled: data.micEnabled, color: '#e74c3c' },
  ];

  const sectionsSvg = sections.map((s, i) => {
    const y = i * sectionH;
    const iconScale = 3;
    const iconSize = 24 * iconScale;
    const iconX = 40;
    const iconY = y + (sectionH - iconSize) / 2;
    const fillColor = s.enabled ? s.color : '#555';

    const barX = iconX + iconSize + 30;
    const barY = y + sectionH / 2 - 12;
    const barW = w - barX - 60;
    const barH = 24;
    const fillW = Math.round((barW * s.value) / 100);
    const barRadius = 12;

    const valText = s.enabled ? `${s.value}%` : 'OFF';

    return `
      <g transform="translate(${iconX}, ${iconY}) scale(${iconScale})" fill="${fillColor}">
        ${s.icon}
      </g>
      <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${barRadius}" fill="#2a2a3e" />
      ${s.enabled ? `<rect x="${barX}" y="${barY}" width="${fillW}" height="${barH}" rx="${barRadius}" fill="${s.color}" />` : ''}
      <text x="${barX + barW + 20}" y="${barY + 18}" font-family="sans-serif" font-size="20" fill="${fillColor}" text-anchor="start">${valText}</text>
      <text x="${barX}" y="${barY - 8}" font-family="sans-serif" font-size="16" fill="#888">${s.label}</text>
    `;
  }).join('');

  const separators = [1, 2].map(i =>
    `<line x1="30" y1="${i * sectionH}" x2="${w - 30}" y2="${i * sectionH}" stroke="#333" stroke-width="1" />`
  ).join('');

  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" overflow="hidden">
    <rect width="${w}" height="${h}" fill="#111122" />
    ${separators}
    ${sectionsSvg}
  </svg>`;

  return sharp(Buffer.from(svg))
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

// --- System stat gauge images ---

interface GaugeConfig {
  label: string;
  value: number;
  subText: string;
  color: string;
}

function buildGaugeSvg(config: GaugeConfig): string {
  const cx = SIZE / 2;
  const cy = SIZE / 2 - 4;
  const r = 27;
  const strokeWidth = 5;

  // Arc from -135deg to +135deg (270deg sweep)
  const startAngle = -225 * (Math.PI / 180);
  const endAngle = 45 * (Math.PI / 180);
  const totalAngle = endAngle - startAngle;
  const valueAngle = startAngle + totalAngle * (config.value / 100);

  const bgX1 = cx + r * Math.cos(startAngle);
  const bgY1 = cy + r * Math.sin(startAngle);
  const bgX2 = cx + r * Math.cos(endAngle);
  const bgY2 = cy + r * Math.sin(endAngle);

  const valX2 = cx + r * Math.cos(valueAngle);
  const valY2 = cy + r * Math.sin(valueAngle);
  const largeArcBg = totalAngle > Math.PI ? 1 : 0;
  const largeArcVal = (valueAngle - startAngle) > Math.PI ? 1 : 0;

  const bgArc = `M ${bgX1} ${bgY1} A ${r} ${r} 0 ${largeArcBg} 1 ${bgX2} ${bgY2}`;
  const valArc = config.value > 0
    ? `M ${bgX1} ${bgY1} A ${r} ${r} 0 ${largeArcVal} 1 ${valX2} ${valY2}`
    : '';

  let gaugeColor = config.color;
  if (config.value > 90) gaugeColor = '#e74c3c';
  else if (config.value > 75) gaugeColor = '#f39c12';

  const content = `
    <path d="${bgArc}" fill="none" stroke="#2a2a3e" stroke-width="${strokeWidth}" stroke-linecap="round" />
    ${valArc ? `<path d="${valArc}" fill="none" stroke="${gaugeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />` : ''}
    <text x="${cx}" y="${cy + 4}" font-family="sans-serif" font-size="14" font-weight="bold" fill="#fff" text-anchor="middle">${config.value}%</text>
    <text x="${cx}" y="${SIZE - 10}" font-family="sans-serif" font-size="8" fill="#888" text-anchor="middle">${escapeXml(config.subText)}</text>
    <text x="${cx}" y="${SIZE - 2}" font-family="sans-serif" font-size="7" fill="#555" text-anchor="middle">${escapeXml(config.label)}</text>
  `;

  return svgWrap('#0d0d1a', content);
}

export async function generateStatImage(statType: string, stats: SystemStats): Promise<Buffer> {
  const sharp = getSharp();

  let config: GaugeConfig;

  switch (statType) {
    case 'cpu':
      config = { label: 'CPU', value: stats.cpuPercent, subText: `${stats.cpuPercent}%`, color: '#3498db' };
      break;
    case 'ram':
      config = { label: 'RAM', value: stats.ramPercent, subText: `${stats.ramUsedGb}/${stats.ramTotalGb}G`, color: '#2ecc71' };
      break;
    case 'gpu':
      config = { label: 'GPU', value: stats.gpuPercent, subText: `${stats.gpuPercent}%`, color: '#9b59b6' };
      break;
    case 'cpuTemp':
      config = { label: 'CPU TEMP', value: Math.min(100, stats.cpuTempC), subText: `${stats.cpuTempC}°C`, color: '#e67e22' };
      break;
    case 'gpuTemp':
      config = { label: 'GPU TEMP', value: Math.min(100, stats.gpuTempC), subText: `${stats.gpuTempC}°C`, color: '#e74c3c' };
      break;
    case 'gpuVram':
      config = { label: 'VRAM', value: stats.gpuVramPercent, subText: `${stats.gpuVramUsedGb}/${stats.gpuVramTotalGb}G`, color: '#8e44ad' };
      break;
    case 'disk':
      config = { label: 'DISK', value: stats.diskPercent, subText: `${stats.diskUsedGb}/${stats.diskTotalGb}G`, color: '#e67e22' };
      break;
    case 'netUp': {
      const upVal = Math.min(100, stats.netUpMbps * 10);
      const upText = stats.netUpMbps >= 1 ? `${stats.netUpMbps} MB/s` : `${Math.round(stats.netUpMbps * 1024)} KB/s`;
      config = { label: 'NET UP', value: upVal, subText: upText, color: '#1abc9c' };
      break;
    }
    case 'netDown': {
      const downVal = Math.min(100, stats.netDownMbps * 10);
      const downText = stats.netDownMbps >= 1 ? `${stats.netDownMbps} MB/s` : `${Math.round(stats.netDownMbps * 1024)} KB/s`;
      config = { label: 'NET DN', value: downVal, subText: downText, color: '#3498db' };
      break;
    }
    case 'uptime': {
      const hrs = stats.uptimeHours;
      const uptimeText = hrs >= 24 ? `${Math.floor(hrs / 24)}d ${Math.round(hrs % 24)}h` : `${Math.round(hrs)}h`;
      config = { label: 'UPTIME', value: Math.min(100, hrs / 24 * 100), subText: uptimeText, color: '#95a5a6' };
      break;
    }
    default:
      return generateTextImage('???');
  }

  const svg = buildGaugeSvg(config);
  return svgToDeviceJpeg(sharp, svg);
}
