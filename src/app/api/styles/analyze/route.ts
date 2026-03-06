import { NextRequest, NextResponse } from "next/server";
import { analyzeImage } from "@/lib/nano-banana";
import { isValidExternalUrl } from "@/lib/utils";

function resolveAnalyzeUrl(req: NextRequest, rawUrl: string): string | null {
  if (rawUrl.startsWith("/uploads/") || rawUrl.startsWith("/assets/")) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    return new URL(rawUrl, baseUrl).toString();
  }
  return isValidExternalUrl(rawUrl) ? rawUrl : null;
}

/** POST /api/styles/analyze — Analyze an image and return style/prompt suggestions */
export async function POST(req: NextRequest) {
  const clientKey = req.headers.get("x-api-key") || undefined;
  const body = (await req.json()) as { imageUrl?: string };
  const { imageUrl } = body;

  if (!imageUrl) {
    return NextResponse.json(
      { error: "imageUrl is required" },
      { status: 400 }
    );
  }

  const resolvedImageUrl = resolveAnalyzeUrl(req, imageUrl);
  if (!resolvedImageUrl) {
    return NextResponse.json(
      { error: "Invalid or disallowed URL" },
      { status: 400 }
    );
  }

  try {
    const result = await analyzeImage(resolvedImageUrl, clientKey);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
