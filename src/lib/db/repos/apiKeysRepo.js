import { v4 as uuidv4 } from "uuid";
import prisma from "../../../lib/prisma.js";
import { keyAccessFromColumns, keyAccessToColumns } from "../../../shared/utils/keyAccess.js";
import { KEY_ACCESS_UNRESTRICTED } from "../../../shared/constants/keyAccess.js";

function rowToKey(row) {
  if (!row) return null;
  const isRestricted =
    row.accessRestricted === "1" ||
    row.accessRestricted === 1 ||
    row.accessRestricted === true ||
    row.accessRestricted === "restricted";

  return {
    id: row.id,
    key: row.key,
    name: row.name,
    machineId: row.machineId,
    isActive: row.isActive === 1 || row.isActive === true,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    access: keyAccessFromColumns(isRestricted ? 1 : 0, row.accessAllow),
  };
}

export async function getApiKeys() {
  const rows = await prisma.apiKey.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map(rowToKey);
}

export async function getApiKeyById(id) {
  if (!id) return null;
  const row = await prisma.apiKey.findUnique({
    where: { id },
  });
  return rowToKey(row);
}

// Used by the /v1 handlers to read the presented key's access settings.
export async function getApiKeyByKey(key) {
  if (!key) return null;
  const row = await prisma.apiKey.findUnique({
    where: { key },
  });
  return rowToKey(row);
}

export async function createApiKey(name, machineId) {
  if (!machineId) throw new Error("machineId is required");
  const { generateApiKeyWithMachine } = await import("../../../shared/utils/apiKey.js");
  const result = generateApiKeyWithMachine(machineId);

  const cols = keyAccessToColumns(KEY_ACCESS_UNRESTRICTED);
  const row = await prisma.apiKey.create({
    data: {
      id: uuidv4(),
      name,
      key: result.key,
      machineId,
      isActive: true,
      accessRestricted: String(cols.accessRestricted),
      accessAllow: String(cols.accessAllow),
    },
  });

  return rowToKey(row);
}

export async function updateApiKey(id, data) {
  if (!id) return null;
  const existing = await prisma.apiKey.findUnique({ where: { id } });
  if (!existing) return null;

  const current = rowToKey(existing);
  const merged = { ...current, ...data };
  const cols = keyAccessToColumns(merged.access);

  const updated = await prisma.apiKey.update({
    where: { id },
    data: {
      key: merged.key,
      name: merged.name,
      machineId: merged.machineId,
      isActive: merged.isActive === true,
      accessRestricted: String(cols.accessRestricted),
      accessAllow: String(cols.accessAllow),
    },
  });

  return rowToKey(updated);
}

export async function deleteApiKey(id) {
  if (!id) return false;
  try {
    await prisma.apiKey.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function validateApiKey(key) {
  if (!key) return false;
  const row = await prisma.apiKey.findUnique({
    where: { key },
    select: { isActive: true },
  });
  if (!row) return false;
  return row.isActive === true;
}
