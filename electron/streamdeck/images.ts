import { KEY_IMAGE_SIZE, JPEG_QUALITY, LCD_STRIP_WIDTH, LCD_STRIP_HEIGHT } from './constants';
import type { SystemStats } from './system-info';

const IMAGE_PREFIX_ICON = 'icon:';
const IMAGE_PREFIX_EMOJI = 'emoji:';

// SVGs created at KEY_IMAGE_SIZE (85px), rendered directly to JPEG — no upscaling.
const SIZE = KEY_IMAGE_SIZE;

let sharpModule: typeof import('sharp') | null = null;

function getSharp(): typeof import('sharp') {
  if (!sharpModule) {
    sharpModule = require('sharp');
  }
  return sharpModule!;
}

// Render SVG to JPEG — pre-rotate 270° to counter device's 90° CW rotation.
async function svgToDeviceJpeg(sharp: typeof import('sharp'), svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg))
    .rotate(270)
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

// For non-SVG inputs (custom images from files)
async function imageToDeviceJpeg(sharp: typeof import('sharp'), input: string | Buffer): Promise<Buffer> {
  return sharp(input)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .rotate(270)
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

// Cached blank image — never changes, generate once
let cachedBlankImage: Buffer | null = null;

function svgWrap(bgColor: string, content: string): string {
  return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg" overflow="hidden">
    <rect width="${SIZE}" height="${SIZE}" fill="${bgColor}" />
    ${content}
  </svg>`;
}

export async function generateTextImage(text: string, bgColor = '#1a1a2e', textColor = '#ffffff'): Promise<Buffer> {
  const sharp = getSharp();

  const maxCharsPerLine = 8;
  const lines: string[] = [];
  const words = text.split(/\s+/);
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word.length > maxCharsPerLine ? word.substring(0, maxCharsPerLine) : word;
    }
  }
  if (currentLine) lines.push(currentLine);

  const displayLines = lines.slice(0, 4);
  const fontSize = 11;
  const lineHeight = 15;
  const totalTextHeight = displayLines.length * lineHeight;
  const startY = (SIZE - totalTextHeight) / 2 + fontSize * 0.7;

  const textElements = displayLines.map((line, i) =>
    `<text x="${SIZE / 2}" y="${startY + i * lineHeight}" font-family="sans-serif" font-size="${fontSize}" fill="${textColor}" text-anchor="middle">${escapeXml(line)}</text>`
  ).join('');

  const svg = svgWrap(bgColor, textElements);
  return svgToDeviceJpeg(sharp, svg);
}

export async function generateEmojiImage(emoji: string, name: string): Promise<Buffer> {
  const sharp = getSharp();

  const truncName = name.length > 10 ? name.substring(0, 10) : name;
  const content = `
    <text x="${SIZE / 2}" y="${SIZE / 2 - 2}" font-size="34" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${emoji}</text>
    <text x="${SIZE / 2}" y="${SIZE - 6}" font-family="sans-serif" font-size="9" fill="#aaa" text-anchor="middle">${escapeXml(truncName)}</text>
  `;

  const svg = svgWrap('#1a1a2e', content);
  return svgToDeviceJpeg(sharp, svg);
}

// SVG path data for icons (viewBox 0 0 24 24)
const ICON_PATHS: Record<string, string> = {
  music: '<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm-2 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>',
  headphones: '<path d="M12 1C7.03 1 3 5.03 3 10v6c0 1.66 1.34 3 3 3h1v-7H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-2v7h1c1.66 0 3-1.34 3-3v-6c0-4.97-4.03-9-9-9zM7 14v4H6c-.55 0-1-.45-1-1v-3h2zm12 3c0 .55-.45 1-1 1h-1v-4h2v3z"/>',
  microphone: '<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>',
  megaphone: '<path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1l5 3V6L5 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/>',
  bell: '<path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>',
  star: '<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>',
  flash: '<path d="M7 2v11h3v9l7-12h-4l4-8z"/>',
  fire: '<path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>',
  heart: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>',
  skull: '<circle cx="9" cy="10" r="2"/><circle cx="15" cy="10" r="2"/><path d="M12 2C6.48 2 2 6.48 2 12c0 3.04 1.36 5.76 3.5 7.6V22h3v-2h3v2h3v-2h3v-2.4C20.64 17.76 22 15.04 22 12c0-5.52-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>',
  emoji: '<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>',
  gaming: '<path d="M21.58 16.09l-1.09-7.66C20.21 6.46 18.52 5 16.53 5H7.47C5.48 5 3.79 6.46 3.51 8.43l-1.09 7.66C2.2 17.63 3.39 19 4.94 19c.68 0 1.32-.27 1.8-.75L9 16h6l2.25 2.25c.48.48 1.13.75 1.8.75 1.56 0 2.75-1.37 2.53-2.91zM11 11H9v2H8v-2H6v-1h2V8h1v2h2v1zm4 2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>',
  warning: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
  cloud: '<path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>',
  pets: '<circle cx="4.5" cy="9.5" r="2.5"/><circle cx="9" cy="5.5" r="2.5"/><circle cx="15" cy="5.5" r="2.5"/><circle cx="19.5" cy="9.5" r="2.5"/><path d="M17.34 14.86c-.87-1.02-1.6-1.89-2.48-2.91-.46-.54-1.17-.86-1.95-.86h-1.82c-.78 0-1.49.32-1.95.86-.88 1.02-1.61 1.89-2.48 2.91-.52.62-.69 1.54-.49 2.34.21.81.78 1.44 1.59 1.73C8.56 19.32 9.43 19.5 10 19.5h4c.57 0 1.44-.18 2.24-.57.81-.29 1.38-.92 1.59-1.73.2-.8.03-1.72-.49-2.34z"/>',
  'volume-high': '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>',
  poop: '<path d="M11.36 2c-.21 0-.54.12-.71.35C9.73 3.64 8.5 6.09 9.5 7.5c.16.23.48.5 1 .5-.52.52-1 1.27-1 2 0 .87.52 1.57 1.08 2H9.5C7.57 12 6 13.57 6 15.5c0 1.58 1.06 2.9 2.5 3.32V19c0 .55.45 1 1 1h5c.55 0 1-.45 1-1v-.18c1.44-.42 2.5-1.74 2.5-3.32 0-1.93-1.57-3.5-3.5-3.5h-1.08c.56-.43 1.08-1.13 1.08-2 0-.73-.48-1.48-1-2 .52 0 .84-.27 1-.5 1-1.41-.23-3.86-1.14-5.15-.17-.23-.5-.35-.71-.35h-.29z"/>',
  bomb: '<path d="M18.5 2.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S17 4.83 17 4s.67-1.5 1.5-1.5zm-2.24 2.74L14.5 7H11c-3.87 0-7 3.13-7 7s3.13 7 7 7 7-3.13 7-7V9.5l1.76-1.76c.33.08.59.26.74.51l1.24-1.24c-.55-.55-1.35-.76-2.12-.51L18 5l-1.74.24z"/>',
  crown: '<path d="M12 6L9 13 2 9l2 10h16l2-10-7 4-3-7z"/>',
  devil: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM2.5 5.5L7 8l-1.5 2L2.5 5.5zm19 0L18.5 10 17 8l4.5-2.5zM15.5 8c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-7 0c.83 0 1.5.67 1.5 1.5S9.33 11 8.5 11 7 10.33 7 9.5 7.67 8 8.5 8zm3.5 10c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z"/>',
  alien: '<path d="M12 2C7.58 2 4 6.58 4 12c0 3.87 3.13 7 7 7h2c3.87 0 7-3.13 7-7 0-5.42-3.58-10-8-10zM8.5 14c-1.1 0-2-.9-2-2 0-.74.4-1.38 1-1.72V9c0-.55.45-1 1-1s1 .45 1 1v1.28c.6.34 1 .98 1 1.72 0 1.1-.9 2-2 2zm7 0c-1.1 0-2-.9-2-2 0-.74.4-1.38 1-1.72V9c0-.55.45-1 1-1s1 .45 1 1v1.28c.6.34 1 .98 1 1.72 0 1.1-.9 2-2 2z"/>',
  ghost: '<path d="M12 2c-4.42 0-8 3.58-8 8v10l3-3 2 2 3-3 3 3 2-2 3 3V10c0-4.42-3.58-8-8-8zm-2 9c-.83 0-1.5-.67-1.5-1.5S9.17 8 10 8s1.5.67 1.5 1.5S10.83 11 10 11zm4 0c-.83 0-1.5-.67-1.5-1.5S13.17 8 14 8s1.5.67 1.5 1.5S14.83 11 14 11z"/>',
  rocket: '<path d="M9.51 18.5c-.63.33-1.19.57-1.66.73L9 22l3-3 3 3 1.15-2.77c-.47-.16-1.03-.4-1.66-.73L12 20l-2.49-1.5zM12 2C8.43 5.55 5 9.73 5 14c0 2.29.89 3.81 2 4.88L9 17l3 3 3-3 2 1.88c1.11-1.07 2-2.59 2-4.88 0-4.27-3.43-8.45-7-12zm0 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>',
  toilet: '<path d="M6 2v6h.5C7.33 8 8 8.67 8 9.5V10H5c-1.1 0-2 .9-2 2v2c0 2.76 2.24 5 5 5v3h8v-3c2.76 0 5-2.24 5-5v-2c0-1.1-.9-2-2-2h-3v-.5c0-.83.67-1.5 1.5-1.5H18V2H6z"/>',
  clown: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-3.5 7c.83 0 1.5.67 1.5 1.5S9.33 12 8.5 12 7 11.33 7 10.5 7.67 9 8.5 9zm7 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM12 18c-3.13 0-5.63-1.43-5.95-3h11.9c-.32 1.57-2.82 3-5.95 3z"/><circle cx="12" cy="14" r="1.5"/>',
  thumbsup: '<path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 2 7.59 8.59C7.22 8.95 7 9.45 7 10v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>',
  thumbsdown: '<path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 22l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>',
  target: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>',
  folder: '<path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>',
};

// Per-icon colors for Stream Deck display
const ICON_COLORS: Record<string, string> = {
  music: '#1db954',
  headphones: '#1db954',
  microphone: '#e74c3c',
  megaphone: '#3498db',
  bell: '#f39c12',
  star: '#f1c40f',
  flash: '#f1c40f',
  fire: '#e74c3c',
  heart: '#e74c3c',
  skull: '#ecf0f1',
  emoji: '#f1c40f',
  gaming: '#9b59b6',
  warning: '#f39c12',
  cloud: '#3498db',
  pets: '#e67e22',
  'volume-high': '#1db954',
  poop: '#8B6914',
  bomb: '#e74c3c',
  crown: '#f1c40f',
  devil: '#e74c3c',
  alien: '#2ecc71',
  ghost: '#bdc3c7',
  rocket: '#e67e22',
  toilet: '#ecf0f1',
  clown: '#e74c3c',
  thumbsup: '#1db954',
  thumbsdown: '#e74c3c',
  target: '#e74c3c',
  folder: '#f39c12',
};

// Helper to build an icon+label SVG content block (shared by icon, media, nav, folder generators)
function iconContentBlock(pathData: string, color: string, label: string): string {
  const iconSize = 36;
  const iconScale = iconSize / 24;
  const iconX = (SIZE - iconSize) / 2;
  const iconY = (SIZE / 2 - iconSize) / 2 + 4;

  return `
    <g transform="translate(${iconX}, ${iconY}) scale(${iconScale})" fill="${color}">
      ${pathData}
    </g>
    <text x="${SIZE / 2}" y="${SIZE - 6}" font-family="sans-serif" font-size="9" fill="#888" text-anchor="middle">${escapeXml(label)}</text>
  `;
}

export async function generateIconImage(iconName: string, name: string): Promise<Buffer> {
  const pathData = ICON_PATHS[iconName];
  if (!pathData) {
    return generateTextImage(name, '#1a1a2e', '#ffffff');
  }

  const sharp = getSharp();
  const color = ICON_COLORS[iconName] || '#ffffff';
  const truncName = name.length > 10 ? name.substring(0, 10) : name;
  const svg = svgWrap('#1a1a2e', iconContentBlock(pathData, color, truncName));

  try {
    return await svgToDeviceJpeg(sharp, svg);
  } catch (err) {
    console.error('[StreamDeck] Icon SVG render FAILED:', err);
    return generateTextImage(name, '#1a1a2e', '#ffffff');
  }
}

export async function generateBlankImage(bgColor = '#000000'): Promise<Buffer> {
  if (bgColor === '#000000' && cachedBlankImage) return cachedBlankImage;
  const sharp = getSharp();
  const svg = svgWrap(bgColor, '');
  const result = await svgToDeviceJpeg(sharp, svg);
  if (bgColor === '#000000') cachedBlankImage = result;
  return result;
}

export async function generateSoundImage(name: string, imageValue?: string | null, filePath?: string | null): Promise<Buffer> {
  if (imageValue) {
    try {
      if (imageValue.startsWith(IMAGE_PREFIX_EMOJI)) {
        const emoji = imageValue.slice(IMAGE_PREFIX_EMOJI.length);
        return await generateEmojiImage(emoji, name);
      }
      if (imageValue.startsWith(IMAGE_PREFIX_ICON)) {
        const iconName = imageValue.slice(IMAGE_PREFIX_ICON.length);
        return await generateIconImage(iconName, name);
      }
      if (filePath) {
        return await generateCustomImage(filePath);
      }
    } catch (err) {
      console.error('[StreamDeck] Image generation failed for', name, ':', err);
    }
  }
  return generateTextImage(name);
}

async function generateCustomImage(imagePath: string): Promise<Buffer> {
  const sharp = getSharp();
  return imageToDeviceJpeg(sharp, imagePath);
}

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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
