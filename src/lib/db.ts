import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

let localDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export type Database = NonNullable<typeof localDb>;

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS style_profiles (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
  style TEXT NOT NULL, keywords TEXT NOT NULL, negative_words TEXT,
  parameters TEXT, reference_image_url TEXT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS generation_tasks (
  id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'queued',
  upstream_task_id TEXT,
  prompt TEXT NOT NULL, negative_prompt TEXT, reference_image_url TEXT,
  width INTEGER NOT NULL DEFAULT 512, height INTEGER NOT NULL DEFAULT 512,
  seed INTEGER, batch_size INTEGER NOT NULL DEFAULT 1, parameters TEXT,
  error_message TEXT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  style_profile_id TEXT REFERENCES style_profiles(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY, filename TEXT NOT NULL, original_url TEXT NOT NULL,
  processed_url TEXT, thumbnail_url TEXT,
  width INTEGER NOT NULL, height INTEGER NOT NULL,
  format TEXT NOT NULL DEFAULT 'png', prompt TEXT NOT NULL,
  seed INTEGER, tags TEXT, metadata TEXT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES generation_tasks(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/** Get the local SQLite database used for single-user development. */
export async function getDbFromContext() {
  if (!localDb) {
    const sqlite = new Database("local.db");
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    sqlite.exec(INIT_SQL);
    try {
      sqlite.exec("ALTER TABLE generation_tasks ADD COLUMN upstream_task_id TEXT");
    } catch {
      // Ignore if the column already exists in an existing local database.
    }
    localDb = drizzle(sqlite, { schema });
  }
  return localDb;
}
