jest.mock('systeminformation', () => ({
  uuid: jest.fn(() =>
    Promise.resolve({
      disk: 'disk-uuid',
      hardware: 'hardware-uuid',
      os: 'os-uuid',
      macs: 'AA:BB:CC:DD:EE:FF,11:22:33:44:55:66'
    })
  ),
  networkInterfaces: jest.fn(() =>
    Promise.resolve([
      { mac: '00:00:00:00:00:00', internal: false, virtual: false },
      { mac: 'AA:BB:CC:DD:EE:FF', internal: false, virtual: false }
    ])
  ),
  bios: jest.fn(() =>
    Promise.resolve({
      vendor: 'ACME',
      version: '1.2',
      serial: 'BIOS123',
      releaseDate: '2024-01-01'
    })
  ),
  cpu: jest.fn(() =>
    Promise.resolve({
      manufacturer: 'Intel',
      brand: 'Core i7',
      family: 'i7',
      model: '123',
      stepping: '1',
      serial: 'CPU123'
    })
  ),
  diskLayout: jest.fn(() =>
    Promise.resolve([
      { serialNum: 'VOLUME123' }
    ])
  )
}));

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
      once: jest.fn((event, cb) => cb()),
      print: jest.fn(() => {
        throw new Error('boom');
      })
    }
  }));
  return { ipcMain, app, BrowserWindow };
});

import { ipcMain } from 'electron';
import { createHash } from 'crypto';

describe('print-html error handling', () => {
  test('sends print-error when printing fails', async () => {
    await import('./main.cjs');
    const handler = ipcMain.handle.mock.calls.find(c => c[0] === 'print-html')[1];
    const mockEvent = { sender: { send: jest.fn() } };

    await handler(mockEvent, '<html></html>');

    expect(mockEvent.sender.send).toHaveBeenCalledWith('print-error', 'boom');
  });
});

describe('hardware hash generation', () => {
  test('returns salted SHA-256 hash from system identifiers', async () => {
    await import('./main.cjs');
    const handler = ipcMain.handle.mock.calls.find(c => c[0] === 'get-hardware-hash')[1];

    const hash = await handler();

    const expectedIdentifiers = {
      volumeId: 'VOLUME123',
      primaryMac: 'AA:BB:CC:DD:EE:FF',
      bios: {
        vendor: 'ACME',
        version: '1.2',
        serial: 'BIOS123',
        releaseDate: '2024-01-01'
      },
      cpu: {
        manufacturer: 'Intel',
        brand: 'Core i7',
        family: 'i7',
        model: '123',
        stepping: '1',
        serial: 'CPU123'
      }
    };

    const expectedHash = createHash('sha256')
      .update(`petanque-manager-license-salt::${JSON.stringify(expectedIdentifiers)}`)
      .digest('hex');

    expect(hash).toBe(expectedHash);
  });
});
