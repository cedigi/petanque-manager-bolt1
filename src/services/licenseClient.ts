const DEVICE_STORAGE_KEY = 'pm.license.deviceId';
const DEVICE_COOKIE_NAME = 'pm_license_device';
const DEVICE_SALT = 'petanque-manager::license::v1';
const API_BASE_URL = '/api/license';

export type LicenseStatus = 'active' | 'invalid' | 'deactivated' | 'unregistered';

export interface LicenseDetails {
  status: LicenseStatus;
  email?: string;
  licenseKey?: string;
  licenseType?: string;
  expiresAt?: string;
  message?: string;
  deviceHash: string;
}

interface LicenseApiPayload {
  status?: string;
  email?: string;
  licenseKey?: string;
  licenseType?: string;
  expiresAt?: string;
  message?: string;
  [key: string]: unknown;
}

let cachedDeviceId: string | null = null;

const isBrowser = typeof window !== 'undefined';

function storageAvailable(): boolean {
  if (!isBrowser) {
    return false;
  }

  try {
    const testKey = '__pm_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const canUseLocalStorage = storageAvailable();

function ensureSalted(value: string): string {
  return value.includes(DEVICE_SALT) ? value : `${value}:${DEVICE_SALT}`;
}

function readCookie(name: string): string | null {
  if (!isBrowser) {
    return null;
  }

  const nameEq = `${name}=`;
  const decoded = decodeURIComponent(document.cookie ?? '');
  const parts = decoded.split(';');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(nameEq)) {
      return trimmed.substring(nameEq.length) || null;
    }
  }

  return null;
}

function writeCookie(name: string, value: string, days = 365 * 5) {
  if (!isBrowser) {
    return;
  }

  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Lax`;
}

function persistDeviceId(deviceId: string) {
  if (!isBrowser) {
    return;
  }

  const salted = ensureSalted(deviceId);

  if (canUseLocalStorage) {
    window.localStorage.setItem(DEVICE_STORAGE_KEY, salted);
  }

  writeCookie(DEVICE_COOKIE_NAME, salted);
  cachedDeviceId = salted;
}

function readPersistedDeviceId(): string | null {
  if (!isBrowser) {
    return null;
  }

  let stored: string | null = null;

  if (canUseLocalStorage) {
    stored = window.localStorage.getItem(DEVICE_STORAGE_KEY);
  }

  if (!stored) {
    stored = readCookie(DEVICE_COOKIE_NAME);
  }

  return stored ? ensureSalted(stored) : null;
}

function generateDeviceId(): string {
  const randomPart = (() => {
    if (isBrowser && typeof window.crypto !== 'undefined') {
      if (typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }

      const buffer = new Uint8Array(16);
      window.crypto.getRandomValues(buffer);
      return Array.from(buffer)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    }

    // Fallback to Math.random if crypto is unavailable (shouldn't happen in production)
    return `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  })();

  return ensureSalted(randomPart);
}

export function getDeviceId(): string {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  const persisted = readPersistedDeviceId();

  if (persisted) {
    cachedDeviceId = ensureSalted(persisted);
    // Refresh the persistence to ensure both storage and cookie are in sync
    persistDeviceId(cachedDeviceId);
    return cachedDeviceId;
  }

  const generated = generateDeviceId();
  persistDeviceId(generated);
  return generated;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function getHashedDeviceId(): Promise<string> {
  const id = getDeviceId();

  if (isBrowser && typeof window.crypto !== 'undefined' && window.crypto.subtle) {
    try {
      const data = new TextEncoder().encode(id);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      return bufferToHex(digest);
    } catch (error) {
      console.warn('Unable to hash device id using SubtleCrypto, falling back to raw id.', error);
    }
  }

  // Fallback: return the salted id as-is if hashing fails
  return id;
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.warn('Unable to parse license API response as JSON.', error);
    return null;
  }
}

function normalizeStatus(status: string | undefined, fallback: LicenseStatus): LicenseStatus {
  if (typeof status === 'string') {
    const normalized = status.toLowerCase();
    if (normalized === 'active' || normalized === 'invalid' || normalized === 'deactivated' || normalized === 'unregistered') {
      return normalized;
    }
  }

  return fallback;
}

function normalizeLicenseDetails(
  payload: LicenseApiPayload | null,
  deviceHash: string,
  defaults: Partial<LicenseDetails> = {}
): LicenseDetails {
  const statusFallback = defaults.status ?? 'unregistered';
  const normalizedStatus = normalizeStatus(payload?.status, statusFallback);

  return {
    status: normalizedStatus,
    email: typeof payload?.email === 'string' ? payload.email : defaults.email,
    licenseKey: typeof payload?.licenseKey === 'string' ? payload.licenseKey : defaults.licenseKey,
    licenseType: typeof payload?.licenseType === 'string' ? payload.licenseType : defaults.licenseType,
    expiresAt: typeof payload?.expiresAt === 'string' ? payload.expiresAt : defaults.expiresAt,
    message: typeof payload?.message === 'string' ? payload.message : defaults.message,
    deviceHash,
  };
}

function buildHeaders(): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

function extractErrorMessage(payload: LicenseApiPayload | null, fallback: string): string {
  if (payload?.message && typeof payload.message === 'string') {
    return payload.message;
  }

  return fallback;
}

export async function fetchLicenseDetails(): Promise<LicenseDetails> {
  const deviceHash = await getHashedDeviceId();

  try {
    const response = await fetch(`${API_BASE_URL}?deviceId=${encodeURIComponent(deviceHash)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status === 404) {
      return {
        status: 'unregistered',
        deviceHash,
      };
    }

    const payload = await parseJson<LicenseApiPayload>(response);

    if (!response.ok) {
      throw new Error(
        extractErrorMessage(payload, 'Impossible de récupérer les informations de licence.')
      );
    }

    return normalizeLicenseDetails(payload, deviceHash);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Impossible de contacter le serveur de licence.');
  }
}

export async function submitLicenseCredentials(
  email: string,
  licenseKey: string
): Promise<LicenseDetails> {
  const trimmedEmail = email.trim();
  const trimmedKey = licenseKey.trim();
  const deviceHash = await getHashedDeviceId();

  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      credentials: 'include',
      headers: buildHeaders(),
      body: JSON.stringify({
        email: trimmedEmail,
        licenseKey: trimmedKey,
        deviceId: deviceHash,
      }),
    });

    const payload = await parseJson<LicenseApiPayload>(response);

    if (!response.ok) {
      throw new Error(
        extractErrorMessage(payload, 'La clé de licence n\'a pas pu être validée.')
      );
    }

    return normalizeLicenseDetails(payload, deviceHash, {
      status: 'invalid',
      email: trimmedEmail,
      licenseKey: trimmedKey,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Une erreur est survenue lors de l\'enregistrement de la licence.');
  }
}

export async function requestLicenseReset(
  email: string,
  licenseKey: string
): Promise<string> {
  const trimmedEmail = email.trim();
  const trimmedKey = licenseKey.trim();
  const deviceHash = await getHashedDeviceId();

  try {
    const response = await fetch(`${API_BASE_URL}/reset`, {
      method: 'POST',
      credentials: 'include',
      headers: buildHeaders(),
      body: JSON.stringify({
        email: trimmedEmail,
        licenseKey: trimmedKey,
        deviceId: deviceHash,
      }),
    });

    const payload = await parseJson<LicenseApiPayload>(response);

    if (!response.ok) {
      throw new Error(
        extractErrorMessage(payload, 'La demande de réinitialisation a échoué.')
      );
    }

    return (
      (typeof payload?.message === 'string' && payload.message) ||
      'Votre demande de réinitialisation a été envoyée.'
    );
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Une erreur est survenue lors de la demande de réinitialisation.');
  }
}
