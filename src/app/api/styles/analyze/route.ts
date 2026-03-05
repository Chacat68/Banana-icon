import { NextRequest, NextResponse } from "next/server";
import { analyzeImage } from "@/lib/nano-banana";

/** POST /api/styles/analyze — Analyze an image and return style/prompt suggestions */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { imageUrl?: string };
  const { imageUrl } = body;

  if (!imageUrl) {
    return NextResponse.json(
      { error: "imageUrl is required" },
      { status: 400 }
    );
  }

  try {
    const result = await analyzeImage(imageUrl);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
