import type { SqliteDatabase } from '../../db/client';
import { getSharedDatabase } from '../../db/client';
import { consumeToken } from './rateLimiter';
import { deactivateLicense, LicenseServiceError } from './service';
import { getLicenseRuntimeConfig } from './config';
import type { DeactivationPayload, LicenseApiRequest, LicenseApiResponse } from './types';

interface HandlerOptions {
  db?: SqliteDatabase;
}

function coerceString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim();
  }
  return undefined;
}

function buildRateLimiterId(req: LicenseApiRequest<DeactivationPayload>): string {
  const rawKey = req.body?.licenseKey;
  const licenseKey = coerceString(Array.isArray(rawKey) ? rawKey[0] : rawKey) ?? 'unknown';
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = req.ip ?? (typeof forwarded === 'string' ? forwarded : Array.isArray(forwarded) ? forwarded[0] : 'unknown');
  return `deactivate:${ip}:${licenseKey}`;
}

export async function handler(
  req: LicenseApiRequest<DeactivationPayload>,
  options: HandlerOptions = {}
): Promise<LicenseApiResponse> {
  const runtimeConfig = getLicenseRuntimeConfig();
  const db = options.db ?? getSharedDatabase();

  if (req.method && !['POST', 'DELETE'].includes(req.method)) {
    return { status: 405, body: { error: 'METHOD_NOT_ALLOWED' } };
  }

  const licenseKey = coerceString(req.body?.licenseKey);
  const deviceId = coerceString(req.body?.deviceId);
  const signature = coerceString(req.body?.signature);
  const nonce = coerceString(req.body?.nonce);

  if (!licenseKey || !deviceId || !signature) {
    return { status: 400, body: { error: 'INVALID_REQUEST', message: 'licenseKey, deviceId and signature are required' } };
  }

  const rateResult = consumeToken(buildRateLimiterId(req), {
    limit: runtimeConfig.rateLimitMaxRequests,
    windowMs: runtimeConfig.rateLimitWindowMs,
  });
  if (!rateResult.allowed) {
    return {
      status: 429,
      body: {
        error: 'RATE_LIMITED',
        retryAfterMs: rateResult.retryAfterMs ?? runtimeConfig.rateLimitWindowMs,
      },
      headers: {
        'Retry-After': Math.ceil((rateResult.retryAfterMs ?? runtimeConfig.rateLimitWindowMs) / 1000).toString(),
      },
    };
  }

  try {
    const result = deactivateLicense(
      { db },
      {
        licenseKey: licenseKey.toUpperCase(),
        deviceId,
        signature,
        nonce: nonce ?? undefined,
      }
    );
    return {
      status: 200,
      body: {
        status: result.status,
        remainingReallocations: result.remainingReallocations,
      },
    };
  } catch (error) {
    if (error instanceof LicenseServiceError) {
      return {
        status: error.status,
        body: {
          error: error.code,
          message: error.message,
        },
      };
    }
    return { status: 500, body: { error: 'UNEXPECTED_ERROR' } };
  }
}

export default handler;
