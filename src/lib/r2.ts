/**
 * Local file storage helper used in single-user development.
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
  return null;
}

export async function uploadToR2(
  key: string,
  data: ArrayBuffer | ReadableStream | Blob,
  contentType = "image/png"
): Promise<string> {
  void contentType;
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
  const fileName = key.replace(/\//g, "_");
  const filePath = join(LOCAL_UPLOAD_DIR, fileName);
  if (existsSync(filePath)) unlinkSync(filePath);
}

export async function getFromR2(key: string): Promise<{ body: ReadableStream<Uint8Array> } | null> {
  const fileName = key.replace(/\//g, "_");
  const filePath = join(LOCAL_UPLOAD_DIR, fileName);
  if (!existsSync(filePath)) return null;
  const data = readFileSync(filePath);
  return {
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(data));
        controller.close();
      },
    }),
  };
}
