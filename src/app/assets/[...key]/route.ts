import { NextRequest } from "next/server";
import { getFromR2 } from "@/lib/r2";

function getContentType(key: string): string {
  const extension = key.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "png":
    default:
      return "image/png";
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const objectKey = key.join("/");
  const object = await getFromR2(objectKey);

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type": getContentType(objectKey),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}