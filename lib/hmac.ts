import crypto from 'crypto';

export function createSignaturePayload(licenseKey: string, deviceId: string, nonce?: string): string {
  if (!licenseKey || !deviceId) {
    throw new Error('licenseKey and deviceId are required to build signature payload');
  }
  const normalizedNonce = nonce ? `:${nonce}` : '';
  return `${licenseKey}:${deviceId}${normalizedNonce}`;
}

export function signLicensePayload(payload: string, secret: string): string {
  if (!secret) {
    throw new Error('Missing LICENSE_SECRET environment variable');
  }
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) {
    return false;
  }
  if (!signature) {
    return false;
  }
  const expected = signLicensePayload(payload, secret);
  try {
    const expectedBuffer = Buffer.from(expected, 'hex');
    const providedBuffer = Buffer.from(signature, 'hex');
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}
