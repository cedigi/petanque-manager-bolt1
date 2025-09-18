import crypto from 'crypto';

const PREFIX = 'PM';
const GROUP_LENGTH = 4;
const GROUP_COUNT = 3;
const LICENSE_PATTERN = /^PM-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomChars(length: number, randomFn: (size: number) => Buffer): string {
  let output = '';
  while (output.length < length) {
    const needed = length - output.length;
    const buffer = randomFn(needed);
    for (const byte of buffer) {
      output += ALPHABET[byte % ALPHABET.length];
      if (output.length >= length) {
        break;
      }
    }
  }
  return output;
}

export function normalizeLicenseKey(key: string): string {
  return key.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function calculateLicenseChecksum(input: string): string {
  const normalized = normalizeLicenseKey(input);
  if (!normalized) {
    throw new Error('Cannot calculate checksum for empty input');
  }
  const total = normalized.split('').reduce((acc, char, index) => {
    const position = ALPHABET.indexOf(char);
    if (position === -1) {
      throw new Error(`Invalid character ${char} for checksum calculation`);
    }
    return acc + (position + 1) * (index + 1);
  }, 0);
  return ALPHABET[total % ALPHABET.length];
}

export function generateLicenseKey(randomFn: (size: number) => Buffer = crypto.randomBytes): string {
  const bodyLength = GROUP_LENGTH * GROUP_COUNT - 1; // reserve 1 for checksum
  const body = randomChars(bodyLength, randomFn);
  const checksum = calculateLicenseChecksum(`${PREFIX}${body}`);
  const full = `${body}${checksum}`;
  const groups = [
    full.slice(0, GROUP_LENGTH),
    full.slice(GROUP_LENGTH, GROUP_LENGTH * 2),
    full.slice(GROUP_LENGTH * 2, GROUP_LENGTH * 3),
  ];
  return `${PREFIX}-${groups.join('-')}`;
}

export function isValidLicenseKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }
  const upper = key.toUpperCase();
  if (!LICENSE_PATTERN.test(upper)) {
    return false;
  }
  const normalized = normalizeLicenseKey(upper);
  if (!normalized.startsWith(PREFIX)) {
    return false;
  }
  const payload = normalized.slice(0, -1);
  const checksum = normalized.slice(-1);
  try {
    const expected = calculateLicenseChecksum(payload);
    return checksum === expected;
  } catch {
    return false;
  }
}

export function maskLicenseKey(key: string): string {
  if (!isValidLicenseKey(key)) {
    return 'INVALID-KEY';
  }
  const upper = key.toUpperCase();
  const segments = upper.split('-');
  return `${segments[0]}-XXXX-XXXX-${segments[3]}`;
}
