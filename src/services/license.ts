import { callFn } from '../lib/supaFn';

export type LicenseStatus = {
  hasLicense: boolean;
  licenseKeyMasked?: string;
  plan?: string;
  status?: string;
  expiresAt?: string | null;
  activations?: { count: number; max: number };
};

export async function loadLicenseCards(): Promise<LicenseStatus> {
  return callFn<LicenseStatus>('license-status');
}

export async function activateLicense(key: string, deviceId: string) {
  key = key.trim();
  if (!key) throw new Error('Clé vide');
  return callFn<{ token: string; license: any }>('license-activate', { key, deviceId });
}
