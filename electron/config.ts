/// <reference types="electron" />
const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

import { log } from './logger';
import { CONFIG_DEFAULTS } from '../src/enums/config-defaults';
import {
  CONFIG_FILENAME,
  SETTINGS_EXPORT_DEFAULT_FILENAME,
  SETTINGS_EXPORT_FILE_EXTENSION,
  THEME_EXPORT_FILE_EXTENSION,
  THEME_FORMAT_ID,
  THEME_FORMAT_VERSION,
} from '../src/enums/constants';

const CONFIG_PATH = path.join(app.getPath('userData'), CONFIG_FILENAME);

const THEME_FIELDS = ['name', 'base', 'accent', 'bgPrimary', 'bgCard', 'textPrimary'] as const;
const THEME_COLOR_FIELDS = THEME_FIELDS.slice(1); // all except 'name'

function pickThemeFields(theme: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of THEME_FIELDS) {
    if (field in theme) result[field] = theme[field];
  }
  return result;
}

function hasRequiredThemeColors(theme: Record<string, unknown>): boolean {
  return THEME_COLOR_FIELDS.every(f => Boolean(theme[f]));
}

function migrateConfig(data: Record<string, unknown>): Record<string, unknown> {
  // Rename outputVolume → soundboardVolume (v0.4)
  if ('outputVolume' in data && !('soundboardVolume' in data)) {
    data.soundboardVolume = data.outputVolume;
    delete data.outputVolume;
  }
  // Remove legacy customTheme (singular) — replaced by customThemes (array)
  if ('customTheme' in data) {
    delete data.customTheme;
  }
  return data;
}

export function loadConfig(): Record<string, unknown> {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return { ...CONFIG_DEFAULTS, ...migrateConfig(JSON.parse(data)) };
    }
  } catch (err) {
    log.error('Error loading config:', err);
  }
  return { ...CONFIG_DEFAULTS };
}

export function saveConfig(data: Record<string, unknown>): boolean {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    log.error('Error saving config:', err);
    return false;
  }
}

export async function exportConfig(): Promise<{ success: boolean; canceled?: boolean; error?: string }> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Settings',
    defaultPath: SETTINGS_EXPORT_DEFAULT_FILENAME,
    filters: [{ name: 'SoundDome Settings', extensions: [SETTINGS_EXPORT_FILE_EXTENSION] }]
  });
  if (canceled || !filePath) return { success: false, canceled: true };

  try {
    const config = loadConfig();
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function importConfig(): Promise<{ success: boolean; canceled?: boolean; error?: string }> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import Settings',
    filters: [{ name: 'SoundDome Settings', extensions: [SETTINGS_EXPORT_FILE_EXTENSION] }],
    properties: ['openFile']
  });
  if (canceled || filePaths.length === 0) return { success: false, canceled: true };

  try {
    const raw = fs.readFileSync(filePaths[0], 'utf-8');
    const imported = JSON.parse(raw);
    const merged = { ...CONFIG_DEFAULTS, ...migrateConfig(imported) };
    saveConfig(merged);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function exportTheme(theme: Record<string, unknown>): Promise<{ success: boolean; canceled?: boolean; error?: string }> {
  const name = (theme.name as string) || 'theme';
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Theme',
    defaultPath: `sounddome-${safeName}.${THEME_EXPORT_FILE_EXTENSION}`,
    filters: [{ name: 'SoundDome Theme', extensions: [THEME_EXPORT_FILE_EXTENSION] }],
  });
  if (canceled || !filePath) return { success: false, canceled: true };

  try {
    const exportData = {
      format: THEME_FORMAT_ID,
      version: THEME_FORMAT_VERSION,
      themes: [pickThemeFields(theme)],
    };
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function exportAllThemes(themes: Record<string, unknown>[]): Promise<{ success: boolean; canceled?: boolean; error?: string }> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export All Themes',
    defaultPath: `sounddome-themes.${THEME_EXPORT_FILE_EXTENSION}`,
    filters: [{ name: 'SoundDome Theme', extensions: [THEME_EXPORT_FILE_EXTENSION] }],
  });
  if (canceled || !filePath) return { success: false, canceled: true };

  try {
    const exportData = {
      format: THEME_FORMAT_ID,
      version: THEME_FORMAT_VERSION,
      themes: themes.map(pickThemeFields),
    };
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function importThemes(): Promise<{ success: boolean; canceled?: boolean; error?: string; themes?: Record<string, unknown>[] }> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import Theme',
    filters: [{ name: 'SoundDome Theme', extensions: [THEME_EXPORT_FILE_EXTENSION] }],
    properties: ['openFile'],
  });
  if (canceled || filePaths.length === 0) return { success: false, canceled: true };

  return importThemesFromFile(filePaths[0]);
}

export function importThemesFromFile(filePath: string): { success: boolean; error?: string; themes?: Record<string, unknown>[] } {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    if (data.format !== THEME_FORMAT_ID) {
      return { success: false, error: 'Invalid theme file format' };
    }

    const themes: Record<string, unknown>[] = [];

    if (Array.isArray(data.themes)) {
      for (const t of data.themes) {
        if (hasRequiredThemeColors(t)) {
          themes.push(pickThemeFields(t));
        }
      }
    } else if (hasRequiredThemeColors(data)) {
      themes.push(pickThemeFields(data));
    }

    if (themes.length === 0) {
      return { success: false, error: 'No valid themes found in file' };
    }

    return { success: true, themes };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
