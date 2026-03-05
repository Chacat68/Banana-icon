import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { generationTasks, assets } from "@/lib/schema";
import { submitGeneration, buildPrompt } from "@/lib/nano-banana";
import { eq, desc } from "drizzle-orm";
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
                width,
                height,
                prompt,
                seed: img.seed,
                projectId,
                taskId,
                createdAt: new Date().toISOString(),
              });
            }
          } else {
            await db
              .update(generationTasks)
              .set({ status: "running", updatedAt: new Date().toISOString() })
              .where(eq(generationTasks.id, taskId));
          }
        })
        .catch(async (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          await db
            .update(generationTasks)
            .set({ status: "failed", errorMessage: message, updatedAt: new Date().toISOString() })
            .where(eq(generationTasks.id, taskId));
        });

    // Use waitUntil on Cloudflare, otherwise just run in background
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const { ctx } = await getCloudflareContext();
      ctx.waitUntil(generationPromise);
    } catch {
      // Local dev: fire and forget
      generationPromise.catch(() => {});
    }

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

  const tasks = await db
    .select()
    .from(generationTasks)
    .where(projectId ? eq(generationTasks.projectId, projectId) : undefined)
    .orderBy(desc(generationTasks.createdAt))
    .limit(50);

  // Attach assets to each task
  const taskIds = tasks.map((t) => t.id);
  const allAssets = taskIds.length
    ? await db.select().from(assets).where(
        // D1 doesn't support IN with array param well, so loop
        eq(assets.taskId, taskIds[0])
      )
    : [];
  // For more than one task, fetch all assets and group
  const assetsByTask: Record<string, typeof allAssets> = {};
  if (taskIds.length > 0) {
    const all = await db.select().from(assets);
    for (const a of all) {
      if (a.taskId && taskIds.includes(a.taskId)) {
        (assetsByTask[a.taskId] ??= []).push(a);
      }
    }
  }

  const result = tasks.map((t) => ({
    ...t,
    assets: assetsByTask[t.id] || [],
  }));

  return NextResponse.json(result);
}
