jest.mock('electron', () => {
  const ipcMain = { handle: jest.fn() };
  const app = {
    isPackaged: false,
    whenReady: () => Promise.resolve(),
    on: jest.fn(),
    quit: jest.fn(),
    getAppPath: jest.fn(() => '')
  };
  const BrowserWindow = jest.fn().mockImplementation(() => ({
    loadURL: jest.fn().mockResolvedValue(undefined),
    once: jest.fn((event, cb) => cb()),
    show: jest.fn(),
    close: jest.fn(),
    webContents: {
      print: jest.fn(() => {
        throw new Error('boom');
      })
    }
  }));
  return { ipcMain, app, BrowserWindow };
});

import { ipcMain } from 'electron';

describe('print-html error handling', () => {
  test('sends print-error when printing fails', async () => {
    await import('./main.cjs');
    const handler = ipcMain.handle.mock.calls.find(c => c[0] === 'print-html')[1];
    const mockEvent = { sender: { send: jest.fn() } };

    await handler(mockEvent, '<html></html>');

    expect(mockEvent.sender.send).toHaveBeenCalledWith('print-error', 'boom');
  });
});
