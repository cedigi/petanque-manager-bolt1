/// <reference types="vite/client" />

interface ElectronAPI {
  printHtml: (html: string) => Promise<void>;
}

interface Window {
  electronAPI: ElectronAPI;
}
