#!/usr/bin/env node

import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MIGRATIONS_DIR = join(ROOT, "migrations");
const db = new Database(join(ROOT, "local.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const files = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of files) {
  const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
  try {
    db.exec(sql);
    console.log(`Applied ${file}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const ignorable = message.includes("duplicate column name");
    if (ignorable) {
      console.log(`Skipped ${file}: ${message}`);
      continue;
    }
    console.error(`Failed ${file}: ${message}`);
    process.exit(1);
  }
}

console.log("Local SQLite migrations complete.");