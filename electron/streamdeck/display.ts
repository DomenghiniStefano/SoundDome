import _ from 'lodash';
import { getDevice, getCurrentPage } from './manager';
import { loadLibraryIndex, getSoundPath } from '../library';
import { loadConfig } from '../config';
import { loadMappings, getPageButtons, StreamDeckMappings } from './mappings';
import { generateSoundImage, generateBlankImage, generateInfoDisplay, generateStatImage, generateMediaImage, generateShortcutImage, generatePageNavImage, generateFolderImage } from './images';
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

export async function refreshAllKeys(): Promise<void> {
  return enqueue(async () => {
    const device = getDevice();
    if (!device || !device.isConnected()) return;

    const mappings = loadMappings();
    const library = loadLibraryIndex();
    const page = getCurrentPage();
    const buttons = getPageButtons(mappings, page);

    // Render all key images in parallel
    const keyIndices = Array.from({ length: LCD_KEY_COUNT }, (_, i) => i);
    const images = await Promise.all(
      keyIndices.map(async (keyIndex) => {
        try {
          return await renderKeyImage(keyIndex, buttons, library, mappings) || await generateBlankImage();
        } catch (err) {
          console.error('[StreamDeck] Failed to render key', keyIndex, ':', err);
          return await generateBlankImage();
        }
      })
    );

    // Send to device sequentially (device requires serial writes)
    for (let keyIndex = 0; keyIndex < LCD_KEY_COUNT; keyIndex++) {
      if (device.isConnected()) {
        await device.sendImage(LOGICAL_TO_DEVICE[keyIndex], images[keyIndex]);
      }
    }
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

    const mappings = loadMappings();
    const library = loadLibraryIndex();
    const page = getCurrentPage();
    const buttons = getPageButtons(mappings, page);

    try {
      const jpeg = await renderKeyImage(keyIndex, buttons, library, mappings);
      if (jpeg) {
        if (device.isConnected()) await device.sendImage(LOGICAL_TO_DEVICE[keyIndex], jpeg);
      } else {
        const blank = await generateBlankImage();
        if (device.isConnected()) await device.sendImage(LOGICAL_TO_DEVICE[keyIndex], blank);
      }
    } catch (err) {
      console.error('[StreamDeck] Failed to refresh key', keyIndex, ':', err);
    }
  });
}
