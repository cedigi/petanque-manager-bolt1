/// <reference types="vite/client" />

interface ElectronAPI {
  printHtml: (html: string) => Promise<void>;
  onPrintError: (callback: (message: string) => void) => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
