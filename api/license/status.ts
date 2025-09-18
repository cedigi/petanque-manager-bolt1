import type { SqliteDatabase } from '../../db/client';
import { getSharedDatabase } from '../../db/client';
import { consumeToken } from './rateLimiter';
import { getLicenseRuntimeConfig } from './config';
import { getLicenseStatus as getLicenseStatusService, LicenseServiceError } from './service';
import type { LicenseApiRequest, LicenseApiResponse, StatusPayload } from './types';

interface HandlerOptions {
  db?: SqliteDatabase;
}

function coerceString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim();
  }
  return undefined;
}

function buildRateLimiterId(req: LicenseApiRequest<StatusPayload>): string {
  const rawKey = req.body?.licenseKey ?? req.query?.licenseKey;
  const licenseKey = coerceString(Array.isArray(rawKey) ? rawKey[0] : rawKey) ?? 'unknown';
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = req.ip ?? (typeof forwarded === 'string' ? forwarded : Array.isArray(forwarded) ? forwarded[0] : 'unknown');
  return `status:${ip}:${licenseKey}`;
}

export async function handler(
  req: LicenseApiRequest<StatusPayload>,
  options: HandlerOptions = {}
): Promise<LicenseApiResponse> {
  const runtimeConfig = getLicenseRuntimeConfig();
  const db = options.db ?? getSharedDatabase();

  if (req.method && !['POST', 'GET'].includes(req.method)) {
    return { status: 405, body: { error: 'METHOD_NOT_ALLOWED' } };
  }

  const licenseKey = coerceString(req.body?.licenseKey ?? (req.query?.licenseKey as string | undefined));
  const deviceId = coerceString(req.body?.deviceId ?? (req.query?.deviceId as string | undefined));
  const signature = coerceString(req.body?.signature ?? (req.query?.signature as string | undefined));
  const nonce = coerceString(req.body?.nonce ?? (req.query?.nonce as string | undefined));

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
    const status = getLicenseStatusService(
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
      body: status,
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
