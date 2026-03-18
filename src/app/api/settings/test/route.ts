import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { settings } from "@/lib/schema";
import { assertNanoBananaConfig } from "@/lib/nano-banana";

/** POST /api/settings/test — Test API connectivity */
export async function POST(req: NextRequest) {
  // API Key comes from client header (stored in browser localStorage)
  const apiKey = req.headers.get("x-api-key") || process.env.NANO_BANANA_API_KEY || "";
  let apiUrl = process.env.NANO_BANANA_API_URL || "";

  try {
    const db = await getDbFromContext();
    const rows = await db.select().from(settings);
    for (const r of rows) {
      if (r.key === "nano_banana_api_url") apiUrl = r.value;
    }
  } catch {
    // fall back to env
  }

  try {
    await assertNanoBananaConfig(apiKey);
  } catch (e) {
    const error = e instanceof Error ? e.message : "配置无效";
    return NextResponse.json({ ok: false, error });
  }

  const start = Date.now();
  try {
    apiUrl = apiUrl.trim().replace(/\/+$/, "");
    const res = await fetch(`${apiUrl}/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ prompt: "test", num_images: 0 }),
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({
        ok: false,
        error: "认证失败，请检查 API Key",
        latency,
      });
    }

    if (res.status >= 500) {
      return NextResponse.json({
        ok: false,
        error: `服务端错误 (${res.status})`,
        latency,
      });
    }

    // 2xx or 4xx (like 400 for our dummy request) means server is reachable
    return NextResponse.json({ ok: true, latency });
  } catch (e) {
    const latency = Date.now() - start;
    const msg = e instanceof Error ? e.message : "连接失败";
    return NextResponse.json({ ok: false, error: msg, latency });
  }
}
