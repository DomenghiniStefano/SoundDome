import { svgWrap, svgToDeviceJpeg, getSharp, iconContentBlock, generateTextImage } from './images';

// Media icon SVG paths
const MEDIA_ICONS: Record<string, { path: string; color: string; label: string }> = {
  playPause: {
    path: '<path d="M8 5v14l11-7z"/><rect x="3" y="5" width="3" height="14" rx="1"/>',
    color: '#1db954', label: 'Play/Pause',
  },
  nextTrack: {
    path: '<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>',
    color: '#3498db', label: 'Next',
  },
  prevTrack: {
    path: '<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>',
    color: '#3498db', label: 'Previous',
  },
  volumeUp: {
    path: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>',
    color: '#f39c12', label: 'Vol +',
  },
  volumeDown: {
    path: '<path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>',
    color: '#f39c12', label: 'Vol -',
  },
  volumeMute: {
    path: '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>',
    color: '#e74c3c', label: 'Mute',
  },
  stopAll: {
    path: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
    color: '#e74c3c', label: 'Stop All',
  },
};

export async function generateMediaImage(mediaAction: string): Promise<Buffer> {
  const sharp = getSharp();

  const info = MEDIA_ICONS[mediaAction];
  if (!info) return generateTextImage(mediaAction);

  const svg = svgWrap('#0d0d1a', iconContentBlock(info.path, info.color, info.label));
  return svgToDeviceJpeg(sharp, svg);
}

export async function generatePageNavImage(direction: 'next' | 'prev'): Promise<Buffer> {
  const sharp = getSharp();

  const isNext = direction === 'next';
  const arrowPath = isNext
    ? '<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>'
    : '<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>';
  const label = isNext ? 'Next' : 'Prev';

  const svg = svgWrap('#0d0d1a', iconContentBlock(arrowPath, '#3498db', label));
  return svgToDeviceJpeg(sharp, svg);
}

export async function generateFolderImage(pageName: string): Promise<Buffer> {
  const sharp = getSharp();

  const folderPath = '<path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>';
  const truncName = pageName.length > 10 ? pageName.substring(0, 10) : pageName;

  const svg = svgWrap('#0d0d1a', iconContentBlock(folderPath, '#f39c12', truncName));
  return svgToDeviceJpeg(sharp, svg);
}

export async function generateShortcutImage(shortcut: string, label?: string): Promise<Buffer> {
  const displayText = label || shortcut;
  return generateTextImage(displayText, '#1a1a2e', '#e0e0e0');
}

export async function generateLaunchAppImage(appName: string, label?: string): Promise<Buffer> {
  const displayText = label || appName;
  return generateTextImage(displayText, '#1a2e1a', '#e0e0e0');
}
