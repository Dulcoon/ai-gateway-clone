import prisma from "../../prisma.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { makeKv } from "../helpers/kvStore.js";

const pricingKv = makeKv("pricing");
const CACHE_TTL_MS = 5000;

let cache = { value: null, expiresAt: 0 };

function invalidate() {
  cache = { value: null, expiresAt: 0 };
}

async function getUserPricing() {
  return await pricingKv.getAll();
}

async function loadOpenSsePricing() {
  try {
    return await import("open-sse/providers/pricing.js");
  } catch {
    return await import("../../../../open-sse/providers/pricing.js");
  }
}

export async function getPricing() {
  const now = Date.now();
  if (cache.value && cache.expiresAt > now) return cache.value;

  const userPricing = await getUserPricing();
  const { PROVIDER_PRICING } = await loadOpenSsePricing();
  const merged = {};

  for (const [provider, models] of Object.entries(PROVIDER_PRICING)) {
    merged[provider] = { ...models };
    if (userPricing[provider]) {
      for (const [model, pricing] of Object.entries(userPricing[provider])) {
        merged[provider][model] = merged[provider][model]
          ? { ...merged[provider][model], ...pricing }
          : pricing;
      }
    }
  }

  for (const [provider, models] of Object.entries(userPricing)) {
    if (!merged[provider]) {
      merged[provider] = { ...models };
    } else {
      for (const [model, pricing] of Object.entries(models)) {
        if (!merged[provider][model]) merged[provider][model] = pricing;
      }
    }
  }

  cache = { value: merged, expiresAt: now + CACHE_TTL_MS };
  return merged;
}

export async function getPricingForModel(provider, model) {
  if (!model) return null;
  const userPricing = await getUserPricing();
  if (provider && userPricing[provider]?.[model]) return userPricing[provider][model];
  const { getPricingForModel: resolveConst } = await loadOpenSsePricing();
  return resolveConst(provider, model);
}

// Atomic merge inside transaction (per-provider read-modify-write)
export async function updatePricing(pricingData) {
  await prisma.$transaction(async (tx) => {
    for (const [provider, models] of Object.entries(pricingData)) {
      const row = await tx.kv.findUnique({
        where: { scope_key: { scope: "pricing", key: provider } },
      });
      const current = row ? (parseJson(row.value, {}) || {}) : {};
      const merged = { ...current };
      for (const [model, pricing] of Object.entries(models)) {
        merged[model] = pricing;
      }
      await tx.kv.upsert({
        where: { scope_key: { scope: "pricing", key: provider } },
        update: { value: stringifyJson(merged) },
        create: { scope: "pricing", key: provider, value: stringifyJson(merged) },
      });
    }
  });
  invalidate();
  return await getUserPricing();
}

export async function resetPricing(provider, model) {
  if (!provider) return await getUserPricing();
  if (!model) {
    await prisma.kv.deleteMany({
      where: { scope: "pricing", key: provider },
    });
  } else {
    const row = await prisma.kv.findUnique({
      where: { scope_key: { scope: "pricing", key: provider } },
    });
    const current = row ? (parseJson(row.value, {}) || {}) : {};
    delete current[model];
    if (Object.keys(current).length === 0) {
      await prisma.kv.deleteMany({
        where: { scope: "pricing", key: provider },
      });
    } else {
      await prisma.kv.upsert({
        where: { scope_key: { scope: "pricing", key: provider } },
        update: { value: stringifyJson(current) },
        create: { scope: "pricing", key: provider, value: stringifyJson(current) },
      });
    }
  }
  invalidate();
  return await getUserPricing();
}

export async function resetAllPricing() {
  await prisma.kv.deleteMany({
    where: { scope: "pricing" },
  });
  invalidate();
  return {};
}
