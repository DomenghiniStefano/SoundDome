/// <reference types="electron" />
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

import { CONFIG_DEFAULTS } from '../src/enums/config-defaults';
import { CONFIG_FILENAME } from '../src/enums/constants';

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
