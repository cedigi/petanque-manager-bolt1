// electron/main.cjs
const { app, BrowserWindow, ipcMain } = require('electron');
const crypto = require('crypto');
const path = require('path');
const si = require('systeminformation');

const APP_SALT = process.env.PM_APP_SALT || 'petanque-manager-license-salt';

let cachedHardwareHash = null;
let mainWindow = null;
let pendingDeepLink = null;

function dispatchDeepLink(url) {
  if (!url) return;
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    mainWindow.webContents.send('deep-link', url);
  } else {
    pendingDeepLink = url;
  }
}

function flushPendingDeepLink() {
  if (pendingDeepLink) {
    const url = pendingDeepLink;
    pendingDeepLink = null;
    dispatchDeepLink(url);
  }
}

async function collectHardwareIdentifiers() {
  const [uuidData, networkInterfaces, biosData, cpuData, diskLayout] = await Promise.all([
    si.uuid().catch(() => null),
    si.networkInterfaces().catch(() => []),
    si.bios().catch(() => ({})),
    si.cpu().catch(() => ({})),
    si.diskLayout().catch(() => [])
  ]);

  const primaryInterface = (networkInterfaces || []).find((iface) => {
    if (!iface) {
      return false;
    }
    const mac = iface.mac || '';
    const normalizedMac = mac.replace(/:/g, '').toLowerCase();
    const invalidMac = !normalizedMac || normalizedMac === '000000000000';
    return !iface.internal && !iface.virtual && !invalidMac;
  });

  const volumeIdFromUuid = uuidData?.disk || uuidData?.hardware || uuidData?.os;
  const volumeIdFromDisk = (diskLayout || []).find((disk) => disk?.serialNum)?.serialNum;

  const identifiers = {
    volumeId: volumeIdFromDisk || volumeIdFromUuid || '',
    primaryMac: primaryInterface?.mac || (uuidData?.macs ? uuidData.macs.split(',')[0] : ''),
    bios: {
      vendor: biosData?.vendor || '',
      version: biosData?.version || '',
      serial: biosData?.serial || '',
      releaseDate: biosData?.releaseDate || ''
    },
    cpu: {
      manufacturer: cpuData?.manufacturer || '',
      brand: cpuData?.brand || '',
      family: cpuData?.family || '',
      model: cpuData?.model || '',
      stepping: cpuData?.stepping || '',
      serial: cpuData?.serial || ''
    }
  };

  return identifiers;
}

function hashHardwareIdentifiers(identifiers) {
  const normalized = JSON.stringify(identifiers);
  const salted = `${APP_SALT}::${normalized}`;
  return crypto.createHash('sha256').update(salted).digest('hex');
}

async function getHardwareHash() {
  if (cachedHardwareHash) {
    return cachedHardwareHash;
  }

  try {
    const identifiers = await collectHardwareIdentifiers();
    const hash = hashHardwareIdentifiers(identifiers);
    cachedHardwareHash = hash;
    return hash;
  } catch (error) {
    console.error('Failed to generate hardware hash', error);
    return null;
  }
}

function createWindow() {
  const appPath = app.getAppPath();
  const resourcesPath = app.isPackaged ? process.resourcesPath : appPath;

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    icon: app.isPackaged
      ? path.join(resourcesPath, 'logo.ico')
      : path.join(appPath, 'public', 'logo.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

  if (app.isPackaged) {
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL(devServerUrl);
  }

  mainWindow.webContents.on('did-finish-load', flushPendingDeepLink);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); } else {
  app.on('second-instance', (_e, argv) => {
    const link = argv.find(a => a.startsWith('pm://'));
    dispatchDeepLink(link);
  });
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  dispatchDeepLink(url);
});

app.whenReady().then(() => {
  try {
    app.setAsDefaultProtocolClient('pm');
  } catch (error) {
    console.warn('Failed to register pm protocol', error);
  }

  createWindow();
});

const initialLink = process.argv.find((arg) => arg.startsWith('pm://'));
dispatchDeepLink(initialLink);
app.on('window-all-closed', () => app.quit());

ipcMain.handle('print-html', async (event, html) => {
  const printWindow = new BrowserWindow({ show: false });

  printWindow.webContents.once('did-finish-load', () => {
    printWindow.show();
    try {
      printWindow.webContents.print(
        { silent: false, printBackground: true },
        () => printWindow.close()
      );
    } catch (err) {
      event.sender.send('print-error', err.message);
      printWindow.close();
    }
  });

  await printWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
  );
});

ipcMain.handle('get-hardware-hash', async () => {
  const hash = await getHardwareHash();
  return hash;
});

