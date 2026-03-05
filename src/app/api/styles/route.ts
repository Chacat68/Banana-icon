import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { styleProfiles } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";

/** GET /api/styles — List style profiles */
export async function GET(req: NextRequest) {
  const db = await getDbFromContext();
  const projectId = req.nextUrl.searchParams.get("projectId");

  const profiles = await db
    .select()
    .from(styleProfiles)
    .where(projectId ? eq(styleProfiles.projectId, projectId) : undefined)
    .orderBy(desc(styleProfiles.createdAt));
  return NextResponse.json(profiles);
}

/** POST /api/styles — Create a style profile */
export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const { name, style, keywords, negativeWords, parameters, projectId, description, referenceImageUrl } = body as {
    name: string;
    style: string;
    keywords: string;
    negativeWords?: string;
    parameters?: unknown;
    projectId: string;
    description?: string;
    referenceImageUrl?: string;
  };

  if (!name || !style || !keywords || !projectId) {
    return NextResponse.json(
      { error: "name, style, keywords, and projectId are required" },
      { status: 400 }
    );
  }

  const db = await getDbFromContext();
  const now = new Date().toISOString();
  const [profile] = await db
    .insert(styleProfiles)
    .values({
      id: uuid(),
      name,
      description: description || null,
      style,
      keywords,
      negativeWords: negativeWords || null,
      parameters: parameters ? JSON.stringify(parameters) : null,
      referenceImageUrl: referenceImageUrl || null,
      projectId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return NextResponse.json(profile, { status: 201 });
}
