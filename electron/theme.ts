/// <reference types="electron" />
const { dialog } = require('electron');
const fs = require('fs');

import {
  THEME_FIELDS,
  THEME_REQUIRED_COLOR_FIELDS,
  THEME_EXPORT_FILE_EXTENSION,
  THEME_FORMAT_ID,
  THEME_FORMAT_VERSION,
} from '../src/enums/constants';

function pickThemeFields(theme: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of THEME_FIELDS) {
    if (field in theme) result[field] = theme[field];
  }
  return result;
}

function hasRequiredThemeColors(theme: Record<string, unknown>): boolean {
  return THEME_REQUIRED_COLOR_FIELDS.every(f => Boolean(theme[f]));
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
