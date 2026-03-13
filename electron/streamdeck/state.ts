import { AjazzDevice } from './device';
import { loadMappings, getPageButtons, getFolderPageButtons } from './mappings';
import { DEFAULT_BRIGHTNESS } from './constants';

let device: AjazzDevice | null = null;
let currentPage = 0;
let currentFolder: number | null = null; // null = top-level, number = folder index
let returnPage = 0; // page to return to when exiting folder
let brightness = DEFAULT_BRIGHTNESS;

export function getDevice(): AjazzDevice | null {
  return device;
}

export function setDevice(d: AjazzDevice | null): void {
  device = d;
}

export function isDeviceConnected(): boolean {
  return device !== null && device.isConnected();
}

export function getCurrentPage(): number {
  return currentPage;
}

export function setCurrentPage(page: number): void {
  currentPage = Math.max(0, page);
}

export function getCurrentFolder(): number | null {
  return currentFolder;
}

export function setCurrentFolder(folder: number | null): void {
  currentFolder = folder;
}

export function getReturnPage(): number {
  return returnPage;
}

export function setReturnPage(page: number): void {
  returnPage = page;
}

export function getBrightness(): number {
  return brightness;
}

export function setDeviceBrightness(value: number): void {
  brightness = Math.max(0, Math.min(100, value));
  if (device && device.isConnected()) {
    device.setBrightness(brightness);
  }
}

export function isInsideFolder(): boolean {
  return currentFolder !== null;
}

// Get buttons for the current context (top-level page or folder page)
export function getCurrentButtons() {
  const mappings = loadMappings();
  if (currentFolder !== null) {
    return getFolderPageButtons(mappings, currentFolder, currentPage);
  }
  return getPageButtons(mappings, currentPage);
}

// Get page count for current context
export function getPageCount(): number {
  const mappings = loadMappings();
  if (currentFolder !== null) {
    const folder = mappings.folders[currentFolder];
    return folder ? folder.pages.length : 0;
  }
  return mappings.pages.length;
}
