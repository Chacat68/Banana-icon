-- D1 Migration: Initial schema
-- Run with: wrangler d1 execute banana-icon-db --file=./migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS style_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  style TEXT NOT NULL,
  keywords TEXT NOT NULL,
  negative_words TEXT,
  parameters TEXT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generation_tasks (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'queued',
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  width INTEGER NOT NULL DEFAULT 512,
  height INTEGER NOT NULL DEFAULT 512,
  seed INTEGER,
  batch_size INTEGER NOT NULL DEFAULT 1,
  parameters TEXT,
  error_message TEXT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  style_profile_id TEXT REFERENCES style_profiles(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_url TEXT NOT NULL,
  processed_url TEXT,
  thumbnail_url TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  format TEXT NOT NULL DEFAULT 'png',
  prompt TEXT NOT NULL,
  seed INTEGER,
  tags TEXT,
  metadata TEXT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES generation_tasks(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_task ON assets(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON generation_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_styles_project ON style_profiles(project_id);
