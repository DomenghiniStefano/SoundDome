/// <reference types="electron" />
const { app } = require('electron');
const path = require('path');

export function getAssetPath(...segments: string[]): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', ...segments);
  }
  return path.join(__dirname, '../../assets', ...segments);
}

export function getPreloadPath(): string {
  return path.join(__dirname, '../preload/preload.js');
}
