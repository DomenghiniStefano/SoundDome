const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

import _ from 'lodash';
import {
  LIBRARY_INDEX_FILENAME,
  EXPORT_DEFAULT_FILENAME,
  EXPORT_FILE_EXTENSION,
  BACKUP_SUFFIX,
  VOLUME_ITEM_DEFAULT,
  AUDIO_EXTENSION,
  IMAGE_EXTENSION,
} from '../../src/enums/constants';
import { LIBRARY_DIR, LIBRARY_INDEX, loadLibraryIndex, saveLibraryIndex, ensureLibraryDir, generateId } from './helpers';
import { getBackupFiles } from './backup-ops';
import type { LibraryItem, Group } from './helpers';

const { dialog } = require('electron');

// --- Export ---

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

// --- Import ---

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
  const importedGroups: Group[] = Array.isArray(importedRaw) ? [] : (importedRaw.groups ?? importedRaw.sections ?? []);

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

  // Import groups with remapped IDs
  for (const group of importedGroups) {
    const newGroupId = generateId();
    const remappedItemIds = _.compact(_.map(group.itemIds, (oldId: string) => idMap[oldId]));
    if (!_.isEmpty(remappedItemIds)) {
      currentData.groups.push({ id: newGroupId, name: group.name, itemIds: remappedItemIds });
    }
  }

  saveLibraryIndex(currentData);
  return { success: true, added, total: currentData.items.length };
}
