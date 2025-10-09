import { callFn } from '../lib/supaFn';
import { getDeviceId } from '../utils/deviceId';

export type LicenseStatus = {
  hasLicense: boolean;
  licenseKeyMasked?: string;
  plan?: string;
  status?: 'active' | 'expired' | 'revoked' | string;
  expiresAt?: string | null;
  activations?: { count: number; max: number };
};

export async function fetchLicenseStatus(): Promise<LicenseStatus> {
  return callFn<LicenseStatus>('license-status');
}

export async function activateLicense(inputKey: string) {
  const key = inputKey.trim();
  if (!key) throw new Error('Clé vide');
  const deviceId = getDeviceId();
  return callFn<{ token: string; license: unknown }>('license-activate', { key, deviceId });
}
