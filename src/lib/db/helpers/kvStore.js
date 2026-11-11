import prisma from "../../prisma.js";
import { parseJson, stringifyJson } from "./jsonCol.js";

export function makeKv(scope) {
  return {
    async get(key, fallback = null) {
      const row = await prisma.kv.findUnique({
        where: { scope_key: { scope, key } },
      });
      return row ? parseJson(row.value, fallback) : fallback;
    },
    async getAll() {
      const rows = await prisma.kv.findMany({
        where: { scope },
      });
      const out = {};
      for (const r of rows) out[r.key] = parseJson(r.value);
      return out;
    },
    async set(key, value) {
      const strVal = stringifyJson(value);
      await prisma.kv.upsert({
        where: { scope_key: { scope, key } },
        update: { value: strVal },
        create: { scope, key, value: strVal },
      });
    },
    async setMany(obj) {
      const entries = Object.entries(obj);
      if (entries.length === 0) return;
      await prisma.$transaction(
        entries.map(([k, v]) => {
          const strVal = stringifyJson(v);
          return prisma.kv.upsert({
            where: { scope_key: { scope, key: k } },
            update: { value: strVal },
            create: { scope, key: k, value: strVal },
          });
        })
      );
    },
    async remove(key) {
      await prisma.kv.deleteMany({
        where: { scope, key },
      });
    },
    async clear() {
      await prisma.kv.deleteMany({
        where: { scope },
      });
    },
  };
}
