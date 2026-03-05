import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const styleProfiles = sqliteTable("style_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  style: text("style").notNull(),
  keywords: text("keywords").notNull(),
  negativeWords: text("negative_words"),
  parameters: text("parameters"),
  referenceImageUrl: text("reference_image_url"),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const generationTasks = sqliteTable("generation_tasks", {
  id: text("id").primaryKey(),
  status: text("status").default("queued").notNull(),
  prompt: text("prompt").notNull(),
  negativePrompt: text("negative_prompt"),
  referenceImageUrl: text("reference_image_url"),
  width: integer("width").default(512).notNull(),
  height: integer("height").default(512).notNull(),
  seed: integer("seed"),
  batchSize: integer("batch_size").default(1).notNull(),
  parameters: text("parameters"),
  errorMessage: text("error_message"),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  styleProfileId: text("style_profile_id").references(() => styleProfiles.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  originalUrl: text("original_url").notNull(),
  processedUrl: text("processed_url"),
  thumbnailUrl: text("thumbnail_url"),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  format: text("format").default("png").notNull(),
  prompt: text("prompt").notNull(),
  seed: integer("seed"),
  tags: text("tags"),
  metadata: text("metadata"),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => generationTasks.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});
