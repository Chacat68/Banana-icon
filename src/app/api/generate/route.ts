import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { generationTasks, assets } from "@/lib/schema";
import {
  submitGeneration,
  buildPrompt,
  mapUpstreamStatus,
  assertNanoBananaConfig,
} from "@/lib/nano-banana";
import { eq, desc, inArray } from "drizzle-orm";
import { v4 as uuid } from "uuid";

/** POST /api/generate — Create a new generation task */
export async function POST(req: NextRequest) {
  const clientKey = req.headers.get("x-api-key") || undefined;
  try {
    const body = await req.json() as Record<string, unknown>;
    const {
      projectId,
      styleProfileId,
      subject,
      style,
      viewAngle,
      lighting,
      background,
      extras,
      negativePrompt,
      referenceImageUrl,
      width = 512,
      height = 512,
      seed,
      batchSize = 1,
    } = body as {
      projectId: string;
      styleProfileId?: string;
      subject: string;
      style: string;
      viewAngle?: string;
      lighting?: string;
      background?: string;
      extras?: string;
      negativePrompt?: string;
      referenceImageUrl?: string;
      width?: number;
      height?: number;
      seed?: number;
      batchSize?: number;
    };

    if (!projectId || !subject) {
      return NextResponse.json(
        { error: "projectId and subject are required" },
        { status: 400 }
      );
    }

    const db = await getDbFromContext();
    const prompt = buildPrompt({ subject, style, viewAngle, lighting, background, extras });
    try {
      await assertNanoBananaConfig(clientKey);
    } catch (configError) {
      const message = configError instanceof Error ? configError.message : "Nano Banana 配置无效";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const taskId = uuid();
    const now = new Date().toISOString();

    const [task] = await db.insert(generationTasks).values({
      id: taskId,
      prompt,
      negativePrompt: negativePrompt || null,
      referenceImageUrl: referenceImageUrl || null,
      width,
      height,
      seed: seed ?? null,
      batchSize,
      projectId,
      styleProfileId: styleProfileId || null,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Fire async generation (non-blocking best-effort)
    const generationPromise = submitGeneration({
        prompt,
        negative_prompt: negativePrompt,
        width,
        height,
        seed,
        num_images: batchSize,
        style,
        reference_image_url: referenceImageUrl,
      }, clientKey)
        .then(async (result) => {
          const nextStatus = mapUpstreamStatus(result.status);
          const upstreamTaskId = result.id || taskId;

          await db
            .update(generationTasks)
            .set({
              upstreamTaskId,
              status: nextStatus,
              errorMessage: result.error || null,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(generationTasks.id, taskId));

          if (result.status === "completed" && result.images) {
            // Idempotent: only insert assets if task hasn't already been marked success
            const [current] = await db.select().from(generationTasks)
              .where(eq(generationTasks.id, taskId)).limit(1);
            if (current && current.status !== "success") {
              await db
                .update(generationTasks)
                .set({
                  upstreamTaskId,
                  status: "success",
                  errorMessage: null,
                  updatedAt: new Date().toISOString(),
                })
                .where(eq(generationTasks.id, taskId));
              for (const img of result.images) {
                await db.insert(assets).values({
                  id: uuid(),
                  filename: `${taskId}_${img.seed}.png`,
                  originalUrl: img.url,
                  width,
                  height,
                  prompt,
                  seed: img.seed,
                  projectId,
                  taskId,
                  createdAt: new Date().toISOString(),
                });
              }
            }
          }
        })
        .catch(async (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          try {
            await db
              .update(generationTasks)
              .set({ status: "failed", errorMessage: message, updatedAt: new Date().toISOString() })
              .where(eq(generationTasks.id, taskId));
          } catch (dbErr) {
            console.error("[generate] failed to update task status:", dbErr);
          }
        });

    generationPromise.catch((err) => {
      console.error("[generate] background task error:", err);
    });

    return NextResponse.json(task, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET /api/generate — List tasks (optionally filter by projectId) */
export async function GET(req: NextRequest) {
  const db = await getDbFromContext();
  const projectId = req.nextUrl.searchParams.get("projectId");

  type Task = typeof generationTasks.$inferSelect;
  const tasks: Task[] = projectId
    ? await db.select().from(generationTasks)
        .where(eq(generationTasks.projectId, projectId))
        .orderBy(desc(generationTasks.createdAt)).limit(50)
    : await db.select().from(generationTasks)
        .orderBy(desc(generationTasks.createdAt)).limit(50);

  // Attach assets to each task
  const taskIds = tasks.map((t) => t.id);
  const taskAssetRows = taskIds.length > 0
    ? await db.select().from(assets).where(inArray(assets.taskId, taskIds))
    : [];
  const assetsByTask: Record<string, typeof taskAssetRows> = {};
  for (const a of taskAssetRows) {
    if (a.taskId) {
      (assetsByTask[a.taskId] ??= []).push(a);
    }
  }

  const result = tasks.map((t) => ({
    ...t,
    assets: assetsByTask[t.id] || [],
  }));

  return NextResponse.json(result);
}
