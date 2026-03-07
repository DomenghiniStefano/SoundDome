import _ from 'lodash';
import { getDevice, getCurrentPage } from './manager';
import { loadLibraryIndex, getSoundPath } from '../library';
import { loadConfig } from '../config';
import { loadMappings, getPageButtons, StreamDeckMappings } from './mappings';
import { generateSoundImage, generateBlankImage, generateInfoDisplay, generateStatImage, generateMediaImage, generateShortcutImage, generatePageNavImage, generateFolderImage, generateIconImage } from './images';
import { getSystemStats } from './system-info';
import { LCD_KEY_COUNT, LOGICAL_TO_DEVICE } from './constants';
import { StreamDeckActionType } from '../../src/enums/streamdeck';
import type { LibraryItem } from '../library';
import type { StreamDeckButtonMapping } from './mappings';

// Serialize image writes to avoid overwhelming the device
let writeQueue: Promise<void> = Promise.resolve();

function enqueue(fn: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(fn, fn);
  return writeQueue;
}

// Pre-rendered image cache: "pageIndex:keyIndex" → JPEG buffer
const imageCache = new Map<string, Buffer>();
let cachedBlank: Buffer | null = null;

function cacheKey(pageIndex: number, keyIndex: number): string {
  return `${pageIndex}:${keyIndex}`;
}

async function getBlank(): Promise<Buffer> {
  if (!cachedBlank) cachedBlank = await generateBlankImage();
  return cachedBlank;
}

async function renderKeyImage(
  keyIndex: number,
  buttons: Record<string, StreamDeckButtonMapping>,
  library: LibraryItem[],
  mappings: StreamDeckMappings,
): Promise<Buffer | null> {
  const mapping = buttons[String(keyIndex)];

  if (!mapping) return null;

  switch (mapping.type) {
    case StreamDeckActionType.SYSTEM_STAT:
      if (mapping.statType) {
        const stats = getSystemStats();
        return generateStatImage(mapping.statType, stats);
      }
      break;
    case StreamDeckActionType.MEDIA_PLAY_PAUSE:
    case StreamDeckActionType.MEDIA_NEXT:
    case StreamDeckActionType.MEDIA_PREV:
    case StreamDeckActionType.MEDIA_VOLUME_UP:
    case StreamDeckActionType.MEDIA_VOLUME_DOWN:
    case StreamDeckActionType.MEDIA_MUTE: {
      const mediaAction = mapping.mediaAction || mapping.type.replace('media', '').charAt(0).toLowerCase() + mapping.type.replace('media', '').slice(1);
      return generateMediaImage(mediaAction);
    }
    case StreamDeckActionType.SHORTCUT:
      if (mapping.shortcut) {
        return generateShortcutImage(mapping.shortcut, mapping.label);
      }
      break;
    case StreamDeckActionType.PAGE_NEXT:
      return generatePageNavImage('next');
    case StreamDeckActionType.PAGE_PREV:
      return generatePageNavImage('prev');
    case StreamDeckActionType.FOLDER: {
      const pageName = mapping.pageIndex !== undefined && mapping.pageIndex < mappings.pages.length
        ? mappings.pages[mapping.pageIndex].name
        : mapping.label || 'Folder';
      if (mapping.icon) {
        return generateIconImage(mapping.icon, pageName);
      }
      return generateFolderImage(pageName);
    }
    case StreamDeckActionType.GO_BACK:
      return generatePageNavImage('prev');
    case StreamDeckActionType.STOP_ALL:
      return generateMediaImage('stopAll');
    case StreamDeckActionType.SOUND:
      if (mapping.itemId) {
        const item = _.find(library, { id: mapping.itemId });
        if (item) {
          let filePath: string | null = null;
          if (item.image && !item.image.startsWith('icon:') && !item.image.startsWith('emoji:')) {
            try { filePath = getSoundPath(item.image); } catch { /* ignore */ }
          }
          return generateSoundImage(item.name, item.image, filePath);
        }
      }
      break;
  }

  return null;
}

// Pre-render current page first (fast), then remaining pages in background.
export async function prebuildImageCache(): Promise<void> {
  const mappings = loadMappings();
  const library = loadLibraryIndex();
  const blank = await getBlank();
  const currentPage = getCurrentPage();

  imageCache.clear();

  // Render current page first so refreshAllKeys can send immediately
  await renderPageToCache(currentPage, mappings, library, blank);

  // Send current page to device right away
  await refreshAllKeys();

  // Render remaining pages in background
  for (let pageIndex = 0; pageIndex < mappings.pages.length; pageIndex++) {
    if (pageIndex === currentPage) continue;
    await renderPageToCache(pageIndex, mappings, library, blank);
  }

  console.log('[StreamDeck] Image cache built:', imageCache.size, 'keys across', mappings.pages.length, 'pages');
}

async function renderPageToCache(
  pageIndex: number,
  mappings: StreamDeckMappings,
  library: LibraryItem[],
  blank: Buffer,
): Promise<void> {
  const buttons = getPageButtons(mappings, pageIndex);
  const tasks: { keyIndex: number; promise: Promise<Buffer | null> }[] = [];

  for (let keyIndex = 0; keyIndex < LCD_KEY_COUNT; keyIndex++) {
    const mapping = buttons[String(keyIndex)];
    if (mapping && mapping.type === StreamDeckActionType.SYSTEM_STAT) continue;
    tasks.push({
      keyIndex,
      promise: renderKeyImage(keyIndex, buttons, library, mappings)
        .then(img => img || blank)
        .catch(() => blank),
    });
  }

  const results = await Promise.all(tasks.map(t => t.promise));
  for (let i = 0; i < tasks.length; i++) {
    imageCache.set(cacheKey(pageIndex, tasks[i].keyIndex), results[i]!);
  }
}

// Send cached images to device for current page — all at once via batch queue + single flush.
export async function refreshAllKeys(): Promise<void> {
  return enqueue(async () => {
    const device = getDevice();
    if (!device || !device.isConnected()) return;

    const page = getCurrentPage();
    const blank = await getBlank();
    const mappings = loadMappings();
    const buttons = getPageButtons(mappings, page);
    const stats = getSystemStats();

    // Queue all 15 key images without flushing
    for (let keyIndex = 0; keyIndex < LCD_KEY_COUNT; keyIndex++) {
      if (!device.isConnected()) break;
      const cached = imageCache.get(cacheKey(page, keyIndex));
      if (cached) {
        device.queueImage(LOGICAL_TO_DEVICE[keyIndex], cached);
      } else {
        // Stat keys render live
        const mapping = buttons[String(keyIndex)];
        if (mapping && mapping.type === StreamDeckActionType.SYSTEM_STAT && mapping.statType) {
          const jpeg = await generateStatImage(mapping.statType, stats);
          device.queueImage(LOGICAL_TO_DEVICE[keyIndex], jpeg);
        } else {
          device.queueImage(LOGICAL_TO_DEVICE[keyIndex], blank);
        }
      }
    }

    // Single flush — all keys appear at once
    await device.flushAll();
    console.log('[StreamDeck] refreshAllKeys: done (page', page, ')');
  });
}

// Only refresh keys that show system stats (called on timer)
export async function refreshStatKeys(): Promise<void> {
  return enqueue(async () => {
    const device = getDevice();
    if (!device || !device.isConnected()) return;

    const mappings = loadMappings();
    const page = getCurrentPage();
    const buttons = getPageButtons(mappings, page);
    const stats = getSystemStats();

    for (let keyIndex = 0; keyIndex < LCD_KEY_COUNT; keyIndex++) {
      const mapping = buttons[String(keyIndex)];
      if (mapping && mapping.type === StreamDeckActionType.SYSTEM_STAT && mapping.statType) {
        try {
          const jpeg = await generateStatImage(mapping.statType, stats);
          if (device.isConnected()) {
            await device.sendImage(LOGICAL_TO_DEVICE[keyIndex], jpeg);
          }
        } catch (err) {
          console.error('[StreamDeck] Failed to update stat key', keyIndex, ':', err);
        }
      }
    }
  });
}

export async function refreshInfoDisplay(): Promise<void> {
  return enqueue(async () => {
    const device = getDevice();
    if (!device || !device.isConnected()) return;

    try {
      const config = loadConfig();
      const jpeg = await generateInfoDisplay({
        speakerVolume: (config.monitorVolume as number) || 0,
        micVolume: (config.outputVolume as number) || 0,
        speakerEnabled: (config.sendToSpeakers as boolean) ?? true,
        micEnabled: (config.sendToVirtualMic as boolean) ?? false,
      });
      if (device.isConnected()) {
        await device.sendLcdStrip(jpeg);
      }
    } catch (err) {
      console.error('[StreamDeck] Failed to update LCD strip:', err);
    }
  });
}

export async function refreshSingleKey(keyIndex: number): Promise<void> {
  return enqueue(async () => {
    const device = getDevice();
    if (!device || !device.isConnected()) return;
    if (keyIndex < 0 || keyIndex >= LCD_KEY_COUNT) return;

    const page = getCurrentPage();
    const cached = imageCache.get(cacheKey(page, keyIndex));

    try {
      if (cached) {
        await device.sendImage(LOGICAL_TO_DEVICE[keyIndex], cached);
      } else {
        const blank = await getBlank();
        await device.sendImage(LOGICAL_TO_DEVICE[keyIndex], blank);
      }
    } catch (err) {
      console.error('[StreamDeck] Failed to refresh key', keyIndex, ':', err);
    }
  });
}
