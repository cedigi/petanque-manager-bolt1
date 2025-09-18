import fs from 'fs';
import path from 'path';
import DatabaseConstructor from 'better-sqlite3';
import type { Database } from 'better-sqlite3';

export type SqliteDatabase = Database;

let sharedDb: SqliteDatabase | undefined;
let sharedDbPath: string | undefined;

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function applyMigrations(db: SqliteDatabase) {
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schemaSql);
}

export function createDatabase(filename: string = process.env.DATABASE_URL ?? ':memory:'): SqliteDatabase {
  const db = new DatabaseConstructor(filename);
  db.pragma('foreign_keys = ON');
  applyMigrations(db);
  return db;
}

export function getSharedDatabase(): SqliteDatabase {
  const targetPath = process.env.DATABASE_URL ?? 'licenses.sqlite';
  if (!sharedDb || sharedDbPath !== targetPath) {
    if (sharedDb) {
      sharedDb.close();
    }
    sharedDb = createDatabase(targetPath);
    sharedDbPath = targetPath;
  }
  return sharedDb;
}

export function resetSharedDatabase() {
  if (sharedDb) {
    sharedDb.close();
  }
  sharedDb = undefined;
  sharedDbPath = undefined;
}
