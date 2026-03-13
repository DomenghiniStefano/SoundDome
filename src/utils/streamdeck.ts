import _ from 'lodash';
import { StreamDeckActionType, MEDIA_ACTION_MAP } from '@/enums/streamdeck';

interface BuildMappingParams {
  selectedType: string;
  selectedItemId: string | null;
  selectedStatType: string;
  shortcutValue: string;
  appPathValue: string;
  buttonImage: string | null;
  customLabel: string;
  selectedFolderIndex: number;
  selectedFolderIcon: string | null;
  libraryItems: LibraryItem[];
  folders: Array<{ name: string }>;
}

export function buildButtonMapping(params: BuildMappingParams): StreamDeckButtonMapping | null {
  if (params.selectedType === 'default') return null;

  const mapping: StreamDeckButtonMapping = {
    type: params.selectedType,
  };

  if (params.buttonImage) {
    mapping.image = params.buttonImage;
  }

  if (params.selectedType === StreamDeckActionType.SOUND && params.selectedItemId) {
    mapping.itemId = params.selectedItemId;
    const item = _.find(params.libraryItems, { id: params.selectedItemId });
    if (item) mapping.label = item.name;
  }

  if (params.selectedType === StreamDeckActionType.SYSTEM_STAT) {
    mapping.statType = params.selectedStatType;
  }

  if (params.selectedType === StreamDeckActionType.SHORTCUT) {
    mapping.shortcut = params.shortcutValue.trim();
    if (params.customLabel.trim()) {
      mapping.label = params.customLabel.trim();
    }
  }

  if (params.selectedType === StreamDeckActionType.LAUNCH_APP) {
    mapping.appPath = params.appPathValue.trim();
    if (params.customLabel.trim()) {
      mapping.label = params.customLabel.trim();
    }
  }

  if (params.selectedType === StreamDeckActionType.FOLDER) {
    mapping.folderIndex = params.selectedFolderIndex;
    if (params.selectedFolderIcon) {
      mapping.icon = params.selectedFolderIcon;
    }
    const folder = params.folders[params.selectedFolderIndex];
    if (folder) mapping.label = folder.name;
  }

  if (MEDIA_ACTION_MAP[params.selectedType]) {
    mapping.mediaAction = MEDIA_ACTION_MAP[params.selectedType];
  }

  return mapping;
}

export function canSaveButtonMapping(selectedType: string, selectedItemId: string | null, shortcutValue: string, appPathValue: string, folders: unknown[]): boolean {
  if (selectedType === StreamDeckActionType.SOUND && !selectedItemId) return false;
  if (selectedType === StreamDeckActionType.SHORTCUT && !shortcutValue.trim()) return false;
  if (selectedType === StreamDeckActionType.LAUNCH_APP && !appPathValue.trim()) return false;
  if (selectedType === StreamDeckActionType.FOLDER && _.isEmpty(folders)) return false;
  return true;
}
