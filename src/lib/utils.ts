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

/** Validate that a URL is a safe external URL (prevents SSRF) */
export function isValidExternalUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "[::1]") return false;

  // Block IPv4 private/reserved ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, aStr, bStr] = ipv4Match;
    const a = Number(aStr);
    const b = Number(bStr);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
  }

  // Block IPv6 private/reserved ranges (bracket-stripped by URL parser)
  const bare = hostname.replace(/^\[|\]$/g, "");
  if (bare.startsWith("fc") || bare.startsWith("fd")) return false;   // ULA fc00::/7
  if (bare.startsWith("fe8") || bare.startsWith("fe9")
    || bare.startsWith("fea") || bare.startsWith("feb")) return false; // Link-local fe80::/10
  if (bare === "::1" || bare === "::" || bare.startsWith("0:")) return false;

  // Block cloud metadata endpoints
  if (hostname === "metadata.google.internal") return false;
  if (hostname === "169.254.169.254") return false;
  return true;
}
