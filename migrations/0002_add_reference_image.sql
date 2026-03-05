-- D1 Migration: Add reference_image_url columns
-- Run with: wrangler d1 execute banana-icon-db --file=./migrations/0002_add_reference_image.sql

ALTER TABLE style_profiles ADD COLUMN reference_image_url TEXT;
ALTER TABLE generation_tasks ADD COLUMN reference_image_url TEXT;
