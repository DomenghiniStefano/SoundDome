const path = require('path');
const fs = require('fs');

import _ from 'lodash';
import { VOLUME_ITEM_DEFAULT, BACKUP_SUFFIX } from '../../src/enums/constants';
import { LIBRARY_DIR, loadLibraryIndex, saveLibraryIndex, generateId } from './helpers';
import { getBackupFiles } from './backup-ops';
import type { LibraryItem, Group } from './helpers';

// --- Sound CRUD ---

export function listSounds() {
  const data = loadLibraryIndex();
  const items = _.map(data.items, (item: LibraryItem) => ({
    volume: VOLUME_ITEM_DEFAULT,
    hotkey: null,
    backupEnabled: true,
    image: null,
    favorite: false,
    slug: null,
    sourceUrl: null,
    ...item
  }));
  return { items, groups: data.groups };
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
  // Remove from all groups
  for (const group of data.groups) {
    group.itemIds = _.reject(group.itemIds, (itemId: string) => itemId === id);
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

// --- Group CRUD ---

export function createGroup(name: string): Group {
  const data = loadLibraryIndex();
  const group: Group = { id: generateId(), name, itemIds: [] };
  data.groups.push(group);
  saveLibraryIndex(data);
  return group;
}

export function updateGroup(id: string, updates: Record<string, unknown>): Group | null {
  const data = loadLibraryIndex();
  const group = _.find(data.groups, { id });
  if (!group) return null;

  const patch = _.pick(updates, ['name', 'itemIds']);
  Object.assign(group, patch);
  saveLibraryIndex(data);
  return group;
}

export function deleteGroup(id: string): boolean {
  const data = loadLibraryIndex();
  data.groups = _.reject(data.groups, { id });
  saveLibraryIndex(data);
  return true;
}

export function reorderGroups(orderedIds: string[]): boolean {
  const data = loadLibraryIndex();
  const byId = _.keyBy(data.groups, 'id');
  data.groups = _.compact(_.map(orderedIds, (id: string) => byId[id]));
  saveLibraryIndex(data);
  return true;
}
