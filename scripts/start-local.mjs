#!/usr/bin/env node
/**
 * Banana Icon 本地启动脚本
 * 
 * 功能：
 *   1. 检查并复制 .env 文件（从 .env.example）
 *   2. 确保 public/uploads 目录存在
 *   3. 初始化本地 SQLite 数据库
 *   4. 启动 Next.js 开发服务器
 * 
 * 用法：npm run local 或 node scripts/start-local.mjs
 */

import { existsSync, copyFileSync, mkdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function log(msg) {
  console.log(`\x1b[33m🍌 ${msg}\x1b[0m`);
}

function logOk(msg) {
  console.log(`\x1b[32m   ✓ ${msg}\x1b[0m`);
}

function logSkip(msg) {
  console.log(`\x1b[90m   - ${msg}\x1b[0m`);
}

function readEnvValue(key) {
  if (!existsSync(envFile)) return "";
  const content = requireEnvFile();
  const pattern = new RegExp(`^${key}=(.*)$`, "m");
  const match = content.match(pattern);
  return match?.[1]?.trim() || "";
}

let envFileCache = null;

function requireEnvFile() {
  if (envFileCache !== null) return envFileCache;
  envFileCache = existsSync(envFile)
    ? readFileSync(envFile, "utf8")
    : "";
  return envFileCache;
}

function isPlaceholderValue(value, placeholders) {
  if (!value) return true;
  return placeholders.includes(value.trim());
}

// 1. 检查 .env
const envFile = join(ROOT, ".env");
const envExample = join(ROOT, ".env.example");
if (!existsSync(envFile) && existsSync(envExample)) {
  copyFileSync(envExample, envFile);
  logOk(".env 文件已从 .env.example 复制，请编辑填入实际配置");
} else if (existsSync(envFile)) {
  logSkip(".env 文件已存在");
} else {
  logSkip("未找到 .env.example，跳过");
}

// 2. 确保 uploads 目录
const uploadsDir = join(ROOT, "public", "uploads");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
  logOk("已创建 public/uploads 目录");
} else {
  logSkip("public/uploads 目录已存在");
}

// 3. 检查 Nano Banana 配置
const apiKey = readEnvValue("NANO_BANANA_API_KEY");
const apiUrl = readEnvValue("NANO_BANANA_API_URL");

if (isPlaceholderValue(apiKey, ["your_api_key_here"])) {
  log("检测到 NANO_BANANA_API_KEY 尚未配置。你可以：");
  console.log("   1. 编辑 .env 填入真实 key");
  console.log("   2. 或启动后在 /settings 页面填写 API Key");
}

if (isPlaceholderValue(apiUrl, ["https://api.nano-banana.example.com"])) {
  log("检测到 NANO_BANANA_API_URL 仍是默认占位值。你可以：");
  console.log("   1. 编辑 .env 填入真实 API URL");
  console.log("   2. 或启动后在 /settings 页面填写 API URL");
}

// 4. 启动 Next.js dev server
log("启动开发服务器...\n");

const port = process.env.PORT || "3000";
const child = spawn("npx", ["next", "dev", "--port", port], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NODE_OPTIONS: "" },
});

child.on("error", (err) => {
  console.error("启动失败:", err.message);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
