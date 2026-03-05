import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { projects, assets, generationTasks } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";

/** GET /api/projects — List all projects */
export async function GET() {
  const db = await getDbFromContext();

  const projectList = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt));

  // Count assets and tasks per project
  const result = [];
  for (const p of projectList) {
    const [assetCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(eq(assets.projectId, p.id));
    const [taskCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(generationTasks)
      .where(eq(generationTasks.projectId, p.id));
    result.push({
      ...p,
      _count: {
        assets: assetCount?.count ?? 0,
        tasks: taskCount?.count ?? 0,
      },
    });
  }

  return NextResponse.json(result);
}

/** POST /api/projects — Create a new project */
export async function POST(req: NextRequest) {
  const { name, description } = await req.json() as { name: string; description?: string };
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const db = await getDbFromContext();
  const now = new Date().toISOString();
  const [project] = await db
    .insert(projects)
    .values({
      id: uuid(),
      name,
      description: description || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return NextResponse.json(project, { status: 201 });
}
