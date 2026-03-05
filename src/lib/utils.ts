import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Get API key headers for client-side fetch calls */
export function getApiKeyHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const key = localStorage.getItem("nano_banana_api_key");
  return key ? { "X-Api-Key": key } : {};
}
