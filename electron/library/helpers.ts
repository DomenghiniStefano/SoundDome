const { app } = require('electron');
const path = require('path');
const fs = require('fs');

import axios from 'axios';
import { log } from '../logger';
import { BACKUP_SUFFIX, LIBRARY_DIR_NAME, LIBRARY_INDEX_FILENAME } from '../../src/enums/constants';

// --- Types ---

export interface LibraryItem {
  id: string;
  name: string;
  filename: string;
  volume?: number;
  hotkey?: string | null;
  backupEnabled?: boolean;
  image?: string | null;
  favorite?: boolean;
  slug?: string | null;
  sourceUrl?: string | null;
}

export interface Group {
  id: string;
  name: string;
  itemIds: string[];
}

export interface LibraryData {
  items: LibraryItem[];
  groups: Group[];
}

// --- Constants ---

export const DOWNLOAD_TIMEOUT_MS = 30000;
export const LIBRARY_DIR = path.join(app.getPath('userData'), LIBRARY_DIR_NAME);
export const LIBRARY_INDEX = path.join(LIBRARY_DIR, LIBRARY_INDEX_FILENAME);

// --- Index I/O ---

export function loadLibraryIndex(): LibraryData {
  try {
    if (fs.existsSync(LIBRARY_INDEX)) {
      const parsed = JSON.parse(fs.readFileSync(LIBRARY_INDEX, 'utf-8'));
      // Migration: old format was a flat array
      if (Array.isArray(parsed)) {
        return { items: parsed, groups: [] };
      }
      // Migration: support old 'sections' field name
      return { items: parsed.items ?? [], groups: parsed.groups ?? parsed.sections ?? [] };
    }
  } catch (err) {
    log.error('Error loading library index:', err);
  }
  return { items: [], groups: [] };
}

export function saveLibraryIndex(data: LibraryData) {
  fs.writeFileSync(LIBRARY_INDEX, JSON.stringify(data, null, 2), 'utf-8');
}

export function ensureLibraryDir() {
  if (!fs.existsSync(LIBRARY_DIR)) {
    fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  }
}

let idCounter = 0;
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + (idCounter++).toString(36);
}

export async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: DOWNLOAD_TIMEOUT_MS });
  fs.writeFileSync(dest, Buffer.from(response.data));
}
