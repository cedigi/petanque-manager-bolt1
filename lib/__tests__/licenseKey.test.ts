/** @jest-environment node */

import crypto from 'crypto';
import {
  calculateLicenseChecksum,
  generateLicenseKey,
  isValidLicenseKey,
  maskLicenseKey,
  normalizeLicenseKey,
} from '../licenseKey';
import { createSignaturePayload, signLicensePayload, verifySignature } from '../hmac';

describe('license key utilities', () => {
  test('generateLicenseKey produces a valid key with checksum', () => {
    const key = generateLicenseKey(crypto.randomBytes);
    expect(key).toMatch(/^PM-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(isValidLicenseKey(key)).toBe(true);
  });

    test('normalizeLicenseKey removes extraneous characters', () => {
      expect(normalizeLicenseKey('pm-abcd-efgh-jklm')).toBe('PMABCDEFGHJKLM');
    });

  test('calculateLicenseChecksum is deterministic', () => {
    const payload = 'PMABCDEFGHJKLM';
    const checksum = calculateLicenseChecksum(payload);
    expect(checksum).toHaveLength(1);
    expect(calculateLicenseChecksum(payload)).toBe(checksum);
  });

  test('isValidLicenseKey rejects keys with wrong checksum', () => {
    const key = generateLicenseKey(crypto.randomBytes);
    const tampered = key.replace(/.$/, (char) => (char === 'A' ? 'B' : 'A'));
    expect(isValidLicenseKey(tampered)).toBe(false);
  });

  test('maskLicenseKey redacts middle segments', () => {
    const key = generateLicenseKey(crypto.randomBytes);
    const masked = maskLicenseKey(key);
    const segments = key.split('-');
    expect(masked).toBe(`PM-XXXX-XXXX-${segments[3]}`);
  });

  test('HMAC utilities produce verifiable signatures', () => {
    const payload = createSignaturePayload('PM-1234-5678-9ABC', 'device-1');
    const secret = 'super-secret';
    const signature = signLicensePayload(payload, secret);
    expect(verifySignature(payload, signature, secret)).toBe(true);
    expect(verifySignature(payload, signature.slice(0, -1) + '0', secret)).toBe(false);
  });
});
