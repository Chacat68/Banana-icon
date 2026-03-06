import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { generationTasks, assets } from "@/lib/schema";
import { getGenerationStatus, mapUpstreamStatus } from "@/lib/nano-banana";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

type GenerationTask = typeof generationTasks.$inferSelect;

function buildTaskPatch(
  task: GenerationTask,
  nextValues: Pick<GenerationTask, "upstreamTaskId" | "status" | "errorMessage">
) {
  const patch: Partial<GenerationTask> = {};

  if (task.upstreamTaskId !== nextValues.upstreamTaskId) {
    patch.upstreamTaskId = nextValues.upstreamTaskId;
  }

  if (task.status !== nextValues.status) {
    patch.status = nextValues.status;
  }

  if (task.errorMessage !== nextValues.errorMessage) {
    patch.errorMessage = nextValues.errorMessage;
  }

  if (Object.keys(patch).length === 0) {
    return null;
  }

  patch.updatedAt = new Date().toISOString();
  return patch;
}

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

  let responseTask = task;

  // If still running, poll the upstream API
  if (task.status === "running" || task.status === "queued") {
    try {
      const upstreamTaskId = task.upstreamTaskId || taskId;
      const result = await getGenerationStatus(upstreamTaskId, clientKey);
      const nextStatus = mapUpstreamStatus(result.status);

      if (result.status === "completed" && result.images) {
        // Idempotent: re-check task status to prevent duplicate asset insertion
        const [current] = await db.select().from(generationTasks)
          .where(eq(generationTasks.id, taskId)).limit(1);
        if (current && current.status !== "success") {
          const successPatch = buildTaskPatch(current, {
            upstreamTaskId,
            status: "success",
            errorMessage: null,
          });

          if (successPatch) {
            await db
              .update(generationTasks)
              .set(successPatch)
              .where(eq(generationTasks.id, taskId));
          }

          if (result.images.length > 0) {
            const createdAt = new Date().toISOString();
            await db.insert(assets).values(
              result.images.map((img) => ({
                id: uuid(),
                filename: `${taskId}_${img.seed}.png`,
                originalUrl: img.url,
                width: task.width,
                height: task.height,
                prompt: task.prompt,
                seed: img.seed,
                projectId: task.projectId,
                taskId,
                createdAt,
              }))
            );
          }

          responseTask = {
            ...current,
            ...(successPatch ?? {}),
          };
        } else if (current) {
          responseTask = current;
        }
      } else if (result.status === "failed") {
        const failedPatch = buildTaskPatch(task, {
          upstreamTaskId,
          status: "failed",
          errorMessage: result.error || "Generation failed",
        });

        if (failedPatch) {
          await db
            .update(generationTasks)
            .set(failedPatch)
            .where(eq(generationTasks.id, taskId));
          responseTask = { ...task, ...failedPatch };
        }
      } else {
        const progressPatch = buildTaskPatch(task, {
          upstreamTaskId,
          status: nextStatus,
          errorMessage: null,
        });

        if (progressPatch) {
          await db
            .update(generationTasks)
            .set(progressPatch)
            .where(eq(generationTasks.id, taskId));
          responseTask = { ...task, ...progressPatch };
        }
      }
    } catch {
      // upstream unreachable — just return current state
    }
  }

  const taskAssets = await db
    .select()
    .from(assets)
    .where(eq(assets.taskId, taskId));
  return NextResponse.json({ ...responseTask, assets: taskAssets });
}
