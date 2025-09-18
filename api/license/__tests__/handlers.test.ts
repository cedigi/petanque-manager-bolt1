/** @jest-environment node */

import crypto from 'crypto';
import { createDatabase } from '../../../db/client';
import activateHandler from '../activate';
import deactivateHandler from '../deactivate';
import statusHandler from '../status';
import { clearRateLimiter } from '../rateLimiter';
import { createSignaturePayload, signLicensePayload } from '../../../lib/hmac';
import { generateLicenseKey } from '../../../lib/licenseKey';

const originalEnv = { ...process.env };

function seedLicense(db: ReturnType<typeof createDatabase>, licenseKey: string, overrides?: { maxActivations?: number; reallocLimit?: number }) {
  const accountId = crypto.randomUUID();
  const licenseId = crypto.randomUUID();
  db.prepare('INSERT INTO accounts (id, email, name) VALUES (?, ?, ?)').run(accountId, `${accountId}@example.com`, 'Test Account');
  db
    .prepare(
      'INSERT INTO licenses (id, account_id, license_key, max_activations, monthly_reallocation_limit) VALUES (?, ?, ?, ?, ?)'
    )
    .run(
      licenseId,
      accountId,
      licenseKey,
      overrides?.maxActivations ?? 1,
      overrides?.reallocLimit ?? 2
    );
  return { accountId, licenseId };
}

function signRequest(licenseKey: string, deviceId: string, nonce?: string) {
  const payload = createSignaturePayload(licenseKey, deviceId, nonce);
  return signLicensePayload(payload, process.env.LICENSE_SECRET ?? '');
}

beforeEach(() => {
  clearRateLimiter();
  Object.assign(process.env, originalEnv);
  process.env.LICENSE_SECRET = 'test-secret';
  process.env.MAX_ACTIVATIONS = '1';
  process.env.MAX_REALLOCATIONS_PER_MONTH = '2';
  process.env.RATE_LIMIT_MAX_REQUESTS = '100';
  process.env.RATE_LIMIT_WINDOW_MS = '60000';
});

afterAll(() => {
  Object.assign(process.env, originalEnv);
});

describe('license API handlers', () => {
  test('activates a license successfully', async () => {
    const db = createDatabase(':memory:');
    const licenseKey = generateLicenseKey(crypto.randomBytes);
    seedLicense(db, licenseKey, { maxActivations: 2 });
    const deviceId = 'device-1';
    const signature = signRequest(licenseKey, deviceId);

    const response = await activateHandler(
      { method: 'POST', body: { licenseKey, deviceId, signature } },
      { db }
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'activated' });

    const count = db.prepare('SELECT COUNT(*) as count FROM activations').get() as { count: number };
    expect(count.count).toBe(1);
    db.close();
  });

  test('rejects invalid license key', async () => {
    const db = createDatabase(':memory:');
    const response = await activateHandler(
      { method: 'POST', body: { licenseKey: 'INVALID', deviceId: 'device-1', signature: 'bad' } },
      { db }
    );
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'INVALID_LICENSE_KEY' });
    db.close();
  });

  test('refuses second activation when quota reached', async () => {
    const db = createDatabase(':memory:');
    const licenseKey = generateLicenseKey(crypto.randomBytes);
    seedLicense(db, licenseKey, { maxActivations: 1 });
    const signatureA = signRequest(licenseKey, 'device-1');
    const signatureB = signRequest(licenseKey, 'device-2');

    const first = await activateHandler(
      { method: 'POST', body: { licenseKey, deviceId: 'device-1', signature: signatureA } },
      { db }
    );
    expect(first.status).toBe(200);

    const second = await activateHandler(
      { method: 'POST', body: { licenseKey, deviceId: 'device-2', signature: signatureB } },
      { db }
    );
    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({ error: 'ACTIVATION_LIMIT' });
    db.close();
  });

  test('supports deactivation and reallocation within monthly limit', async () => {
    const db = createDatabase(':memory:');
    const licenseKey = generateLicenseKey(crypto.randomBytes);
    seedLicense(db, licenseKey, { maxActivations: 1, reallocLimit: 2 });

    const activationResponse = await activateHandler(
      { method: 'POST', body: { licenseKey, deviceId: 'device-1', signature: signRequest(licenseKey, 'device-1') } },
      { db }
    );
    expect(activationResponse.status).toBe(200);

    const deactivateResponse = await deactivateHandler(
      { method: 'POST', body: { licenseKey, deviceId: 'device-1', signature: signRequest(licenseKey, 'device-1') } },
      { db }
    );
    expect(deactivateResponse.status).toBe(200);

    const reactivation = await activateHandler(
      { method: 'POST', body: { licenseKey, deviceId: 'device-2', signature: signRequest(licenseKey, 'device-2') } },
      { db }
    );
    expect(reactivation.status).toBe(200);
    expect(reactivation.body).toMatchObject({ status: 'activated' });

    const status = await statusHandler(
      { method: 'POST', body: { licenseKey, deviceId: 'device-2', signature: signRequest(licenseKey, 'device-2') } },
      { db }
    );
    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({ activations: 1, reallocationsThisMonth: 1 });
    db.close();
  });

  test('prevents deactivation when monthly reallocation limit is exceeded', async () => {
    const db = createDatabase(':memory:');
    const licenseKey = generateLicenseKey(crypto.randomBytes);
    seedLicense(db, licenseKey, { maxActivations: 1, reallocLimit: 1 });

    await activateHandler(
      { method: 'POST', body: { licenseKey, deviceId: 'device-1', signature: signRequest(licenseKey, 'device-1') } },
      { db }
    );
    await deactivateHandler(
      { method: 'POST', body: { licenseKey, deviceId: 'device-1', signature: signRequest(licenseKey, 'device-1') } },
      { db }
    );
    await activateHandler(
      { method: 'POST', body: { licenseKey, deviceId: 'device-2', signature: signRequest(licenseKey, 'device-2') } },
      { db }
    );

    const blocked = await deactivateHandler(
      { method: 'POST', body: { licenseKey, deviceId: 'device-2', signature: signRequest(licenseKey, 'device-2') } },
      { db }
    );

    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ error: 'REALLOCATION_LIMIT' });
    db.close();
  });
});
