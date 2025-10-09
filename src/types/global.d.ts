export {};

type DeepLinkCallback = (url: string) => void;

declare global {
  interface Window {
    electronAuth?: { onDeepLink: (cb: DeepLinkCallback) => void };
  }
}
