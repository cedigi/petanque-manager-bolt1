const DEFAULT_MAX_ACTIVATIONS = 1;
const DEFAULT_MONTHLY_REALLOCATIONS = 1;
const DEFAULT_RATE_LIMIT_MAX = 10;
const DEFAULT_RATE_LIMIT_WINDOW = 60_000;

function readNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value <= 0) {
    return fallback;
  }
  return value;
}

export interface LicenseRuntimeConfig {
  secret: string;
  maxActivations: number;
  monthlyReallocationLimit: number;
  rateLimitMaxRequests: number;
  rateLimitWindowMs: number;
}

export function getLicenseRuntimeConfig(): LicenseRuntimeConfig {
  const secret = process.env.LICENSE_SECRET ?? '';
  return {
    secret,
    maxActivations: readNumberEnv('MAX_ACTIVATIONS', DEFAULT_MAX_ACTIVATIONS),
    monthlyReallocationLimit: readNumberEnv('MAX_REALLOCATIONS_PER_MONTH', DEFAULT_MONTHLY_REALLOCATIONS),
    rateLimitMaxRequests: readNumberEnv('RATE_LIMIT_MAX_REQUESTS', DEFAULT_RATE_LIMIT_MAX),
    rateLimitWindowMs: readNumberEnv('RATE_LIMIT_WINDOW_MS', DEFAULT_RATE_LIMIT_WINDOW),
  };
}
