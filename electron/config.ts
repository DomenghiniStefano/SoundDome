/// <reference types="electron" />
const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

import { CONFIG_DEFAULTS } from '../src/enums/config-defaults';
import { CONFIG_FILENAME, SETTINGS_EXPORT_DEFAULT_FILENAME, SETTINGS_EXPORT_FILE_EXTENSION } from '../src/enums/constants';

const CONFIG_PATH = path.join(app.getPath('userData'), CONFIG_FILENAME);

export function loadConfig(): Record<string, unknown> {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return { ...CONFIG_DEFAULTS, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error loading config:', err);
  }
  return { ...CONFIG_DEFAULTS };
}

export function saveConfig(data: Record<string, unknown>): boolean {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving config:', err);
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
    const merged = { ...CONFIG_DEFAULTS, ...imported };
    saveConfig(merged);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
