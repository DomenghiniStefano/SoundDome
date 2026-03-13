/// <reference types="electron" />

import { IpcChannel } from '../../src/enums/ipc';
import { broadcastExcludingSender } from '../broadcast';
import { silentRefreshKeys } from '../streamdeck/display';
import { registerHotkeys } from '../hotkeys';
import { safeHandle } from '../logger';

type SyncOptions = {
  broadcast?: boolean;
  broadcastChannel?: string;
  broadcastWhen?: (result: unknown) => boolean;
  refreshKeys?: boolean;
  refreshHotkeys?: boolean;
};

export function safeHandleWithSync<T extends unknown[]>(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: T) => unknown,
  options: SyncOptions,
): void {
  safeHandle(channel, async (event: Electron.IpcMainInvokeEvent, ...args: T) => {
    const result = await handler(event, ...args);

    const shouldBroadcast = options.broadcast || (options.broadcastWhen && options.broadcastWhen(result));
    if (shouldBroadcast) {
      broadcastExcludingSender(options.broadcastChannel || IpcChannel.LIBRARY_CHANGED, event.sender);
    }

    if (options.refreshKeys) silentRefreshKeys();
    if (options.refreshHotkeys) registerHotkeys();

    return result;
  });
}
