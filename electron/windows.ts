/// <reference types="electron" />
const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

import { IpcChannel } from '../src/enums/ipc';
import { RoutePath } from '../src/enums/routes';
import {
  CLI_ARG_HIDDEN,
  MAIN_WINDOW_WIDTH,
  MAIN_WINDOW_HEIGHT,
  MAIN_WINDOW_MIN_WIDTH,
  MAIN_WINDOW_MIN_HEIGHT,
  WIDGET_WINDOW_WIDTH,
  WIDGET_WINDOW_HEIGHT,
  WIDGET_WINDOW_MIN_WIDTH,
  WIDGET_WINDOW_MIN_HEIGHT,
  WIDGET_OFFSET_X,
  WIDGET_OFFSET_Y,
} from '../src/enums/constants';
import { getAssetPath, getPreloadPath } from './paths';

let tray: typeof Tray | null = null;
let mainWindow: typeof BrowserWindow | null = null;
let widgetWindow: typeof BrowserWindow | null = null;
let widgetWasActive = false;
let isQuitting = false;

export function getMainWindow(): typeof BrowserWindow | null {
  return mainWindow;
}

export function getWidgetWindow(): typeof BrowserWindow | null {
  return widgetWindow;
}

export function setQuitting(value: boolean) {
  isQuitting = value;
}

function getIconPath() {
  return getAssetPath('icons', 'icon.png');
}

export function createTray() {
  const icon = nativeImage.createFromPath(getIconPath()).resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip('SoundDome');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Apri SoundDome',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Esci',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

export function createWindow() {
  const startHidden = process.argv.includes(CLI_ARG_HIDDEN);
  mainWindow = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    minWidth: MAIN_WINDOW_MIN_WIDTH,
    minHeight: MAIN_WINDOW_MIN_HEIGHT,
    resizable: true,
    frame: false,
    show: !startHidden,
    icon: getIconPath(),
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send(IpcChannel.WINDOW_MAXIMIZE_CHANGE, true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send(IpcChannel.WINDOW_MAXIMIZE_CHANGE, false);
  });

  mainWindow.on('close', (e: Event) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('show', () => {
    if (widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible()) {
      widgetWasActive = true;
      widgetWindow.hide();
    }
  });

  mainWindow.on('hide', () => {
    if (widgetWasActive && widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.show();
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

export function createWidgetWindow(): typeof BrowserWindow {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show();
    widgetWindow.focus();
    return widgetWindow;
  }

  const mainBounds = mainWindow?.getBounds();
  const x = mainBounds ? mainBounds.x + mainBounds.width - WIDGET_OFFSET_X : undefined;
  const y = mainBounds ? mainBounds.y + WIDGET_OFFSET_Y : undefined;

  widgetWindow = new BrowserWindow({
    width: WIDGET_WINDOW_WIDTH,
    height: WIDGET_WINDOW_HEIGHT,
    x,
    y,
    minWidth: WIDGET_WINDOW_MIN_WIDTH,
    minHeight: WIDGET_WINDOW_MIN_HEIGHT,
    resizable: true,
    frame: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  widgetWindow.once('ready-to-show', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.show();
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    const baseUrl = process.env.ELECTRON_RENDERER_URL.replace(/\/$/, '');
    widgetWindow.loadURL(baseUrl + '/#' + RoutePath.WIDGET);
  } else {
    const filePath = path.join(__dirname, '../renderer/index.html');
    widgetWindow.loadURL(`file://${filePath}#${RoutePath.WIDGET}`);
  }

  widgetWindow.on('closed', () => {
    widgetWindow = null;
    widgetWasActive = false;
    notifyWidgetState(false);
  });

  return widgetWindow;
}

export function notifyWidgetState(isOpen: boolean) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IpcChannel.WIDGET_STATE_CHANGE, isOpen);
  }
}

export function toggleWidget(): boolean {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    if (widgetWindow.isVisible()) {
      widgetWindow.hide();
      widgetWasActive = false;
      notifyWidgetState(false);
      return false;
    } else {
      widgetWindow.show();
      widgetWasActive = true;
      notifyWidgetState(true);
      return true;
    }
  }
  createWidgetWindow();
  widgetWasActive = true;
  notifyWidgetState(true);
  return true;
}

export function closeWidget() {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.close();
  }
  widgetWasActive = false;
}

export function isWidgetOpen(): boolean {
  return !!(widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible());
}
