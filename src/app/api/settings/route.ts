import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { settings } from "@/lib/schema";
import { eq } from "drizzle-orm";

const ALLOWED_KEYS = ["nano_banana_api_key", "nano_banana_api_url"];

/** GET /api/settings — Get all settings (values masked for secrets) */
export async function GET() {
  const db = await getDbFromContext();
  const rows = await db.select().from(settings);

  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.key === "nano_banana_api_key" && row.value) {
      // Mask the API key — only show last 4 chars
      result[row.key] =
        row.value.length > 4
          ? "•".repeat(row.value.length - 4) + row.value.slice(-4)
          : "••••";
    } else {
      result[row.key] = row.value;
    }
  }

  return NextResponse.json(result);
}

/** PUT /api/settings — Update settings */
export async function PUT(req: NextRequest) {
  const body = (await req.json()) as Record<string, string>;

  const db = await getDbFromContext();
  const now = new Date().toISOString();
  const updated: string[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key)) continue;
    if (typeof value !== "string") continue;

    // Upsert: try update first, then insert if no rows affected
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ value, updatedAt: now })
        .where(eq(settings.key, key));
    } else {
      await db
        .insert(settings)
        .values({ key, value, updatedAt: now });
    }
    updated.push(key);
  }

  return NextResponse.json({ updated });
}
