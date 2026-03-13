/// <reference types="electron" />
const { BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

import { IMAGE_EXTENSIONS } from '../../src/enums/constants';
import { LIBRARY_DIR, ensureLibraryDir } from './helpers';

// --- Image operations ---

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
