export {};

declare global {
  interface Window {
    deeplink?: { onUrl: (cb: (url: string)=>void) => void };
  }
}
