import type { SqliteDatabase } from '../../db/client';

export interface LicenseApiRequest<TBody = unknown> {
  method?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: TBody;
  query?: Record<string, string | string[]>;
}

export interface LicenseApiResponse<TBody = unknown> {
  status: number;
  body: TBody;
  headers?: Record<string, string>;
}

export interface LicenseRecord {
  id: string;
  account_id: string;
  license_key: string;
  max_activations: number;
  monthly_reallocation_limit: number;
  created_at: string;
  expires_at?: string | null;
}

export interface ActivationRecord {
  id: string;
  license_id: string;
  device_id: string;
  first_activated_at: string;
  last_activated_at: string;
}

export interface LicenseServiceContext {
  db: SqliteDatabase;
  now?: () => Date;
}

export interface ActivationPayload {
  licenseKey: string;
  deviceId: string;
  signature: string;
  nonce?: string;
}

export type DeactivationPayload = ActivationPayload;

export interface StatusPayload {
  licenseKey: string;
  deviceId: string;
  signature: string;
  nonce?: string;
}

export interface LicenseStatus {
  licenseKey: string;
  activations: number;
  maxActivations: number;
  devices: { deviceId: string; lastSeen: string }[];
  reallocationsThisMonth: number;
  monthlyReallocationLimit: number;
  isActiveOnDevice: boolean;
}
