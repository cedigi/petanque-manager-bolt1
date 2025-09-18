const HARDWARE_HASH_STORAGE_KEY = 'petanque-manager.hardware-hash';

let hardwareHashCache: string | null = null;

async function readHardwareHashFromBridge(): Promise<string | null> {
  if (!window.electronAPI?.getHardwareHash) {
    return null;
  }

  const hash = await window.electronAPI.getHardwareHash();
  return hash ?? null;
}

async function ensureHardwareHash(): Promise<string> {
  if (hardwareHashCache) {
    return hardwareHashCache;
  }

  const storage = typeof window !== 'undefined' ? window.localStorage : null;
  const stored = storage?.getItem(HARDWARE_HASH_STORAGE_KEY);
  if (stored) {
    hardwareHashCache = stored;
    return stored;
  }

  const bridgeHash = await readHardwareHashFromBridge();
  if (!bridgeHash) {
    throw new Error('Unable to obtain hardware fingerprint');
  }

  hardwareHashCache = bridgeHash;
  storage?.setItem(HARDWARE_HASH_STORAGE_KEY, bridgeHash);
  return bridgeHash;
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
  return postLicenseRequest(import.meta.env.VITE_LICENSE_ACTIVATION_URL, payload);
}

export async function fetchLicenseStatus(payload: Record<string, unknown> = {}) {
  return postLicenseRequest(import.meta.env.VITE_LICENSE_STATUS_URL, payload);
}

export async function getStoredHardwareHash() {
  if (hardwareHashCache) {
    return hardwareHashCache;
  }

  const storage = typeof window !== 'undefined' ? window.localStorage : null;
  const stored = storage?.getItem(HARDWARE_HASH_STORAGE_KEY);
  if (stored) {
    hardwareHashCache = stored;
    return stored;
  }

  const hash = await readHardwareHashFromBridge();
  if (hash) {
    hardwareHashCache = hash;
    storage?.setItem(HARDWARE_HASH_STORAGE_KEY, hash);
  }

  return hardwareHashCache;
}
