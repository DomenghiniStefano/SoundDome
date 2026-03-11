import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConfirmDialog } from '../../src/composables/useConfirmDialog';

describe('useConfirmDialog', () => {
  let dialog: ReturnType<typeof useConfirmDialog>;

  beforeEach(() => {
    dialog = useConfirmDialog();
  });

  describe('initial state', () => {
    it('starts with visible=false', () => {
      expect(dialog.visible.value).toBe(false);
    });

    it('starts with empty title and message', () => {
      expect(dialog.title.value).toBe('');
      expect(dialog.message.value).toBe('');
    });

    it('starts with undefined actions', () => {
      expect(dialog.actions.value).toBeUndefined();
    });
  });

  describe('show()', () => {
    it('sets visible, title, and message', () => {
      dialog.show('Delete?', 'Are you sure?', async () => {});
      expect(dialog.visible.value).toBe(true);
      expect(dialog.title.value).toBe('Delete?');
      expect(dialog.message.value).toBe('Are you sure?');
    });

    it('clears custom actions (resets to default confirm/cancel)', () => {
      // Set custom actions first
      dialog.showCustom('T', 'M', [{ label: 'X', event: 'x' }], {});
      expect(dialog.actions.value).toBeDefined();

      // show() should clear custom actions
      dialog.show('T2', 'M2', async () => {});
      expect(dialog.actions.value).toBeUndefined();
    });
  });

  describe('confirm()', () => {
    it('hides the dialog', async () => {
      dialog.show('T', 'M', async () => {});
      await dialog.confirm();
      expect(dialog.visible.value).toBe(false);
    });

    it('calls the confirm handler', async () => {
      const handler = vi.fn();
      dialog.show('T', 'M', handler);
      await dialog.confirm();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('clears handlers after confirm', async () => {
      const handler = vi.fn();
      dialog.show('T', 'M', handler);
      await dialog.confirm();
      // Second confirm should not call handler again
      await dialog.confirm();
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel()', () => {
    it('hides the dialog', async () => {
      dialog.show('T', 'M', async () => {});
      await dialog.cancel();
      expect(dialog.visible.value).toBe(false);
    });

    it('calls the cancel handler if provided', async () => {
      const cancelHandler = vi.fn();
      dialog.show('T', 'M', async () => {}, cancelHandler);
      await dialog.cancel();
      expect(cancelHandler).toHaveBeenCalledTimes(1);
    });

    it('does not error when no cancel handler provided', async () => {
      dialog.show('T', 'M', async () => {});
      await dialog.cancel(); // should not throw
    });

    it('clears handlers after cancel', async () => {
      const cancelHandler = vi.fn();
      dialog.show('T', 'M', async () => {}, cancelHandler);
      await dialog.cancel();
      await dialog.cancel();
      expect(cancelHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('showCustom()', () => {
    it('sets custom actions', () => {
      const customActions = [
        { label: 'Save', event: 'save' },
        { label: 'Discard', event: 'discard' },
      ];
      dialog.showCustom('Title', 'Message', customActions, {});
      expect(dialog.actions.value).toEqual(customActions);
      expect(dialog.visible.value).toBe(true);
    });
  });

  describe('onAction()', () => {
    it('hides the dialog', async () => {
      dialog.showCustom('T', 'M', [], { save: async () => {} });
      await dialog.onAction('save');
      expect(dialog.visible.value).toBe(false);
    });

    it('calls the matching handler', async () => {
      const saveHandler = vi.fn();
      const discardHandler = vi.fn();
      dialog.showCustom('T', 'M', [], {
        save: saveHandler,
        discard: discardHandler,
      });

      await dialog.onAction('save');
      expect(saveHandler).toHaveBeenCalledTimes(1);
      expect(discardHandler).not.toHaveBeenCalled();
    });

    it('does not error for unknown action event', async () => {
      dialog.showCustom('T', 'M', [], {});
      await dialog.onAction('unknown'); // should not throw
    });

    it('clears handlers after action', async () => {
      const handler = vi.fn();
      dialog.showCustom('T', 'M', [], { save: handler });
      await dialog.onAction('save');
      await dialog.onAction('save');
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
