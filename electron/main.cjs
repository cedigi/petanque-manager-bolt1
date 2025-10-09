// electron/main.cjs
const { app, BrowserWindow, ipcMain } = require('electron');
const crypto = require('crypto');
const path = require('path');
const si = require('systeminformation');

const APP_SALT = process.env.PM_APP_SALT || 'petanque-manager-license-salt';

let cachedHardwareHash = null;
let mainWindow = null;

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
  // Détermine le chemin de l'app (dev versus prod packagée)
  const appPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar')
    : app.getAppPath();

  // Chemin vers index.html dans ou hors ASAR
  const indexPath = app.isPackaged
    ? path.join(appPath, 'dist', 'index.html')
    : 'http://localhost:3000';

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'logo.ico')
      : path.join(appPath, 'public', 'logo.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  if (app.isPackaged) {
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL(indexPath);
  }
}

try { app.setAsDefaultProtocolClient('pm'); } catch {}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); } else {
  app.on('second-instance', (_e, argv) => {
    const link = argv.find(a => a.startsWith('pm://'));
    if (link && mainWindow) mainWindow.webContents.send('deeplink', link);
  });
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) mainWindow.webContents.send('deeplink', url);
});

app.whenReady().then(createWindow);
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

