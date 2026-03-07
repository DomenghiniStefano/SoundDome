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
  pageIndex?: number; // For folder action — target page index
  icon?: string; // Optional icon name for folder display (e.g. 'music', 'gaming')
}

export interface StreamDeckPage {
  name: string;
  buttons: Record<string, StreamDeckButtonMapping>;
}

export interface StreamDeckMappings {
  pages: StreamDeckPage[];
  brightness: number;
}

// Legacy format (pre-pages) for migration
interface LegacyMappings {
  buttons?: Record<string, StreamDeckButtonMapping>;
  brightness?: number;
}

const DEFAULT_MAPPINGS: StreamDeckMappings = {
  pages: [{ name: 'Main', buttons: {} }],
  brightness: 80,
};

function getMappingsPath(): string {
  return path.join(app.getPath('userData'), STREAMDECK_CONFIG_FILENAME);
}

function migrateLegacy(data: LegacyMappings): StreamDeckMappings {
  console.log('[StreamDeck] Migrating legacy flat mappings to pages format');
  return {
    pages: [{ name: 'Main', buttons: data.buttons || {} }],
    brightness: data.brightness || 80,
  };
}

export function loadMappings(): StreamDeckMappings {
  try {
    const filePath = getMappingsPath();
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Detect legacy format: has "buttons" at root instead of "pages"
      if (parsed.buttons && !parsed.pages) {
        const migrated = migrateLegacy(parsed);
        // Save migrated format back
        saveMappings(migrated);
        return migrated;
      }

      return {
        ...DEFAULT_MAPPINGS,
        ...parsed,
        pages: parsed.pages || DEFAULT_MAPPINGS.pages,
      };
    }
  } catch (err) {
    console.error('Error loading streamdeck mappings:', err);
  }
  return { ...DEFAULT_MAPPINGS, pages: [{ name: 'Main', buttons: {} }] };
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

// Helper: get buttons for a specific page index (safe access)
export function getPageButtons(mappings: StreamDeckMappings, pageIndex: number): Record<string, StreamDeckButtonMapping> {
  if (pageIndex >= 0 && pageIndex < mappings.pages.length) {
    return mappings.pages[pageIndex].buttons;
  }
  return {};
}
