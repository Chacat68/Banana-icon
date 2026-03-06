-- D1 Migration: Add upstream_task_id to generation_tasks
-- Run with: wrangler d1 execute banana-icon-db --file=./migrations/0004_add_upstream_task_id.sql

ALTER TABLE generation_tasks ADD COLUMN upstream_task_id TEXT;