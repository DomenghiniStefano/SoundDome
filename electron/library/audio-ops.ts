/// <reference types="electron" />
const { app, dialog, BrowserWindow } = require('electron');
const fluentFfmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

import { log } from '../logger';
import _ from 'lodash';
import { VOLUME_ITEM_DEFAULT, AUDIO_EXTENSION, SUPPORTED_AUDIO_EXTENSIONS, AUDIO_BITRATE, BACKUP_SUFFIX } from '../../src/enums/constants';
import { LIBRARY_DIR, loadLibraryIndex, saveLibraryIndex, ensureLibraryDir, generateId, downloadFile } from './helpers';
import type { LibraryItem } from './helpers';

// --- FFmpeg ---

function resolveFfmpegPath(): string {
  if (!app.isPackaged) return require('ffmpeg-static');
  const binary = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  return path.join(process.resourcesPath, binary);
}

function convertToMp3(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fluentFfmpeg(inputPath)
      .setFfmpegPath(resolveFfmpegPath())
      .outputOptions([`-b:a ${AUDIO_BITRATE}`])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run();
  });
}

// --- Sound operations ---

export async function saveSound({ name, url, slug }: { name: string; url: string; slug?: string }) {
  ensureLibraryDir();

  const data = loadLibraryIndex();
  const id = generateId();
  const filename = `${id}${AUDIO_EXTENSION}`;

  await downloadFile(url, path.join(LIBRARY_DIR, filename));

  const item = { id, name, filename, volume: VOLUME_ITEM_DEFAULT, hotkey: null, backupEnabled: true, image: null, favorite: false, slug: slug ?? null, sourceUrl: slug ? url : null };
  data.items.push(item);
  saveLibraryIndex(data);

  return item;
}

export async function resetSound(id: string): Promise<boolean> {
  const data = loadLibraryIndex();
  const item = _.find(data.items, { id });
  if (!item || !item.sourceUrl) return false;

  try {
    const mp3Path = path.join(LIBRARY_DIR, item.filename);
    await downloadFile(item.sourceUrl, mp3Path);
    return true;
  } catch (err) {
    log.error('Reset sound download failed:', err);
    return false;
  }
}

export async function uploadSounds(): Promise<{ items: LibraryItem[]; canceled?: boolean }> {
  const parentWindow = BrowserWindow.getFocusedWindow();
  const { canceled, filePaths } = await dialog.showOpenDialog(parentWindow, {
    title: 'Upload Sounds',
    filters: [{ name: 'Audio Files', extensions: SUPPORTED_AUDIO_EXTENSIONS }],
    properties: ['openFile', 'multiSelections']
  });
  if (canceled || filePaths.length === 0) return { items: [], canceled: true };

  ensureLibraryDir();

  const data = loadLibraryIndex();
  const newItems: LibraryItem[] = [];

  for (const filePath of filePaths) {
    const id = generateId();
    const filename = `${id}${AUDIO_EXTENSION}`;
    const destPath = path.join(LIBRARY_DIR, filename);
    const ext = path.extname(filePath).toLowerCase();

    if (ext === AUDIO_EXTENSION) {
      fs.copyFileSync(filePath, destPath);
    } else {
      await convertToMp3(filePath, destPath);
    }

    const name = path.basename(filePath, path.extname(filePath));
    const item: LibraryItem = { id, name, filename, volume: VOLUME_ITEM_DEFAULT, hotkey: null, backupEnabled: true, image: null, favorite: false };
    data.items.push(item);
    newItems.push(item);
  }

  saveLibraryIndex(data);
  return { items: newItems };
}

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
