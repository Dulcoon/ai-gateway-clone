import { v4 as uuidv4 } from "uuid";
import prisma from "../../../lib/prisma.js";
import { parseJson } from "../helpers/jsonCol.js";

function rowToCombo(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    models: typeof row.models === "string" ? parseJson(row.models, []) : (row.models || []),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

export async function getCombos() {
  const rows = await prisma.combo.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map(rowToCombo);
}

export async function getComboById(id) {
  if (!id) return null;
  const row = await prisma.combo.findUnique({
    where: { id },
  });
  return rowToCombo(row);
}

export async function getComboByName(name) {
  if (!name) return null;
  const row = await prisma.combo.findUnique({
    where: { name },
  });
  return rowToCombo(row);
}

export async function createCombo(data) {
  const row = await prisma.combo.create({
    data: {
      id: uuidv4(),
      name: data.name,
      kind: data.kind || null,
      models: data.models || [],
    },
  });
  return rowToCombo(row);
}

export async function updateCombo(id, data) {
  if (!id) return null;
  const row = await prisma.combo.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.kind !== undefined ? { kind: data.kind } : {}),
      ...(data.models !== undefined ? { models: data.models } : {}),
    },
  });
  return rowToCombo(row);
}

export async function deleteCombo(id) {
  if (!id) return false;
  try {
    await prisma.combo.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
