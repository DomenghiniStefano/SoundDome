/// <reference types="electron" />
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

import { STREAMDECK_CONFIG_FILENAME } from './constants';
import type { StreamDeckActionTypeValue } from '../../src/enums/streamdeck';

export interface StreamDeckButtonMapping {
  type: StreamDeckActionTypeValue;
  itemId?: string;
  label?: string;
  shortcut?: string;
  statType?: string;
  mediaAction?: string;
  folderIndex?: number; // For folder action — target folder index
  icon?: string; // Optional icon name for folder display (e.g. 'music', 'gaming')
}

export interface StreamDeckPage {
  name: string;
  buttons: Record<string, StreamDeckButtonMapping>;
}

export interface StreamDeckFolder {
  name: string;
  icon?: string;
  pages: StreamDeckPage[];
}

export interface StreamDeckMappings {
  pages: StreamDeckPage[];
  folders: StreamDeckFolder[];
  brightness: number;
}

const DEFAULT_MAPPINGS: StreamDeckMappings = {
  pages: [{ name: 'Main', buttons: {} }],
  folders: [],
  brightness: 80,
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
        console.log('[StreamDeck] Migrating legacy flat mappings');
        const migrated: StreamDeckMappings = {
          pages: [{ name: 'Main', buttons: parsed.buttons || {} }],
          folders: [],
          brightness: parsed.brightness || 80,
        };
        saveMappings(migrated);
        return migrated;
      }

      // Migrate v2 format (pages but no folders)
      if (parsed.pages && !parsed.folders) {
        console.log('[StreamDeck] Migrating v2 mappings (adding folders)');
        const migrated: StreamDeckMappings = {
          pages: parsed.pages,
          folders: [],
          brightness: parsed.brightness || 80,
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
        console.log('[StreamDeck] Migrated pageIndex → folderIndex in folder buttons');
        saveMappings(result);
      }

      return result;
    }
  } catch (err) {
    console.error('Error loading streamdeck mappings:', err);
  }
  return { ...DEFAULT_MAPPINGS, pages: [{ name: 'Main', buttons: {} }], folders: [] };
}

export function saveMappings(mappings: StreamDeckMappings): boolean {
  try {
    const filePath = getMappingsPath();
    fs.writeFileSync(filePath, JSON.stringify(mappings, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving streamdeck mappings:', err);
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
export function getFolderPageButtons(mappings: StreamDeckMappings, folderIndex: number, pageIndex: number): Record<string, StreamDeckButtonMapping> {
  if (folderIndex >= 0 && folderIndex < mappings.folders.length) {
    const folder = mappings.folders[folderIndex];
    if (pageIndex >= 0 && pageIndex < folder.pages.length) {
      return folder.pages[pageIndex].buttons;
    }
  }
  return {};
}
