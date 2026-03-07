/// <reference types="electron" />
const { app, dialog, BrowserWindow } = require('electron');
const AdmZip = require('adm-zip');
const fluentFfmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

import axios from 'axios';
import _ from 'lodash';
import {
  VOLUME_ITEM_DEFAULT,
  BACKUP_SUFFIX,
  AUDIO_EXTENSION,
  IMAGE_EXTENSION,
  IMAGE_EXTENSIONS,
  LIBRARY_DIR_NAME,
  LIBRARY_INDEX_FILENAME,
  EXPORT_DEFAULT_FILENAME,
  EXPORT_FILE_EXTENSION,
  SETTINGS_EXPORT_FILE_EXTENSION,
  AUDIO_BITRATE,
} from '../src/enums/constants';
import { CONFIG_DEFAULTS } from '../src/enums/config-defaults';
import { loadConfig, saveConfig } from './config';

const LIBRARY_DIR = path.join(app.getPath('userData'), LIBRARY_DIR_NAME);
const LIBRARY_INDEX = path.join(LIBRARY_DIR, LIBRARY_INDEX_FILENAME);

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
}

export interface Section {
  id: string;
  name: string;
  itemIds: string[];
}

export interface LibraryData {
  items: LibraryItem[];
  sections: Section[];
}

// --- Index I/O ---

export function loadLibraryIndex(): LibraryData {
  try {
    if (fs.existsSync(LIBRARY_INDEX)) {
      const parsed = JSON.parse(fs.readFileSync(LIBRARY_INDEX, 'utf-8'));
      // Migration: old format was a flat array
      if (Array.isArray(parsed)) {
        return { items: parsed, sections: [] };
      }
      return { items: parsed.items ?? [], sections: parsed.sections ?? [] };
    }
  } catch (err) {
    console.error('Error loading library index:', err);
  }
  return { items: [], sections: [] };
}

function saveLibraryIndex(data: LibraryData) {
  fs.writeFileSync(LIBRARY_INDEX, JSON.stringify(data, null, 2), 'utf-8');
}

function ensureLibraryDir() {
  if (!fs.existsSync(LIBRARY_DIR)) {
    fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  }
}

let idCounter = 0;
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + (idCounter++).toString(36);
}

// --- File helpers ---

export function getBackupFiles(filename: string): string[] {
  if (!fs.existsSync(LIBRARY_DIR)) return [];
  const allFiles = fs.readdirSync(LIBRARY_DIR) as string[];
  return _.filter(allFiles, (f: string) => f.startsWith(filename + BACKUP_SUFFIX));
}

export function hasLibraryBackups(): boolean {
  if (!fs.existsSync(LIBRARY_DIR)) return false;
  const files = fs.readdirSync(LIBRARY_DIR) as string[];
  return _.some(files, (f: string) => _.includes(f, BACKUP_SUFFIX));
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  fs.writeFileSync(dest, Buffer.from(response.data));
}

// --- FFmpeg ---

function resolveFfmpegPath(): string {
  if (!app.isPackaged) return require('ffmpeg-static');
  const binary = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  return path.join(process.resourcesPath, binary);
}

// --- CRUD operations ---

export async function saveSound({ name, url }: { name: string; url: string }) {
  ensureLibraryDir();

  const data = loadLibraryIndex();
  const id = generateId();
  const filename = `${id}${AUDIO_EXTENSION}`;

  await downloadFile(url, path.join(LIBRARY_DIR, filename));

  const item = { id, name, filename, volume: VOLUME_ITEM_DEFAULT, hotkey: null, backupEnabled: true, image: null, favorite: false };
  data.items.push(item);
  saveLibraryIndex(data);

  return item;
}

export function listSounds() {
  const data = loadLibraryIndex();
  const items = _.map(data.items, (item: LibraryItem) => ({
    volume: VOLUME_ITEM_DEFAULT,
    hotkey: null,
    backupEnabled: true,
    image: null,
    favorite: false,
    ...item
  }));
  return { items, sections: data.sections };
}

export function updateSound(id: string, updates: Record<string, unknown>) {
  const data = loadLibraryIndex();
  const item = _.find(data.items, { id });
  if (!item) return null;

  const patch = _.pick(updates, ['name', 'volume', 'hotkey', 'backupEnabled', 'image', 'favorite']);
  Object.assign(item, patch);

  saveLibraryIndex(data);
  return { item, hotkeyChanged: 'hotkey' in patch };
}

export function getSoundPath(filename: string): string {
  return path.join(LIBRARY_DIR, filename);
}

export function deleteSound(id: string): { deleted: boolean; hadHotkey: boolean } {
  const data = loadLibraryIndex();
  const item = _.find(data.items, { id });
  if (!item) return { deleted: false, hadHotkey: false };

  const hadHotkey = !!item.hotkey;
  const filePath = path.join(LIBRARY_DIR, item.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  if (item.image) {
    const imgPath = path.join(LIBRARY_DIR, item.image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
  getBackupFiles(item.filename).forEach((f: string) => fs.unlinkSync(path.join(LIBRARY_DIR, f)));

  data.items = _.reject(data.items, { id });
  // Remove from all sections
  for (const section of data.sections) {
    section.itemIds = _.reject(section.itemIds, (itemId: string) => itemId === id);
  }
  saveLibraryIndex(data);

  return { deleted: true, hadHotkey };
}

export function reorderSounds(orderedIds: string[]): boolean {
  const data = loadLibraryIndex();
  const byId = _.keyBy(data.items, 'id');
  data.items = _.compact(_.map(orderedIds, (id: string) => byId[id]));
  saveLibraryIndex(data);
  return true;
}

// --- Image ---

export async function setImage(id: string) {
  const parentWindow = BrowserWindow.getFocusedWindow();
  const { canceled, filePaths } = await dialog.showOpenDialog(parentWindow, {
    title: 'Select Image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    properties: ['openFile']
  });
  if (canceled || filePaths.length === 0) return null;

  ensureLibraryDir();

  // Remove any existing image with a different extension
  removeImage(id);

  const ext = path.extname(filePaths[0]).toLowerCase();
  const imageFilename = `${id}${ext}`;
  const destPath = path.join(LIBRARY_DIR, imageFilename);

  fs.copyFileSync(filePaths[0], destPath);

  return { image: imageFilename };
}

export function removeImage(id: string) {
  for (const ext of IMAGE_EXTENSIONS) {
    const imgPath = path.join(LIBRARY_DIR, `${id}${ext}`);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
  return true;
}

// --- Trim ---

export function trimSound(id: string, startTime: number, endTime: number): Promise<{ success: boolean; error?: string }> {
  const { items } = loadLibraryIndex();
  const item = _.find(items, { id });
  if (!item) return Promise.resolve({ success: false, error: 'Item not found' });

  const mp3Path = path.join(LIBRARY_DIR, item.filename);
  if (!fs.existsSync(mp3Path)) return Promise.resolve({ success: false, error: 'File not found' });

  const tempPath = path.join(LIBRARY_DIR, `${item.id}_trimmed${AUDIO_EXTENSION}`);

  if (item.backupEnabled !== false) {
    const backupPath = mp3Path + `${BACKUP_SUFFIX}${Date.now()}`;
    fs.copyFileSync(mp3Path, backupPath);
  }

  const duration = endTime - startTime;

  return new Promise((resolve) => {
    fluentFfmpeg(mp3Path)
      .setFfmpegPath(resolveFfmpegPath())
      .inputOptions([`-ss ${startTime}`])
      .outputOptions([`-t ${duration}`, `-b:a ${AUDIO_BITRATE}`])
      .output(tempPath)
      .on('end', () => {
        try {
          fs.unlinkSync(mp3Path);
          fs.renameSync(tempPath, mp3Path);
          resolve({ success: true });
        } catch (err: unknown) {
          resolve({ success: false, error: (err as Error).message });
        }
      })
      .on('error', (err: Error) => {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        resolve({ success: false, error: err.message });
      })
      .run();
  });
}

// --- Backups ---

export function listBackups(id: string) {
  const { items } = loadLibraryIndex();
  const item = _.find(items, { id });
  if (!item) return [];

  const prefix = item.filename + BACKUP_SUFFIX;
  if (!fs.existsSync(LIBRARY_DIR)) return [];
  const files = fs.readdirSync(LIBRARY_DIR) as string[];

  return _(files)
    .filter((f: string) => f.startsWith(prefix))
    .map((f: string) => ({
      timestamp: parseInt(f.slice(prefix.length), 10),
      filename: f
    }))
    .orderBy('timestamp', 'desc')
    .value();
}

export function restoreBackup(id: string, timestamp: number): { success: boolean; error?: string } {
  const { items } = loadLibraryIndex();
  const item = _.find(items, { id });
  if (!item) return { success: false, error: 'Item not found' };

  const mp3Path = path.join(LIBRARY_DIR, item.filename);
  const backupPath = mp3Path + `${BACKUP_SUFFIX}${timestamp}`;
  if (!fs.existsSync(backupPath)) return { success: false, error: 'Backup not found' };

  try {
    fs.copyFileSync(backupPath, mp3Path);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export function deleteBackup(id: string, timestamp: number): boolean {
  const { items } = loadLibraryIndex();
  const item = _.find(items, { id });
  if (!item) return false;

  const backupPath = path.join(LIBRARY_DIR, item.filename + `${BACKUP_SUFFIX}${timestamp}`);
  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
    return true;
  }
  return false;
}

export function deleteAllBackups(id?: string): boolean {
  if (!fs.existsSync(LIBRARY_DIR)) return false;

  if (id) {
    const { items } = loadLibraryIndex();
    const item = _.find(items, { id });
    if (!item) return false;
    getBackupFiles(item.filename).forEach((f: string) => fs.unlinkSync(path.join(LIBRARY_DIR, f)));
  } else {
    const allFiles = fs.readdirSync(LIBRARY_DIR) as string[];
    _.filter(allFiles, (f: string) => _.includes(f, BACKUP_SUFFIX))
      .forEach((f: string) => fs.unlinkSync(path.join(LIBRARY_DIR, f)));
  }
  return true;
}

// --- Export / Import ---

export async function exportLibrary({ includeBackups }: { includeBackups?: boolean } = {}) {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Library',
    defaultPath: EXPORT_DEFAULT_FILENAME,
    filters: [{ name: 'SoundDome Library', extensions: [EXPORT_FILE_EXTENSION] }]
  });
  if (canceled || !filePath) return { success: false, canceled: true };

  const data = loadLibraryIndex();
  if (data.items.length === 0) return { success: false, error: 'Library is empty' };

  const zip = new AdmZip();
  zip.addFile(LIBRARY_INDEX_FILENAME, Buffer.from(JSON.stringify(data, null, 2), 'utf-8'));

  for (const item of data.items) {
    const mp3Path = path.join(LIBRARY_DIR, item.filename);
    if (fs.existsSync(mp3Path)) {
      zip.addLocalFile(mp3Path);
    }
    if (item.image) {
      const imgPath = path.join(LIBRARY_DIR, item.image);
      if (fs.existsSync(imgPath)) zip.addLocalFile(imgPath);
    }
    if (includeBackups) {
      getBackupFiles(item.filename).forEach((f: string) => zip.addLocalFile(path.join(LIBRARY_DIR, f)));
    }
  }

  zip.writeZip(filePath);
  return { success: true, count: data.items.length };
}

export async function importLibrary(sourceFilePath?: string) {
  let filePath = sourceFilePath;
  if (!filePath) {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Library',
      filters: [{ name: 'SoundDome Library', extensions: [EXPORT_FILE_EXTENSION] }],
      properties: ['openFile']
    });
    if (canceled || filePaths.length === 0) return { success: false, canceled: true };
    filePath = filePaths[0];
  }

  ensureLibraryDir();

  const zip = new AdmZip(filePath);
  const indexEntry = zip.getEntry(LIBRARY_INDEX_FILENAME);
  if (!indexEntry) return { success: false, error: `Invalid .${EXPORT_FILE_EXTENSION} file (no ${LIBRARY_INDEX_FILENAME})` };

  const importedRaw = JSON.parse(indexEntry.getData().toString('utf-8'));
  // Handle old (array) and new (object) formats
  const importedItems: LibraryItem[] = Array.isArray(importedRaw) ? importedRaw : (importedRaw.items ?? []);
  const importedSections: Section[] = Array.isArray(importedRaw) ? [] : (importedRaw.sections ?? []);

  const currentData = loadLibraryIndex();
  const existingNames = new Set(_.map(currentData.items, 'name'));
  const idMap: Record<string, string> = {};

  let added = 0;
  for (const item of importedItems) {
    if (existingNames.has(item.name)) continue;

    const entry = zip.getEntry(item.filename);
    if (!entry) continue;

    const newId = generateId();
    idMap[item.id] = newId;
    const newFilename = `${newId}${AUDIO_EXTENSION}`;
    fs.writeFileSync(path.join(LIBRARY_DIR, newFilename), entry.getData());

    // Restore backups if present in ZIP
    const bakPrefix = item.filename + BACKUP_SUFFIX;
    for (const zipEntry of zip.getEntries()) {
      if (zipEntry.entryName.startsWith(bakPrefix)) {
        const suffix = zipEntry.entryName.slice(item.filename.length);
        fs.writeFileSync(path.join(LIBRARY_DIR, newFilename + suffix), zipEntry.getData());
      }
    }

    // Restore image if present in ZIP
    let newImage: string | null = null;
    if (item.image) {
      const imgEntry = zip.getEntry(item.image);
      if (imgEntry) {
        const imgExt = path.extname(item.image) || IMAGE_EXTENSION;
        newImage = `${newId}${imgExt}`;
        fs.writeFileSync(path.join(LIBRARY_DIR, newImage), imgEntry.getData());
      }
    }

    currentData.items.push({
      id: newId,
      name: item.name,
      filename: newFilename,
      volume: item.volume ?? VOLUME_ITEM_DEFAULT,
      hotkey: item.hotkey ?? null,
      backupEnabled: item.backupEnabled ?? true,
      image: newImage,
      favorite: item.favorite ?? false
    });
    existingNames.add(item.name);
    added++;
  }

  // Import sections with remapped IDs
  for (const section of importedSections) {
    const newSectionId = generateId();
    const remappedItemIds = _.compact(_.map(section.itemIds, (oldId: string) => idMap[oldId]));
    if (!_.isEmpty(remappedItemIds)) {
      currentData.sections.push({ id: newSectionId, name: section.name, itemIds: remappedItemIds });
    }
  }

  saveLibraryIndex(currentData);
  return { success: true, added, total: currentData.items.length };
}

// --- Unified Import ---

export async function importInspect() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import',
    filters: [
      { name: 'SoundDome Files', extensions: [EXPORT_FILE_EXTENSION, SETTINGS_EXPORT_FILE_EXTENSION] },
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
      const importedSections: Section[] = Array.isArray(importedRaw) ? [] : (importedRaw.sections ?? []);

      const currentData = loadLibraryIndex();
      const existingNames = new Set(_.map(currentData.items, 'name'));
      const newSounds = _.reject(importedItems, (item: LibraryItem) => existingNames.has(item.name)).length;

      return {
        type: 'library' as const,
        filePath,
        library: {
          totalSounds: importedItems.length,
          newSounds,
          sections: importedSections.length,
        }
      };
    } else {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      const keys = Object.keys(CONFIG_DEFAULTS);
      const validKeys = _.filter(keys, (k: string) => parsed[k] !== undefined);

      return {
        type: 'settings' as const,
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

// --- Section CRUD ---

export function createSection(name: string): Section {
  const data = loadLibraryIndex();
  const section: Section = { id: generateId(), name, itemIds: [] };
  data.sections.push(section);
  saveLibraryIndex(data);
  return section;
}

export function updateSection(id: string, updates: Record<string, unknown>): Section | null {
  const data = loadLibraryIndex();
  const section = _.find(data.sections, { id });
  if (!section) return null;

  const patch = _.pick(updates, ['name', 'itemIds']);
  Object.assign(section, patch);
  saveLibraryIndex(data);
  return section;
}

export function deleteSection(id: string): boolean {
  const data = loadLibraryIndex();
  data.sections = _.reject(data.sections, { id });
  saveLibraryIndex(data);
  return true;
}

export function reorderSections(orderedIds: string[]): boolean {
  const data = loadLibraryIndex();
  const byId = _.keyBy(data.sections, 'id');
  data.sections = _.compact(_.map(orderedIds, (id: string) => byId[id]));
  saveLibraryIndex(data);
  return true;
}
