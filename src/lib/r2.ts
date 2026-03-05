/**
 * Helper to upload/delete files on Cloudflare R2.
 * Falls back to local filesystem when R2 is not available (local dev).
 */

import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { join } from "path";

const LOCAL_UPLOAD_DIR = join(process.cwd(), "public", "uploads");

function ensureLocalDir() {
  if (!existsSync(LOCAL_UPLOAD_DIR)) {
    mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
}

async function getR2Bucket(): Promise<R2Bucket | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext();
    return (env as { ASSETS_BUCKET: R2Bucket }).ASSETS_BUCKET;
  } catch {
    return null;
  }
}

export async function uploadToR2(
  key: string,
  data: ArrayBuffer | ReadableStream | Blob,
  contentType = "image/png"
): Promise<string> {
  const bucket = await getR2Bucket();
  if (bucket) {
    await bucket.put(key, data, { httpMetadata: { contentType } });
    return `/assets/${key}`;
  }
  // Local fallback: write to public/uploads/
  ensureLocalDir();
  const fileName = key.replace(/\//g, "_");
  const filePath = join(LOCAL_UPLOAD_DIR, fileName);
  const buffer = data instanceof ArrayBuffer
    ? Buffer.from(data)
    : data instanceof Blob
      ? Buffer.from(await data.arrayBuffer())
      : Buffer.from(await new Response(data).arrayBuffer());
  writeFileSync(filePath, buffer);
  return `/uploads/${fileName}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  const bucket = await getR2Bucket();
  if (bucket) {
    await bucket.delete(key);
    return;
  }
  const fileName = key.replace(/\//g, "_");
  const filePath = join(LOCAL_UPLOAD_DIR, fileName);
  if (existsSync(filePath)) unlinkSync(filePath);
}

export async function getFromR2(key: string): Promise<R2ObjectBody | null> {
  const bucket = await getR2Bucket();
  if (bucket) return bucket.get(key);
  const fileName = key.replace(/\//g, "_");
  const filePath = join(LOCAL_UPLOAD_DIR, fileName);
  if (!existsSync(filePath)) return null;
  // Return a minimal compatible object for local dev
  const data = readFileSync(filePath);
  return { body: new ReadableStream({ start(c) { c.enqueue(data); c.close(); } }), arrayBuffer: () => Promise.resolve(data.buffer) } as unknown as R2ObjectBody;
}
