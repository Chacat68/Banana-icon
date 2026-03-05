import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { assets } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

/** GET /api/assets — List assets with optional filters */
export async function GET(req: NextRequest) {
  const db = await getDbFromContext();
  const projectId = req.nextUrl.searchParams.get("projectId");
  const tag = req.nextUrl.searchParams.get("tag");
  const take = Math.min(Number(req.nextUrl.searchParams.get("limit") || 50), 200);

  const query = db
    .select()
    .from(assets)
    .where(projectId ? eq(assets.projectId, projectId) : undefined)
    .orderBy(desc(assets.createdAt))
    .limit(take);

  const rows = await query;

  const result = tag
    ? rows.filter(
        (a: { tags: string | null }) => a.tags && a.tags.toLowerCase().includes(tag.toLowerCase())
      )
    : rows;

  return NextResponse.json(result);
}

/** DELETE /api/assets?id=xxx — Delete a single asset */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const db = await getDbFromContext();
  await db.delete(assets).where(eq(assets.id, id));
  return NextResponse.json({ ok: true });
}
