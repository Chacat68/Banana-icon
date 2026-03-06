import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { assets } from "@/lib/schema";
import { deleteStoredAsset } from "@/lib/asset-storage";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";

function combineConditions(...conditions: Array<SQL | undefined>) {
  const activeConditions = conditions.filter((condition): condition is SQL => Boolean(condition));
  if (activeConditions.length === 0) {
    return undefined;
  }

  return and(...activeConditions);
}

/** GET /api/assets — List assets with optional filters */
export async function GET(req: NextRequest) {
  const db = await getDbFromContext();
  const projectId = req.nextUrl.searchParams.get("projectId");
  const tag = req.nextUrl.searchParams.get("tag");
  const queryText = req.nextUrl.searchParams.get("q")?.trim() || "";
  const parsed = Number(req.nextUrl.searchParams.get("limit") || 50);
  const parsedOffset = Number(req.nextUrl.searchParams.get("offset") || 0);
  const take = Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 200) : 50;
  const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  const baseWhere = combineConditions(
    projectId ? eq(assets.projectId, projectId) : undefined,
    tag ? like(assets.tags, `%${tag}%`) : undefined,
    queryText
      ? or(
          like(assets.prompt, `%${queryText}%`),
          like(assets.tags, `%${queryText}%`)
        )
      : undefined
  );

  const rows = await db
    .select()
    .from(assets)
    .where(baseWhere)
    .orderBy(desc(assets.createdAt))
    .limit(take)
    .offset(offset);

  const [{ count: totalCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(assets)
    .where(baseWhere);

  const [{ count: taggedCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(assets)
    .where(
      combineConditions(baseWhere, sql`${assets.tags} is not null and trim(${assets.tags}) <> ''`)
    );

  return NextResponse.json({
    items: rows,
    pagination: {
      offset,
      limit: take,
      total: Number(totalCount),
      hasMore: offset + rows.length < Number(totalCount),
    },
    stats: {
      total: Number(totalCount),
      tagged: Number(taggedCount),
      ready: Number(totalCount),
    },
  });
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
