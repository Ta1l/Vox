import { isIP } from "node:net";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiProviderConfigs } from "@/lib/db/schema/aiProviderConfigs";
import { decrypt, encrypt } from "@/lib/security/encryption";
import type { AIProviderConfig } from "./aiTypes";

export interface ProviderConfigInput { baseUrl: string; apiKey: string; modelName: string; }

function privateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (["localhost", "localhost.localdomain", "metadata.google.internal"].includes(host) || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    const octets = host.split(".").map(Number);
    return octets[0] === 10 || octets[0] === 127 || (octets[0] === 169 && octets[1] === 254) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168) || octets.every((octet) => octet === 0);
  }
  return ipVersion === 6 && (host === "::1" || host === "::" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:"));
}

export function validateBaseUrl(value: string) {
  if (value.length === 0 || value.length > 512) throw new Error("Base URL must be 1–512 characters");
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("Invalid base URL"); }
  if (parsed.protocol !== "https:") throw new Error("Only HTTPS base URLs are allowed");
  if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("Base URL cannot contain credentials, query, or fragment");
  if (parsed.port && parsed.port !== "443") throw new Error("Only HTTPS port 443 is allowed");
  if (privateHostname(parsed.hostname) && process.env.NODE_ENV === "production") throw new Error("Private network base URLs are not allowed");
  return parsed.origin + parsed.pathname.replace(/\/$/, "");
}

export function validateApiKey(value: string) {
  if (value.length < 8 || value.length > 512 || /[\u0000-\u001f\u007f]/.test(value)) throw new Error("Invalid API key");
  return value;
}

export function validateModelName(value: string) {
  if (value.length < 1 || value.length > 128 || !/^[a-zA-Z0-9._-]+$/.test(value)) throw new Error("Invalid model name");
  return value;
}

export async function saveProviderConfig(userId: string, input: ProviderConfigInput) {
  const baseUrl = validateBaseUrl(input.baseUrl.trim());
  const apiKey = validateApiKey(input.apiKey);
  const modelName = validateModelName(input.modelName.trim());
  const encrypted = encrypt(apiKey);
  const [row] = await db.insert(aiProviderConfigs).values({ userId, baseUrl, modelName, apiKeyEncrypted: encrypted, isEnabled: true, updatedAt: new Date() }).onConflictDoUpdate({ target: aiProviderConfigs.userId, set: { baseUrl, modelName, apiKeyEncrypted: encrypted, isEnabled: true, updatedAt: new Date() } }).returning();
  return { id: row.id, baseUrl: row.baseUrl, modelName: row.modelName, isEnabled: row.isEnabled };
}

export async function getProviderConfig(userId: string): Promise<AIProviderConfig | null> {
  const row = await db.query.aiProviderConfigs.findFirst({ where: and(eq(aiProviderConfigs.userId, userId), eq(aiProviderConfigs.isEnabled, true)) });
  return row ? { baseUrl: row.baseUrl, modelName: row.modelName, apiKey: decrypt(row.apiKeyEncrypted) } : null;
}

export async function getProviderConfigMetadata(userId: string) {
  const row = await db.query.aiProviderConfigs.findFirst({ where: eq(aiProviderConfigs.userId, userId) });
  return row ? { id: row.id, baseUrl: row.baseUrl, modelName: row.modelName, isEnabled: row.isEnabled, hasApiKey: true, lastTestedAt: row.lastTestedAt } : null;
}

export async function markProviderTested(userId: string) {
  await db.update(aiProviderConfigs).set({ lastTestedAt: new Date(), updatedAt: new Date() }).where(eq(aiProviderConfigs.userId, userId));
}

export async function setProviderEnabled(userId: string, isEnabled: boolean) {
  const [row] = await db.update(aiProviderConfigs).set({ isEnabled, updatedAt: new Date() }).where(eq(aiProviderConfigs.userId, userId)).returning({ isEnabled: aiProviderConfigs.isEnabled });
  if (!row) throw new Error("Provider configuration not found");
  return row;
}

export async function deleteProviderConfig(userId: string) {
  await db.delete(aiProviderConfigs).where(eq(aiProviderConfigs.userId, userId));
}
