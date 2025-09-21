const HARDWARE_HASH_STORAGE_KEY = 'petanque-manager.hardware-hash';

let hardwareHashCache: string | null = null;
let importMetaEnvCache: ImportMetaEnv | null | undefined;

type EnvKey = keyof ImportMetaEnv;

function readImportMetaEnv(): ImportMetaEnv | undefined {
  if (importMetaEnvCache !== undefined) {
    return importMetaEnvCache ?? undefined;
  }

  try {
    importMetaEnvCache = (Function('return import.meta.env')() as ImportMetaEnv | null) ?? null;
  } catch {
    importMetaEnvCache = null;
  }

  return importMetaEnvCache ?? undefined;
}

function getEnvValue(key: EnvKey): string | undefined {
  const globalEnv = (globalThis as typeof globalThis & {
    __VITE_ENV__?: Partial<ImportMetaEnv>;
  }).__VITE_ENV__;

  if (globalEnv?.[key] !== undefined) {
    return globalEnv[key];
  }

  const env = readImportMetaEnv();
  return env?.[key];
}

async function readHardwareHashFromBridge(): Promise<string | null> {
  if (!window.electronAPI?.getHardwareHash) {
    return null;
  }

  const hash = await window.electronAPI.getHardwareHash();
  return hash ?? null;
}

function persistHardwareHash(hash: string, storage: Storage | null) {
  hardwareHashCache = hash;
  if (storage && storage.getItem(HARDWARE_HASH_STORAGE_KEY) !== hash) {
    storage.setItem(HARDWARE_HASH_STORAGE_KEY, hash);
  }
}

async function ensureHardwareHash(): Promise<string> {
  const storage = typeof window !== 'undefined' ? window.localStorage : null;

  const bridgeHash = await readHardwareHashFromBridge();
  if (bridgeHash) {
    persistHardwareHash(bridgeHash, storage);
    return bridgeHash;
  }

  if (hardwareHashCache) {
    return hardwareHashCache;
  }

  const stored = storage?.getItem(HARDWARE_HASH_STORAGE_KEY);
  if (stored) {
    hardwareHashCache = stored;
    return stored;
  }

  throw new Error('Unable to obtain hardware fingerprint');
}

async function postLicenseRequest(
  endpoint: string | undefined,
  payload: Record<string, unknown>
) {
  if (!endpoint) {
    throw new Error('Missing license endpoint configuration');
  }

  const hardwareHash = await ensureHardwareHash();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...payload,
      hardwareHash
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || 'License request failed');
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export async function activateLicense(payload: Record<string, unknown>) {
  return postLicenseRequest(getEnvValue('VITE_LICENSE_ACTIVATION_URL'), payload);
}

export async function fetchLicenseStatus(payload: Record<string, unknown> = {}) {
  return postLicenseRequest(getEnvValue('VITE_LICENSE_STATUS_URL'), payload);
}

export async function getStoredHardwareHash() {
  const storage = typeof window !== 'undefined' ? window.localStorage : null;

  const bridgeHash = await readHardwareHashFromBridge();
  if (bridgeHash) {
    persistHardwareHash(bridgeHash, storage);
    return bridgeHash;
  }

  if (hardwareHashCache) {
    return hardwareHashCache;
  }

  const stored = storage?.getItem(HARDWARE_HASH_STORAGE_KEY);
  if (stored) {
    hardwareHashCache = stored;
    return stored;
  }

  return null;
}
