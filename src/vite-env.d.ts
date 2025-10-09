/// <reference types="vite/client" />

interface ElectronAPI {
  printHtml: (html: string) => Promise<void>;
  onPrintError: (callback: (message: string) => void) => void;
  getHardwareHash: () => Promise<string | null>;
}

interface Window {
  electronAPI?: ElectronAPI;
  electronAuth?: {
    onDeepLink: (cb: (url: string) => void) => void;
  };
}

interface ImportMetaEnv {
  readonly VITE_LICENSE_ACTIVATION_URL?: string;
  readonly VITE_LICENSE_STATUS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
