/** Nano Banana API client */

import { getDbFromContext } from "@/lib/db";
import { settings } from "@/lib/schema";

export interface GenerateImageParams {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  num_images?: number;
  style?: string;
  reference_image_url?: string;
}

export interface GenerateImageResult {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  images?: { url: string; seed: number }[];
  error?: string;
}

export function mapUpstreamStatus(
  status: GenerateImageResult["status"]
): "queued" | "running" | "success" | "failed" {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "failed";
    case "pending":
    case "processing":
    default:
      return "running";
  }
}

const ENV_API_URL = process.env.NANO_BANANA_API_URL || "";
const ENV_API_KEY = process.env.NANO_BANANA_API_KEY || "";

/**
 * Get API config. API Key priority: clientKey param > env var.
 * API URL priority: DB setting > env var.
 * API Key is never stored in the database.
 */
async function getApiConfig(clientKey?: string): Promise<{ url: string; key: string }> {
  let url = ENV_API_URL;
  try {
    const db = await getDbFromContext();
    const rows = await db.select().from(settings);
    for (const r of rows) {
      if (r.key === "nano_banana_api_url") url = r.value;
    }
  } catch {
    // fall back to env
  }
  return {
    url,
    key: clientKey || ENV_API_KEY,
  };
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  clientKey?: string,
): Promise<T> {
  const { url, key } = await getApiConfig(clientKey);
  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Nano Banana API error ${res.status}: ${body}`);
  }
  return res.json();
}

/** Submit a generation request */
export async function submitGeneration(
  params: GenerateImageParams,
  clientKey?: string,
): Promise<GenerateImageResult> {
  return apiFetch<GenerateImageResult>("/v1/generate", {
    method: "POST",
    body: JSON.stringify(params),
  }, clientKey);
}

/** Poll for generation result */
export async function getGenerationStatus(
  taskId: string,
  clientKey?: string,
): Promise<GenerateImageResult> {
  return apiFetch<GenerateImageResult>(`/v1/generate/${taskId}`, {}, clientKey);
}

/** Analyze an image to extract style & prompt suggestions */
export interface AnalyzeImageResult {
  style: string;
  keywords: string;
  negativeWords: string;
  description: string;
}

export async function analyzeImage(
  imageUrl: string,
  clientKey?: string,
): Promise<AnalyzeImageResult> {
  return apiFetch<AnalyzeImageResult>("/v1/analyze", {
    method: "POST",
    body: JSON.stringify({ image_url: imageUrl }),
  }, clientKey);
}

/** Build a full prompt from template fields */
export function buildPrompt(fields: {
  subject: string;
  style: string;
  viewAngle?: string;
  lighting?: string;
  background?: string;
  extras?: string;
}): string {
  const parts = [
    fields.subject,
    fields.style,
    fields.viewAngle && `${fields.viewAngle} view`,
    fields.lighting && `${fields.lighting} lighting`,
    fields.background && `${fields.background} background`,
    fields.extras,
  ].filter(Boolean);
  return parts.join(", ");
}
