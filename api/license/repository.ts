import { randomUUID } from 'crypto';
import type { SqliteDatabase } from '../../db/client';
import type { ActivationRecord, LicenseRecord } from './types';

export function findLicenseByKey(db: SqliteDatabase, licenseKey: string): LicenseRecord | undefined {
  return db.prepare<unknown[], LicenseRecord>('SELECT * FROM licenses WHERE license_key = ?').get(licenseKey);
}

export function listActivations(db: SqliteDatabase, licenseId: string): ActivationRecord[] {
  return db
    .prepare<unknown[], ActivationRecord>('SELECT * FROM activations WHERE license_id = ? ORDER BY last_activated_at DESC')
    .all(licenseId);
}

export function findActivation(db: SqliteDatabase, licenseId: string, deviceId: string): ActivationRecord | undefined {
  return db
    .prepare<unknown[], ActivationRecord>('SELECT * FROM activations WHERE license_id = ? AND device_id = ?')
    .get(licenseId, deviceId);
}

export function countActivations(db: SqliteDatabase, licenseId: string): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM activations WHERE license_id = ?').get(licenseId) as { count: number };
  return row?.count ?? 0;
}

export function touchActivation(db: SqliteDatabase, activationId: string, timestamp: Date) {
  db.prepare('UPDATE activations SET last_activated_at = ? WHERE id = ?').run(timestamp.toISOString(), activationId);
}

export function insertActivation(db: SqliteDatabase, licenseId: string, deviceId: string, timestamp: Date): ActivationRecord {
  const id = randomUUID();
  db
    .prepare('INSERT INTO activations (id, license_id, device_id, first_activated_at, last_activated_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, licenseId, deviceId, timestamp.toISOString(), timestamp.toISOString());
  return {
    id,
    license_id: licenseId,
    device_id: deviceId,
    first_activated_at: timestamp.toISOString(),
    last_activated_at: timestamp.toISOString(),
  };
}

export function deleteActivation(db: SqliteDatabase, licenseId: string, deviceId: string): boolean {
  const result = db.prepare('DELETE FROM activations WHERE license_id = ? AND device_id = ?').run(licenseId, deviceId);
  return result.changes > 0;
}

export function logReallocation(db: SqliteDatabase, licenseId: string, deviceId: string, timestamp: Date) {
  const id = randomUUID();
  db
    .prepare('INSERT INTO realloc_logs (id, license_id, device_id, created_at) VALUES (?, ?, ?, ?)')
    .run(id, licenseId, deviceId, timestamp.toISOString());
}

function startOfMonth(date: Date): string {
  const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  return monthStart.toISOString();
}

export function countReallocationsThisMonth(db: SqliteDatabase, licenseId: string, now: Date): number {
  const row = db
    .prepare(
      'SELECT COUNT(*) as count FROM realloc_logs WHERE license_id = ? AND created_at >= ?'
    )
    .get(licenseId, startOfMonth(now)) as { count: number };
  return row?.count ?? 0;
}
