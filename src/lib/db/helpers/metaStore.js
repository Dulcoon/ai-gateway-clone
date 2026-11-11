import prisma from "../../prisma.js";

export async function getMeta(key, fallback = null) {
  try {
    const row = await prisma.kv.findUnique({
      where: { scope_key: { scope: "_meta", key } },
    });
    return row ? row.value : fallback;
  } catch (err) {
    console.error(`[metaStore] Error fetching meta key ${key}:`, err);
    return fallback;
  }
}

export async function setMeta(key, value) {
  try {
    await prisma.kv.upsert({
      where: { scope_key: { scope: "_meta", key } },
      update: { value: String(value) },
      create: { scope: "_meta", key, value: String(value) },
    });
  } catch (err) {
    console.error(`[metaStore] Error setting meta key ${key}:`, err);
  }
}

// Sync versions kept as fallback stubs if anything calls them synchronously
export function getMetaSync(adapter, key, fallback = null) {
  if (adapter && typeof adapter.get === "function") {
    const row = adapter.get(`SELECT value FROM _meta WHERE key = ?`, [key]);
    return row ? row.value : fallback;
  }
  return fallback;
}

export function setMetaSync(adapter, key, value) {
  if (adapter && typeof adapter.run === "function") {
    adapter.run(`INSERT INTO _meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [key, String(value)]);
  }
}
