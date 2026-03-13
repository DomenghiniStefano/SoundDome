const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

import _ from 'lodash';
import {
  EXPORT_FILE_EXTENSION,
  SETTINGS_EXPORT_FILE_EXTENSION,
  THEME_EXPORT_FILE_EXTENSION,
  STREAMDECK_EXPORT_FILE_EXTENSION,
  THEME_FORMAT_ID,
  ImportType,
  LIBRARY_INDEX_FILENAME,
} from '../../src/enums/constants';
import { CONFIG_DEFAULTS } from '../../src/enums/config-defaults';
import { loadLibraryIndex } from './helpers';
import { importLibrary } from './export-import';
import { loadConfig, saveConfig } from '../config';
import { importThemesFromFile } from '../theme';
import { importMappingsFromFile } from '../streamdeck/mappings';
import type { LibraryItem, Group } from './helpers';

const { dialog } = require('electron');

// --- Unified Import ---

export async function importInspect() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import',
    filters: [
      { name: 'SoundDome Files', extensions: [EXPORT_FILE_EXTENSION, SETTINGS_EXPORT_FILE_EXTENSION, THEME_EXPORT_FILE_EXTENSION, STREAMDECK_EXPORT_FILE_EXTENSION] },
    ],
    properties: ['openFile']
  });
  if (canceled || filePaths.length === 0) return null;

  const filePath = filePaths[0];
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === `.${EXPORT_FILE_EXTENSION}`) {
      const zip = new AdmZip(filePath);
      const indexEntry = zip.getEntry(LIBRARY_INDEX_FILENAME);
      if (!indexEntry) return null;

      const importedRaw = JSON.parse(indexEntry.getData().toString('utf-8'));
      const importedItems: LibraryItem[] = Array.isArray(importedRaw) ? importedRaw : (importedRaw.items ?? []);
      const importedGroups: Group[] = Array.isArray(importedRaw) ? [] : (importedRaw.groups ?? importedRaw.sections ?? []);

      const currentData = loadLibraryIndex();
      const existingNames = new Set(_.map(currentData.items, 'name'));
      const newSounds = _.reject(importedItems, (item: LibraryItem) => existingNames.has(item.name)).length;

      return {
        type: ImportType.LIBRARY,
        filePath,
        library: {
          totalSounds: importedItems.length,
          newSounds,
          groups: importedGroups.length,
        }
      };
    } else if (ext === `.${THEME_EXPORT_FILE_EXTENSION}`) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.format !== THEME_FORMAT_ID) return null;
      const themes = Array.isArray(parsed.themes) ? parsed.themes : [];

      return {
        type: ImportType.THEME,
        filePath,
        theme: {
          count: themes.length,
        }
      };
    } else if (ext === `.${STREAMDECK_EXPORT_FILE_EXTENSION}`) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.pages || !Array.isArray(parsed.pages)) return null;

      return {
        type: ImportType.STREAMDECK,
        filePath,
        streamdeck: {
          pages: parsed.pages.length,
          folders: (parsed.folders || []).length,
        }
      };
    } else {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      const keys = Object.keys(CONFIG_DEFAULTS);
      const validKeys = _.filter(keys, (k: string) => parsed[k] !== undefined);

      return {
        type: ImportType.SETTINGS,
        filePath,
        settings: {
          count: validKeys.length,
        }
      };
    }
  } catch {
    return null;
  }
}

export async function importExecute(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === `.${EXPORT_FILE_EXTENSION}`) {
    return { ...await importLibrary(filePath), type: 'library' as const };
  } else if (ext === `.${THEME_EXPORT_FILE_EXTENSION}`) {
    const result = importThemesFromFile(filePath);
    if (!result.success || !result.themes) {
      return { success: false, error: result.error, type: 'theme' as const };
    }
    // Merge imported themes into current config
    const config = loadConfig();
    const customThemes = Array.isArray(config.customThemes) ? [...config.customThemes] : [];
    for (const themeData of result.themes) {
      const d = themeData as Record<string, string>;
      if (!d.base || !d.accent || !d.bgPrimary || !d.bgCard || !d.textPrimary) continue;
      customThemes.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: d.name || 'Imported Theme',
        ...d,
      });
    }
    config.customThemes = customThemes;
    saveConfig(config);
    return { success: true, type: ImportType.THEME, themesAdded: result.themes.length };
  } else if (ext === `.${STREAMDECK_EXPORT_FILE_EXTENSION}`) {
    const result = importMappingsFromFile(filePath);
    return { ...result, type: 'streamdeck' as const };
  } else {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const imported = JSON.parse(raw);
      const merged = { ...CONFIG_DEFAULTS, ...imported };
      saveConfig(merged);
      return { success: true, type: 'settings' as const };
    } catch (err) {
      return { success: false, error: (err as Error).message, type: 'settings' as const };
    }
  }
}
