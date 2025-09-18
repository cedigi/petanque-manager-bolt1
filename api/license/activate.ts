import type { SqliteDatabase } from '../../db/client';
import { getSharedDatabase } from '../../db/client';
import { consumeToken } from './rateLimiter';
import { activateLicense, LicenseServiceError } from './service';
import { getLicenseRuntimeConfig } from './config';
import type { ActivationPayload, LicenseApiRequest, LicenseApiResponse } from './types';

interface HandlerOptions {
  db?: SqliteDatabase;
}

function coerceString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim();
  }
  return undefined;
}

function buildRateLimiterId(req: LicenseApiRequest<ActivationPayload>): string {
  const licenseKey = coerceString(req.body?.licenseKey) ?? 'unknown';
  const ip = req.ip ?? (typeof req.headers?.['x-forwarded-for'] === 'string' ? req.headers?.['x-forwarded-for'] : 'unknown');
  return `activate:${ip}:${licenseKey}`;
}

export async function handler(
  req: LicenseApiRequest<ActivationPayload>,
  options: HandlerOptions = {}
): Promise<LicenseApiResponse> {
  const runtimeConfig = getLicenseRuntimeConfig();
  const db = options.db ?? getSharedDatabase();

  if (req.method && req.method !== 'POST') {
    return { status: 405, body: { error: 'METHOD_NOT_ALLOWED' } };
  }

  const licenseKey = coerceString(req.body?.licenseKey);
  const deviceId = coerceString(req.body?.deviceId);
  const signature = coerceString(req.body?.signature);
  const nonce = coerceString(req.body?.nonce);

  if (!licenseKey || !deviceId || !signature) {
    return { status: 400, body: { error: 'INVALID_REQUEST', message: 'licenseKey, deviceId and signature are required' } };
  }

  const rateId = buildRateLimiterId(req);
  const rateResult = consumeToken(rateId, {
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
    const result = activateLicense(
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
        activation: {
          deviceId: result.activation.device_id,
          firstActivatedAt: result.activation.first_activated_at,
          lastActivatedAt: result.activation.last_activated_at,
        },
        ...(result.status === 'activated'
          ? { remainingActivations: result.remainingActivations }
          : {}),
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
    return {
      status: 500,
      body: { error: 'UNEXPECTED_ERROR' },
    };
  }
}

export default handler;
