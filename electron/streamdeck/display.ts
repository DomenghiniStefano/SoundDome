import _ from 'lodash';
import { getDevice, getCurrentPage, getCurrentFolder } from './manager';
import { loadLibraryIndex, getSoundPath } from '../library';
import { loadConfig } from '../config';
import { loadMappings, getPageButtons, getFolderPageButtons, StreamDeckMappings } from './mappings';
import { generateSoundImage, generateBlankImage, generateInfoDisplay, generateStatImage, generateMediaImage, generateShortcutImage, generateLaunchAppImage, generatePageNavImage, generateFolderImage, generateIconImage, generateEmojiImage, generateCustomImage } from './images';
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

// Pre-rendered image cache: "context:pageIndex:keyIndex" → JPEG buffer
// context is "top" for top-level pages, "f{N}" for folder N
const imageCache = new Map<string, Buffer>();
let cachedBlank: Buffer | null = null;

function cacheKey(folderIndex: number | null, pageIndex: number, keyIndex: number): string {
  const ctx = folderIndex !== null ? `f${folderIndex}` : 'top';
  return `${ctx}:${pageIndex}:${keyIndex}`;
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

  // Custom image overrides default rendering (except live stat gauges)
  if (mapping.image && mapping.type !== StreamDeckActionType.SYSTEM_STAT) {
    try {
      const fs = require('fs');
      if (fs.existsSync(mapping.image)) {
        return await generateCustomImage(mapping.image);
      }
    } catch { /* fall through to default rendering */ }
  }

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
    case StreamDeckActionType.LAUNCH_APP:
      if (mapping.appPath) {
        const appName = mapping.label || require('path').basename(mapping.appPath, '.exe');
        return generateLaunchAppImage(appName, mapping.label);
      }
      break;
    case StreamDeckActionType.PAGE_NEXT:
      return generatePageNavImage('next');
    case StreamDeckActionType.PAGE_PREV:
      return generatePageNavImage('prev');
    case StreamDeckActionType.FOLDER: {
      if (mapping.folderIndex !== undefined && mapping.folderIndex < mappings.folders.length) {
        const folder = mappings.folders[mapping.folderIndex];
        const iconValue = mapping.icon || folder.icon;
        if (iconValue) {
          if (iconValue.startsWith('emoji:')) {
            return generateEmojiImage(iconValue.slice(6), folder.name);
          }
          if (iconValue.startsWith('icon:')) {
            return generateIconImage(iconValue.slice(5), folder.name);
          }
          return generateIconImage(iconValue, folder.name);
        }
        return generateFolderImage(folder.name);
      }
      return generateFolderImage(mapping.label || 'Folder');
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

async function renderPageToCache(
  folderIndex: number | null,
  pageIndex: number,
  mappings: StreamDeckMappings,
  library: LibraryItem[],
  blank: Buffer,
): Promise<void> {
  const buttons = folderIndex !== null
    ? getFolderPageButtons(mappings, folderIndex, pageIndex)
    : getPageButtons(mappings, pageIndex);

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
    imageCache.set(cacheKey(folderIndex, pageIndex, tasks[i].keyIndex), results[i]!);
  }
}

// Pre-render current page first, send to device, then cache everything else.
export async function prebuildImageCache(): Promise<void> {
  const mappings = loadMappings();
  const { items: library } = loadLibraryIndex();
  const blank = await getBlank();
  const curPage = getCurrentPage();
  const curFolder = getCurrentFolder();

  imageCache.clear();

  // Render current page first for instant display
  await renderPageToCache(curFolder, curPage, mappings, library, blank);
  await refreshAllKeys();

  // Cache remaining top-level pages
  for (let i = 0; i < mappings.pages.length; i++) {
    if (curFolder === null && i === curPage) continue; // Already cached
    await renderPageToCache(null, i, mappings, library, blank);
  }

  // Cache all folder pages
  for (let fi = 0; fi < mappings.folders.length; fi++) {
    const folder = mappings.folders[fi];
    for (let pi = 0; pi < folder.pages.length; pi++) {
      if (curFolder === fi && pi === curPage) continue; // Already cached
      await renderPageToCache(fi, pi, mappings, library, blank);
    }
  }

  console.log('[StreamDeck] Image cache built:', imageCache.size, 'keys, pages:', mappings.pages.length, 'folders:', mappings.folders.length);
}

// Send cached images to device — batch queue + single flush.
export async function refreshAllKeys(): Promise<void> {
  return enqueue(async () => {
    const device = getDevice();
    if (!device || !device.isConnected()) return;

    const page = getCurrentPage();
    const folder = getCurrentFolder();
    const blank = await getBlank();
    const mappings = loadMappings();
    const { items: library } = loadLibraryIndex();
    const buttons = folder !== null
      ? getFolderPageButtons(mappings, folder, page)
      : getPageButtons(mappings, page);
    const stats = getSystemStats();

    // Pre-render all uncached keys in parallel before sending anything
    const images: Buffer[] = new Array(LCD_KEY_COUNT);
    const renderTasks: Promise<void>[] = [];

    for (let keyIndex = 0; keyIndex < LCD_KEY_COUNT; keyIndex++) {
      const cached = imageCache.get(cacheKey(folder, page, keyIndex));
      if (cached) {
        images[keyIndex] = cached;
      } else {
        const ki = keyIndex;
        const mapping = buttons[String(ki)];
        if (mapping && mapping.type === StreamDeckActionType.SYSTEM_STAT && mapping.statType) {
          renderTasks.push(
            generateStatImage(mapping.statType, stats).then(img => { images[ki] = img; }).catch(() => { images[ki] = blank; })
          );
        } else if (mapping) {
          renderTasks.push(
            renderKeyImage(ki, buttons, library, mappings).then(img => { images[ki] = img || blank; }).catch(() => { images[ki] = blank; })
          );
        } else {
          images[keyIndex] = blank;
        }
      }
    }

    await Promise.all(renderTasks);

    // Queue all at once, then single flush
    for (let keyIndex = 0; keyIndex < LCD_KEY_COUNT; keyIndex++) {
      if (!device.isConnected()) break;
      device.queueImage(LOGICAL_TO_DEVICE[keyIndex], images[keyIndex]);
    }

    await device.flushAll();
  });
}

// Refresh stat keys — re-queues ALL keys (cached for non-stats, fresh for stats) then flushes once.
// The device clears the full display on flush, so we must always send all 15 keys.
export async function refreshStatKeys(): Promise<void> {
  return enqueue(async () => {
    const device = getDevice();
    if (!device || !device.isConnected()) return;

    const mappings = loadMappings();
    const page = getCurrentPage();
    const folder = getCurrentFolder();
    const buttons = folder !== null
      ? getFolderPageButtons(mappings, folder, page)
      : getPageButtons(mappings, page);
    const blank = await getBlank();
    const stats = getSystemStats();

    // Render fresh stat images in parallel
    const statRenders: { keyIndex: number; promise: Promise<Buffer> }[] = [];
    for (let keyIndex = 0; keyIndex < LCD_KEY_COUNT; keyIndex++) {
      const mapping = buttons[String(keyIndex)];
      if (mapping && mapping.type === StreamDeckActionType.SYSTEM_STAT && mapping.statType) {
        statRenders.push({ keyIndex, promise: generateStatImage(mapping.statType, stats) });
      }
    }

    if (statRenders.length === 0) return;

    const statResults = await Promise.all(statRenders.map(s => s.promise.catch(() => blank)));
    const statMap = new Map<number, Buffer>();
    for (let i = 0; i < statRenders.length; i++) {
      statMap.set(statRenders[i].keyIndex, statResults[i]);
    }

    // Queue all 15 keys: fresh stats + cached everything else
    for (let keyIndex = 0; keyIndex < LCD_KEY_COUNT; keyIndex++) {
      if (!device.isConnected()) break;
      const statImg = statMap.get(keyIndex);
      if (statImg) {
        device.queueImage(LOGICAL_TO_DEVICE[keyIndex], statImg);
      } else {
        const cached = imageCache.get(cacheKey(folder, page, keyIndex));
        device.queueImage(LOGICAL_TO_DEVICE[keyIndex], cached || blank);
      }
    }

    if (device.isConnected()) {
      await device.flushAll();
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
    const folder = getCurrentFolder();
    const cached = imageCache.get(cacheKey(folder, page, keyIndex));

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
