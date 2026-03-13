const path = require('path');
const fs = require('fs');

import _ from 'lodash';
import { BACKUP_SUFFIX } from '../../src/enums/constants';
import { LIBRARY_DIR, loadLibraryIndex } from './helpers';

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

// --- Backup operations ---

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
