// electron/main.cjs
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  // Détermine le chemin de l'app (dev versus prod packagée)
  const appPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar')
    : app.getAppPath();

  // Chemin vers index.html dans ou hors ASAR
  const indexPath = app.isPackaged
    ? path.join(appPath, 'dist', 'index.html')
    : 'http://localhost:3000';

  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'public', 'logo.ico')
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

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

ipcMain.handle('print-html', async (_event, html) => {
        codex/update-print-html-handler-logic
  const printWindow = new BrowserWindow({ show: false });
  await printWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
  );

  printWindow.once('ready-to-show', () => {
    printWindow.show();
    printWindow.webContents.print(
      { silent: false, printBackground: true },
      () => printWindow.close()
    );

  const printWindow = new BrowserWindow({ show: true });
  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  return new Promise((resolve) => {
    printWindow.webContents.print({ silent: false }, () => {
      printWindow.close();
      resolve();
    });
        main
  });
});

