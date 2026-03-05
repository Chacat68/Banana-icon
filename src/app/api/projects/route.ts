import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { projects, assets, generationTasks } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";

/** GET /api/projects — List all projects */
export async function GET() {
  const db = await getDbFromContext();

  type Project = typeof projects.$inferSelect;
  const projectList: Project[] = await db.select().from(projects).orderBy(desc(projects.createdAt));

  const [assetCounts, taskCounts] = await Promise.all([
    db.select({ projectId: assets.projectId, count: sql<number>`count(*)` })
      .from(assets).groupBy(assets.projectId),
    db.select({ projectId: generationTasks.projectId, count: sql<number>`count(*)` })
      .from(generationTasks).groupBy(generationTasks.projectId),
  ]);

  const assetCountMap: Record<string, number> = {};
  for (const r of assetCounts) assetCountMap[r.projectId] = r.count;
  const taskCountMap: Record<string, number> = {};
  for (const r of taskCounts) taskCountMap[r.projectId] = r.count;

  const result = projectList.map((p) => ({
    ...p,
    _count: {
      assets: assetCountMap[p.id] ?? 0,
      tasks: taskCountMap[p.id] ?? 0,
    },
  }));

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
