import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { v4 as uuid } from "uuid";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** POST /api/upload — Upload an image to R2 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
    }

    const contentType = file.type || "image/png";
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${contentType}` },
        { status: 400 }
      );
    }

    const ext = contentType.split("/")[1] || "png";
    const key = `ref/${uuid()}.${ext}`;
    const buffer = await file.arrayBuffer();
    const url = await uploadToR2(key, buffer, contentType);

    return NextResponse.json({ url, key }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
