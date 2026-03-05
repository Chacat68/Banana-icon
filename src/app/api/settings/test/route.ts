import { NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { settings } from "@/lib/schema";

/** POST /api/settings/test — Test API connectivity */
export async function POST() {
  let apiUrl = process.env.NANO_BANANA_API_URL || "";
  let apiKey = process.env.NANO_BANANA_API_KEY || "";

  try {
    const db = await getDbFromContext();
    const rows = await db.select().from(settings);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    if (map.nano_banana_api_url) apiUrl = map.nano_banana_api_url;
    if (map.nano_banana_api_key) apiKey = map.nano_banana_api_key;
  } catch {
    // fall back to env
  }

  if (!apiUrl) {
    return NextResponse.json({ ok: false, error: "未配置 API URL" });
  }
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "未配置 API Key" });
  }

  const start = Date.now();
  try {
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

    // Any response (even 400) means the server is reachable and the key is accepted
    // 401/403 means auth failure
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({
        ok: false,
        error: "认证失败，请检查 API Key",
        latency,
      });
    }

    return NextResponse.json({ ok: true, latency });
  } catch (e) {
    const latency = Date.now() - start;
    const msg = e instanceof Error ? e.message : "连接失败";
    return NextResponse.json({ ok: false, error: msg, latency });
  }
}
