import { v4 as uuidv4 } from "uuid";
import prisma from "../../prisma.js";
import { parseJson } from "../helpers/jsonCol.js";

function rowToNode(row) {
  if (!row) return null;
  const extra = typeof row.data === "string" ? parseJson(row.data, {}) : (row.data || {});
  return {
    ...extra,
    id: row.id,
    type: row.type,
    name: row.name,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

export async function getProviderNodes(filter = {}) {
  const where = {};
  if (filter.type) where.type = filter.type;
  const rows = await prisma.providerNode.findMany({ where });
  return rows.map(rowToNode);
}

export async function getProviderNodeById(id) {
  const row = await prisma.providerNode.findUnique({ where: { id } });
  return rowToNode(row);
}

export async function createProviderNode(data) {
  const id = data.id || uuidv4();
  const { type, name, ...rest } = data;
  const created = await prisma.providerNode.create({
    data: {
      id,
      type: type ?? null,
      name: name ?? null,
      data: rest,
    },
  });
  return rowToNode(created);
}

export async function updateProviderNode(id, data) {
  const existing = await prisma.providerNode.findUnique({ where: { id } });
  if (!existing) return null;
  const current = rowToNode(existing);
  const merged = { ...current, ...data };
  const { id: _id, type, name, createdAt, updatedAt, ...rest } = merged;

  const updated = await prisma.providerNode.update({
    where: { id },
    data: {
      type: type ?? null,
      name: name ?? null,
      data: rest,
    },
  });
  return rowToNode(updated);
}

export async function deleteProviderNode(id) {
  const existing = await prisma.providerNode.findUnique({ where: { id } });
  if (!existing) return null;
  const removed = rowToNode(existing);

  await prisma.$transaction([
    prisma.providerNode.delete({ where: { id } }),
    prisma.kv.deleteMany({
      where: {
        scope: "customModels",
        key: { startsWith: `${id}|` },
      },
    }),
  ]);

  return removed;
}
