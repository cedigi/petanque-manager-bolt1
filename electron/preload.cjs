const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printHtml: (html) => ipcRenderer.invoke('print-html', html),
  onPrintError: (callback) => ipcRenderer.on('print-error', (_event, message) => callback(message)),
  getHardwareHash: () => ipcRenderer.invoke('get-hardware-hash')
});

contextBridge.exposeInMainWorld('deeplink', {
  onUrl(cb) {
    ipcRenderer.on('deeplink', (_e, url) => cb(url));
  }
});
