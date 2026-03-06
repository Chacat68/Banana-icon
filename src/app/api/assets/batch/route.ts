import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { saveUploadedAsset } from "@/lib/asset-storage";
import { assets } from "@/lib/schema";
import { v4 as uuid } from "uuid";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES = 50;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** POST /api/assets/batch — Batch import images into the asset library */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files");
    const projectId = formData.get("projectId") as string | null;
    const tags = formData.get("tags") as string | null;
    const prompt = (formData.get("prompt") as string | null) || "imported";

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files (max ${MAX_FILES})` },
        { status: 400 }
      );
    }

    const db = await getDbFromContext();
    const created: typeof assets.$inferInsert[] = [];
    const errors: { filename: string; error: string }[] = [];

    for (const file of files) {
      if (!(file instanceof Blob)) {
        errors.push({ filename: "unknown", error: "Invalid file entry" });
        continue;
      }

      const f = file as File;
      const filename = f.name || "unnamed";

      if (f.size > MAX_SIZE) {
        errors.push({ filename, error: "File too large (max 10 MB)" });
        continue;
      }

      if (!ALLOWED_TYPES.includes(f.type)) {
        errors.push({ filename, error: `Unsupported type: ${f.type}` });
        continue;
      }

      try {
        const ext = f.type.split("/")[1] || "png";
        const id = uuid();
        const key = `assets/${id}.${ext}`;
        const buffer = await f.arrayBuffer();

        // Get image dimensions from the buffer
        const { width, height } = parseDimensions(new Uint8Array(buffer), f.type);

        const url = await saveUploadedAsset(key, buffer, f.type);

        const record = {
          id,
          filename,
          originalUrl: url,
          processedUrl: null,
          thumbnailUrl: null,
          width,
          height,
          format: ext,
          prompt,
          seed: null,
          tags: tags || null,
          metadata: null,
          projectId,
          taskId: null,
          createdAt: new Date().toISOString(),
        };

        await db.insert(assets).values(record);
        created.push(record);
      } catch (err) {
        errors.push({
          filename,
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    }

    return NextResponse.json(
      { created: created.length, errors, total: files.length },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Batch import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Parse basic image dimensions from raw bytes.
 * Supports PNG, JPEG, GIF, and WebP.
 */
function parseDimensions(
  data: Uint8Array,
  mime: string
): { width: number; height: number } {
  try {
    if (mime === "image/png" && data.length > 24) {
      // PNG: width at byte 16, height at byte 20 (big-endian uint32)
      const view = new DataView(data.buffer, data.byteOffset);
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }

    if (mime === "image/gif" && data.length > 10) {
      // GIF: width at byte 6, height at byte 8 (little-endian uint16)
      const view = new DataView(data.buffer, data.byteOffset);
      return {
        width: view.getUint16(6, true),
        height: view.getUint16(8, true),
      };
    }

    if (mime === "image/webp" && data.length > 30) {
      // WebP VP8: check for "RIFF" + "WEBP"
      if (data[12] === 0x56 && data[13] === 0x50 && data[14] === 0x38) {
        // VP8 lossy
        if (data[15] === 0x20 && data.length > 30) {
          const view = new DataView(data.buffer, data.byteOffset);
          return {
            width: view.getUint16(26, true) & 0x3fff,
            height: view.getUint16(28, true) & 0x3fff,
          };
        }
        // VP8L lossless
        if (data[15] === 0x4c && data.length > 25) {
          const bits =
            data[21] | (data[22] << 8) | (data[23] << 16) | (data[24] << 24);
          return {
            width: (bits & 0x3fff) + 1,
            height: ((bits >> 14) & 0x3fff) + 1,
          };
        }
      }
    }

    if (mime === "image/jpeg" && data.length > 2) {
      // JPEG: scan for SOF markers
      let offset = 2;
      while (offset < data.length - 9) {
        if (data[offset] === 0xff) {
          const marker = data[offset + 1];
          // SOF0-SOF3, SOF5-SOF7, SOF9-SOF11, SOF13-SOF15
          if (
            (marker >= 0xc0 && marker <= 0xc3) ||
            (marker >= 0xc5 && marker <= 0xc7) ||
            (marker >= 0xc9 && marker <= 0xcb) ||
            (marker >= 0xcd && marker <= 0xcf)
          ) {
            const view = new DataView(data.buffer, data.byteOffset);
            return {
              height: view.getUint16(offset + 5),
              width: view.getUint16(offset + 7),
            };
          }
          const segLen = (data[offset + 2] << 8) | data[offset + 3];
          offset += 2 + segLen;
        } else {
          offset++;
        }
      }
    }
  } catch {
    // fall through to default
  }

  return { width: 512, height: 512 };
}
