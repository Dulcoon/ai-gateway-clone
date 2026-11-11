import prisma from "../../prisma.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

const SCOPE = "disabledModels";

export async function getDisabledModels() {
  const rows = await prisma.kv.findMany({ where: { scope: SCOPE } });
  const out = {};
  for (const r of rows) out[r.key] = parseJson(r.value, []);
  return out;
}

export async function getDisabledByProvider(providerAlias) {
  const row = await prisma.kv.findUnique({
    where: { scope_key: { scope: SCOPE, key: providerAlias } },
  });
  return row ? (parseJson(row.value, []) || []) : [];
}

export async function disableModels(providerAlias, ids) {
  if (!providerAlias || !Array.isArray(ids)) return;
  const row = await prisma.kv.findUnique({
    where: { scope_key: { scope: SCOPE, key: providerAlias } },
  });
  const current = row ? (parseJson(row.value, []) || []) : [];
  const merged = [...new Set([...current, ...ids])];
  await prisma.kv.upsert({
    where: { scope_key: { scope: SCOPE, key: providerAlias } },
    update: { value: stringifyJson(merged) },
    create: { scope: SCOPE, key: providerAlias, value: stringifyJson(merged) },
  });
}

export async function enableModels(providerAlias, ids) {
  if (!providerAlias) return;
  if (!Array.isArray(ids) || ids.length === 0) {
    await prisma.kv.deleteMany({
      where: { scope: SCOPE, key: providerAlias },
    });
    return;
  }
  const row = await prisma.kv.findUnique({
    where: { scope_key: { scope: SCOPE, key: providerAlias } },
  });
  const current = row ? (parseJson(row.value, []) || []) : [];
  const removeSet = new Set(ids);
  const next = current.filter((id) => !removeSet.has(id));
  if (next.length === 0) {
    await prisma.kv.deleteMany({
      where: { scope: SCOPE, key: providerAlias },
    });
  } else {
    await prisma.kv.upsert({
      where: { scope_key: { scope: SCOPE, key: providerAlias } },
      update: { value: stringifyJson(next) },
      create: { scope: SCOPE, key: providerAlias, value: stringifyJson(next) },
    });
  }
}
