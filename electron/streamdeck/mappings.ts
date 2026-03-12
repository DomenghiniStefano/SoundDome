/// <reference types="electron" />
const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

import { log } from '../logger';
import { STREAMDECK_CONFIG_FILENAME, DEFAULT_BRIGHTNESS } from './constants';
import { STREAMDECK_EXPORT_DEFAULT_FILENAME, STREAMDECK_EXPORT_FILE_EXTENSION } from '../../src/enums/constants';
import type { StreamDeckActionTypeValue } from '../../src/enums/streamdeck';

export interface StreamDeckButtonMapping {
  type: StreamDeckActionTypeValue;
  itemId?: string;
  label?: string;
  shortcut?: string;
  appPath?: string;
  statType?: string;
  mediaAction?: string;
  folderIndex?: number; // For folder action — target folder index
  icon?: string; // Optional icon name for folder display (e.g. 'music', 'gaming')
  image?: string; // Custom image path for button display
}

export interface StreamDeckPage {
  name: string;
  buttons: Record<string, StreamDeckButtonMapping>;
}

export interface StreamDeckFolder {
  name: string;
  icon?: string;
  pages: StreamDeckPage[];
  closeAfterAction?: boolean;
  closeButtonKey?: number | null;
}

export interface StreamDeckMappings {
  pages: StreamDeckPage[];
  folders: StreamDeckFolder[];
  brightness: number;
}

const DEFAULT_MAPPINGS: StreamDeckMappings = {
  pages: [{ name: 'Main', buttons: {} }],
  folders: [],
  brightness: DEFAULT_BRIGHTNESS,
};

function getMappingsPath(): string {
  return path.join(app.getPath('userData'), STREAMDECK_CONFIG_FILENAME);
}

export function loadMappings(): StreamDeckMappings {
  try {
    const filePath = getMappingsPath();
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Migrate legacy flat format (buttons at root)
      if (parsed.buttons && !parsed.pages) {
        log.info('[StreamDeck] Migrating legacy flat mappings');
        const migrated: StreamDeckMappings = {
          pages: [{ name: 'Main', buttons: parsed.buttons || {} }],
          folders: [],
          brightness: parsed.brightness || DEFAULT_BRIGHTNESS,
        };
        saveMappings(migrated);
        return migrated;
      }

      // Migrate v2 format (pages but no folders)
      if (parsed.pages && !parsed.folders) {
        log.info('[StreamDeck] Migrating v2 mappings (adding folders)');
        const migrated: StreamDeckMappings = {
          pages: parsed.pages,
          folders: [],
          brightness: parsed.brightness || DEFAULT_BRIGHTNESS,
        };
        saveMappings(migrated);
        return migrated;
      }

      const result: StreamDeckMappings = {
        ...DEFAULT_MAPPINGS,
        ...parsed,
        pages: parsed.pages || DEFAULT_MAPPINGS.pages,
        folders: parsed.folders || [],
      };

      // Migrate pageIndex → folderIndex in folder button mappings
      let migrated = false;
      for (const page of result.pages) {
        for (const btn of Object.values(page.buttons)) {
          if (btn.type === 'folder' && (btn as any).pageIndex !== undefined && btn.folderIndex === undefined) {
            btn.folderIndex = (btn as any).pageIndex;
            delete (btn as any).pageIndex;
            migrated = true;
          }
        }
      }
      for (const folder of result.folders) {
        for (const page of folder.pages) {
          for (const btn of Object.values(page.buttons)) {
            if (btn.type === 'folder' && (btn as any).pageIndex !== undefined && btn.folderIndex === undefined) {
              btn.folderIndex = (btn as any).pageIndex;
              delete (btn as any).pageIndex;
              migrated = true;
            }
          }
        }
      }
      if (migrated) {
        log.info('[StreamDeck] Migrated pageIndex → folderIndex in folder buttons');
        saveMappings(result);
      }

      return result;
    }
  } catch (err) {
    log.error('Error loading streamdeck mappings:', err);
  }
  return { ...DEFAULT_MAPPINGS, pages: [{ name: 'Main', buttons: {} }], folders: [] };
}

export function saveMappings(mappings: StreamDeckMappings): boolean {
  try {
    const filePath = getMappingsPath();
    fs.writeFileSync(filePath, JSON.stringify(mappings, null, 2), 'utf-8');
    return true;
  } catch (err) {
    log.error('Error saving streamdeck mappings:', err);
    return false;
  }
}

// Get buttons for a top-level page
export function getPageButtons(mappings: StreamDeckMappings, pageIndex: number): Record<string, StreamDeckButtonMapping> {
  if (pageIndex >= 0 && pageIndex < mappings.pages.length) {
    return mappings.pages[pageIndex].buttons;
  }
  return {};
}

// Get buttons for a page inside a folder
// Injects a go-back button at closeButtonKey if configured and slot is empty
export function getFolderPageButtons(mappings: StreamDeckMappings, folderIndex: number, pageIndex: number): Record<string, StreamDeckButtonMapping> {
  if (folderIndex >= 0 && folderIndex < mappings.folders.length) {
    const folder = mappings.folders[folderIndex];
    if (pageIndex >= 0 && pageIndex < folder.pages.length) {
      const buttons = folder.pages[pageIndex].buttons;
      if (folder.closeButtonKey !== undefined && folder.closeButtonKey !== null) {
        const key = String(folder.closeButtonKey);
        if (!buttons[key]) {
          return { ...buttons, [key]: { type: 'goBack' as StreamDeckActionTypeValue } };
        }
      }
      return buttons;
    }
  }
  return {};
}

export async function exportMappings(): Promise<{ success: boolean; canceled?: boolean; error?: string }> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Stream Deck Mappings',
    defaultPath: STREAMDECK_EXPORT_DEFAULT_FILENAME,
    filters: [{ name: 'SoundDome Stream Deck', extensions: [STREAMDECK_EXPORT_FILE_EXTENSION] }]
  });
  if (canceled || !filePath) return { success: false, canceled: true };

  try {
    const mappings = loadMappings();
    fs.writeFileSync(filePath, JSON.stringify(mappings, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function importMappings(): Promise<{ success: boolean; canceled?: boolean; error?: string }> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import Stream Deck Mappings',
    filters: [{ name: 'SoundDome Stream Deck', extensions: [STREAMDECK_EXPORT_FILE_EXTENSION] }],
    properties: ['openFile']
  });
  if (canceled || filePaths.length === 0) return { success: false, canceled: true };

  return importMappingsFromFile(filePaths[0]);
}

export function importMappingsFromFile(filePath: string): { success: boolean; error?: string } {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const imported = JSON.parse(raw);
    if (!imported.pages || !Array.isArray(imported.pages)) {
      return { success: false, error: 'Invalid stream deck mappings file' };
    }
    saveMappings(imported);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export function resetMappings(): boolean {
  return saveMappings({ ...DEFAULT_MAPPINGS, pages: [{ name: 'Main', buttons: {} }], folders: [] });
}
