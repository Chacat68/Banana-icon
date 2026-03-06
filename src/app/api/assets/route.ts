import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { assets } from "@/lib/schema";
import { deleteStoredAsset } from "@/lib/asset-storage";
import { eq, desc } from "drizzle-orm";

/** GET /api/assets — List assets with optional filters */
export async function GET(req: NextRequest) {
  const db = await getDbFromContext();
  const projectId = req.nextUrl.searchParams.get("projectId");
  const tag = req.nextUrl.searchParams.get("tag");
  const parsed = Number(req.nextUrl.searchParams.get("limit") || 50);
  const take = Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 200) : 50;

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

  // Look up the asset to get the storage key before deleting
  const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Delete from local asset storage.
  try {
    const urlPath = asset.originalUrl;
    // Convert URL back to the stored filename key.
    if (urlPath.startsWith("/uploads/")) {
      await deleteStoredAsset(urlPath.slice("/uploads/".length));
    }
  } catch (err) {
    console.error("[assets] failed to delete from storage:", err);
  }

  await db.delete(assets).where(eq(assets.id, id));
  return NextResponse.json({ ok: true });
}
