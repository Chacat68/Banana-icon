import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { generationTasks, assets } from "@/lib/schema";
import { getGenerationStatus } from "@/lib/nano-banana";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

/** GET /api/generate/[taskId]/status — Poll task status */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const clientKey = req.headers.get("x-api-key") || undefined;
  const { taskId } = await params;
  const db = await getDbFromContext();

  const [task] = await db
    .select()
    .from(generationTasks)
    .where(eq(generationTasks.id, taskId))
    .limit(1);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // If still running, poll the upstream API
  if (task.status === "running" || task.status === "queued") {
    try {
      const result = await getGenerationStatus(taskId, clientKey);
      if (result.status === "completed" && result.images) {
        await db
          .update(generationTasks)
          .set({ status: "success", updatedAt: new Date().toISOString() })
          .where(eq(generationTasks.id, taskId));
        for (const img of result.images) {
          await db.insert(assets).values({
            id: uuid(),
            filename: `${taskId}_${img.seed}.png`,
            originalUrl: img.url,
            width: task.width,
            height: task.height,
            prompt: task.prompt,
            seed: img.seed,
            projectId: task.projectId,
            taskId,
            createdAt: new Date().toISOString(),
          });
        }
        // Return updated task with assets
        const [updated] = await db
          .select()
          .from(generationTasks)
          .where(eq(generationTasks.id, taskId))
          .limit(1);
        const taskAssets = await db
          .select()
          .from(assets)
          .where(eq(assets.taskId, taskId));
        return NextResponse.json({ ...updated, assets: taskAssets });
      } else if (result.status === "failed") {
        await db
          .update(generationTasks)
          .set({
            status: "failed",
            errorMessage: result.error || "Generation failed",
            updatedAt: new Date().toISOString(),
          })
          .where(eq(generationTasks.id, taskId));
      }
    } catch {
      // upstream unreachable — just return current state
    }
  }

  const taskAssets = await db
    .select()
    .from(assets)
    .where(eq(assets.taskId, taskId));
  return NextResponse.json({ ...task, assets: taskAssets });
}
