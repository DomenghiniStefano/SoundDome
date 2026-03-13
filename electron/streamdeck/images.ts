import { log } from '../logger';
import { KEY_IMAGE_SIZE, JPEG_QUALITY } from './constants';
import { ImagePrefix } from '../../src/enums/ui';

// SVGs created at KEY_IMAGE_SIZE (85px), rendered directly to JPEG — no upscaling.
export const SIZE = KEY_IMAGE_SIZE;

let sharpModule: typeof import('sharp') | null = null;

export function getSharp(): typeof import('sharp') {
  if (!sharpModule) {
    sharpModule = require('sharp');
  }
  return sharpModule!;
}

// Render SVG to JPEG — pre-rotate 270° to counter device's 90° CW rotation.
export async function svgToDeviceJpeg(sharp: typeof import('sharp'), svg: string): Promise<Buffer> {
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

export function svgWrap(bgColor: string, content: string): string {
  return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg" overflow="hidden">
    <rect width="${SIZE}" height="${SIZE}" fill="${bgColor}" />
    ${content}
  </svg>`;
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
export function iconContentBlock(pathData: string, color: string, label: string): string {
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
    log.error('[StreamDeck] Icon SVG render FAILED:', err);
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
      if (imageValue.startsWith(ImagePrefix.EMOJI)) {
        const emoji = imageValue.slice(ImagePrefix.EMOJI.length);
        return await generateEmojiImage(emoji, name);
      }
      if (imageValue.startsWith(ImagePrefix.ICON)) {
        const iconName = imageValue.slice(ImagePrefix.ICON.length);
        return await generateIconImage(iconName, name);
      }
      if (filePath) {
        return await generateCustomImage(filePath);
      }
    } catch (err) {
      log.error('[StreamDeck] Image generation failed for', name, ':', err);
    }
  }
  return generateTextImage(name);
}

export async function generateCustomImage(imagePath: string): Promise<Buffer> {
  const sharp = getSharp();
  return imageToDeviceJpeg(sharp, imagePath);
}
