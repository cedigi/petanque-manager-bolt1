import { isValidLicenseKey } from '../../lib/licenseKey';
import { createSignaturePayload, verifySignature } from '../../lib/hmac';
import { getLicenseRuntimeConfig } from './config';
import {
  countActivations,
  countReallocationsThisMonth,
  deleteActivation,
  findActivation,
  findLicenseByKey,
  insertActivation,
  listActivations,
  logReallocation,
  touchActivation,
} from './repository';
import type {
  ActivationPayload,
  DeactivationPayload,
  LicenseServiceContext,
  LicenseStatus,
  StatusPayload,
} from './types';

export class LicenseServiceError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
  }
}

function requireSecret(secret: string) {
  if (!secret) {
    throw new LicenseServiceError('LICENSE_SECRET is not configured', 'MISSING_SECRET', 500);
  }
}

function ensureValidLicenseKey(licenseKey: string) {
  if (!isValidLicenseKey(licenseKey)) {
    throw new LicenseServiceError('Invalid license key format', 'INVALID_LICENSE_KEY', 400);
  }
}

function assertSignature(licenseKey: string, deviceId: string, signature: string, secret: string, nonce?: string) {
  const payload = createSignaturePayload(licenseKey, deviceId, nonce);
  const valid = verifySignature(payload, signature, secret);
  if (!valid) {
    throw new LicenseServiceError('Signature verification failed', 'INVALID_SIGNATURE', 401);
  }
}

function resolveMaxActivations(recordValue: number, fallback: number): number {
  if (recordValue && recordValue > 0) {
    return recordValue;
  }
  return fallback;
}

function resolveMonthlyLimit(recordValue: number, fallback: number): number {
  if (recordValue && recordValue > 0) {
    return recordValue;
  }
  return fallback;
}

export function activateLicense(ctx: LicenseServiceContext, payload: ActivationPayload) {
  const config = getLicenseRuntimeConfig();
  requireSecret(config.secret);
  ensureValidLicenseKey(payload.licenseKey);
  const license = findLicenseByKey(ctx.db, payload.licenseKey);
  if (!license) {
    throw new LicenseServiceError('License not found', 'LICENSE_NOT_FOUND', 404);
  }
  assertSignature(payload.licenseKey, payload.deviceId, payload.signature, config.secret, payload.nonce);
  const now = ctx.now?.() ?? new Date();
  const existing = findActivation(ctx.db, license.id, payload.deviceId);
  if (existing) {
    touchActivation(ctx.db, existing.id, now);
    return {
      status: 'already_active' as const,
      activation: {
        ...existing,
        last_activated_at: now.toISOString(),
      },
    };
  }

  const maxActivations = resolveMaxActivations(license.max_activations, config.maxActivations);
  const currentActivations = countActivations(ctx.db, license.id);
  if (currentActivations >= maxActivations) {
    throw new LicenseServiceError('Activation quota reached', 'ACTIVATION_LIMIT', 409);
  }

  const activation = insertActivation(ctx.db, license.id, payload.deviceId, now);
  return {
    status: 'activated' as const,
    activation,
    remainingActivations: Math.max(maxActivations - (currentActivations + 1), 0),
  };
}

export function getLicenseStatus(ctx: LicenseServiceContext, payload: StatusPayload): LicenseStatus {
  const config = getLicenseRuntimeConfig();
  requireSecret(config.secret);
  ensureValidLicenseKey(payload.licenseKey);
  const license = findLicenseByKey(ctx.db, payload.licenseKey);
  if (!license) {
    throw new LicenseServiceError('License not found', 'LICENSE_NOT_FOUND', 404);
  }
  assertSignature(payload.licenseKey, payload.deviceId, payload.signature, config.secret, payload.nonce);
  const now = ctx.now?.() ?? new Date();
  const activations = listActivations(ctx.db, license.id);
  const maxActivations = resolveMaxActivations(license.max_activations, config.maxActivations);
  const reallocations = countReallocationsThisMonth(ctx.db, license.id, now);
  return {
    licenseKey: license.license_key,
    activations: activations.length,
    maxActivations,
    devices: activations.map((activation) => ({
      deviceId: activation.device_id,
      lastSeen: activation.last_activated_at,
    })),
    reallocationsThisMonth: reallocations,
    monthlyReallocationLimit: resolveMonthlyLimit(license.monthly_reallocation_limit, config.monthlyReallocationLimit),
    isActiveOnDevice: activations.some((activation) => activation.device_id === payload.deviceId),
  };
}

export function deactivateLicense(ctx: LicenseServiceContext, payload: DeactivationPayload) {
  const config = getLicenseRuntimeConfig();
  requireSecret(config.secret);
  ensureValidLicenseKey(payload.licenseKey);
  const license = findLicenseByKey(ctx.db, payload.licenseKey);
  if (!license) {
    throw new LicenseServiceError('License not found', 'LICENSE_NOT_FOUND', 404);
  }
  assertSignature(payload.licenseKey, payload.deviceId, payload.signature, config.secret, payload.nonce);
  const activation = findActivation(ctx.db, license.id, payload.deviceId);
  if (!activation) {
    throw new LicenseServiceError('Activation not found for device', 'ACTIVATION_NOT_FOUND', 404);
  }
  const now = ctx.now?.() ?? new Date();
  const limit = resolveMonthlyLimit(license.monthly_reallocation_limit, config.monthlyReallocationLimit);
  const reallocations = countReallocationsThisMonth(ctx.db, license.id, now);
  if (reallocations >= limit) {
    throw new LicenseServiceError('Monthly reallocation limit reached', 'REALLOCATION_LIMIT', 429);
  }
  deleteActivation(ctx.db, license.id, payload.deviceId);
  logReallocation(ctx.db, license.id, payload.deviceId, now);
  return {
    status: 'deactivated' as const,
    remainingReallocations: Math.max(limit - (reallocations + 1), 0),
  };
}
