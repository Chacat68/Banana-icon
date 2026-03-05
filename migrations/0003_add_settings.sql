-- D1 Migration: Add settings table
-- Run with: wrangler d1 execute banana-icon-db --file=./migrations/0003_add_settings.sql

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
