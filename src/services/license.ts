import { supabase } from '../lib/supabase';
import { getDeviceId } from '../utils/deviceId';

export type LicenseStatus = {
  hasLicense: boolean;
  licenseKeyMasked?: string;
  plan?: string;
  status?: 'active'|'expired'|'revoked'|string;
  expiresAt?: string|null;
  activations?: { count: number; max: number };
};

export async function fetchLicenseStatus(): Promise<LicenseStatus> {
  const { data, error } = await supabase.rpc('api_license_status');
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data; // la fonction retourne 1 ligne
  if (!row) return { hasLicense: false };

  return {
    hasLicense: !!row.has_license,
    licenseKeyMasked: row.license_key_masked ?? undefined,
    plan: row.plan ?? undefined,
    status: row.status ?? undefined,
    expiresAt: row.expires_at ?? null,
    activations: (row.activations_count != null && row.max_devices != null)
      ? { count: Number(row.activations_count), max: Number(row.max_devices) }
      : undefined,
  };
}

export const loadLicenseCards = fetchLicenseStatus;

export async function activateLicense(inputKey: string) {
  const key = inputKey.trim();
  if (!key) throw new Error('Clé vide');
  const deviceId = getDeviceId();

  const { data, error } = await supabase.rpc('api_license_activate', {
    p_key: key,
    p_device: deviceId,
  });
  if (error) throw new Error(error.message);

  // data contient 1 ligne: { license_id, plan, status, expires_at, max_devices }
  return Array.isArray(data) ? data[0] : data;
}
