import { v4 as uuidv4 } from "uuid";
import prisma from "../../../lib/prisma.js";
import { parseJson } from "../helpers/jsonCol.js";

const OPTIONAL_FIELDS = [
  "displayName", "email", "globalPriority", "defaultModel",
  "accessToken", "refreshToken", "expiresAt", "tokenType",
  "scope", "projectId", "apiKey", "testStatus",
  "lastTested", "lastError", "lastErrorAt", "rateLimitedUntil", "expiresIn", "errorCode",
  "consecutiveUseCount", "idToken", "lastRefreshAt",
];

const MODEL_LOCK_PREFIX = "modelLock_";

function resetHealthStateOnActivation(existing, patch) {
  if (patch?.testStatus !== "active") return patch;

  const normalized = {
    ...patch,
    testStatus: "active",
    lastError: Object.hasOwn(patch, "lastError") ? patch.lastError : null,
    lastErrorAt: Object.hasOwn(patch, "lastErrorAt") ? patch.lastErrorAt : null,
    errorCode: null,
    rateLimitedUntil: null,
    backoffLevel: 0,
  };

  for (const key of Object.keys(existing || {})) {
    if (key.startsWith(MODEL_LOCK_PREFIX)) normalized[key] = null;
  }

  return normalized;
}

function rowToConn(row) {
  if (!row) return null;
  const extra = typeof row.data === "string" ? parseJson(row.data, {}) : (row.data || {});
  return {
    ...extra,
    id: row.id,
    provider: row.provider,
    authType: row.authType,
    name: row.name,
    email: row.email,
    priority: row.priority,
    isActive: row.isActive === true || row.isActive === 1,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

function connToRow(c) {
  const { id, provider, authType, name, email, priority, isActive, createdAt, updatedAt, ...rest } = c;
  return {
    id,
    provider,
    authType,
    name: name ?? null,
    email: email ?? null,
    priority: priority ?? null,
    isActive: isActive !== false,
    data: rest,
    ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
    updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
  };
}

async function upsert(c) {
  const r = connToRow(c);
  return await prisma.providerConnection.upsert({
    where: { id: r.id },
    update: {
      provider: r.provider,
      authType: r.authType,
      name: r.name,
      email: r.email,
      priority: r.priority,
      isActive: r.isActive,
      data: r.data,
      updatedAt: r.updatedAt,
    },
    create: {
      id: r.id,
      provider: r.provider,
      authType: r.authType,
      name: r.name,
      email: r.email,
      priority: r.priority,
      isActive: r.isActive,
      data: r.data,
      createdAt: r.createdAt || new Date(),
      updatedAt: r.updatedAt,
    },
  });
}

function deriveConnectionName(data, fallbackName) {
  if (data.provider === "github") {
    return (
      data.providerSpecificData?.githubLogin ||
      data.providerSpecificData?.githubEmail ||
      data.email ||
      data.providerSpecificData?.githubName ||
      fallbackName
    );
  }
  return fallbackName;
}

export async function getProviderConnections(filter = {}) {
  const where = {};
  if (filter.provider) where.provider = filter.provider;
  if (filter.isActive !== undefined) where.isActive = Boolean(filter.isActive);

  const rows = await prisma.providerConnection.findMany({
    where,
    orderBy: { priority: "asc" },
  });

  const list = rows.map(rowToConn);
  list.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  return list;
}

export async function getProviderConnectionById(id) {
  if (!id) return null;
  const row = await prisma.providerConnection.findUnique({
    where: { id },
  });
  return rowToConn(row);
}

async function reorderInTx(providerId) {
  const rows = await prisma.providerConnection.findMany({
    where: { provider: providerId },
  });
  const list = rows.map(rowToConn);
  list.sort((a, b) => {
    const pDiff = (a.priority || 0) - (b.priority || 0);
    if (pDiff !== 0) return pDiff;
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });

  const updates = [];
  list.forEach((c, i) => {
    const want = i + 1;
    if ((c.priority || 0) !== want) {
      updates.push(
        prisma.providerConnection.update({
          where: { id: c.id },
          data: { priority: want },
        })
      );
    }
  });

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
}

export async function createProviderConnection(data) {
  const now = new Date().toISOString();
  const isApikey = data.authType === "apikey" && !!data.name;

  const allRows = isApikey
    ? await prisma.providerConnection.findMany({
        where: {
          provider: data.provider,
          authType: "apikey",
          name: data.name,
        },
      })
    : await prisma.providerConnection.findMany({
        where: { provider: data.provider },
      });

  const all = allRows.map(rowToConn);
  const poolSize = isApikey
    ? await prisma.providerConnection.count({ where: { provider: data.provider } })
    : all.length;

  let existing = null;
  if (data.authType === "oauth" && data.email) {
    const incomingUsername = data.providerSpecificData?.username;
    const incomingWs = data.providerSpecificData?.chatgptAccountId;
    existing = all.find((c) => {
      if (c.authType !== "oauth" || c.email !== data.email) return false;
      if (data.provider === "codex") {
        const existingWs = c.providerSpecificData?.chatgptAccountId;
        return !!incomingWs && !!existingWs && incomingWs === existingWs;
      }
      const existingWs = c.providerSpecificData?.chatgptAccountId;
      if (incomingWs && existingWs) return incomingWs === existingWs;
      if (incomingWs && !existingWs) return false;
      if (!incomingWs && existingWs) return false;
      const existingUsername = c.providerSpecificData?.username;
      if (incomingUsername && existingUsername) {
        return incomingUsername === existingUsername;
      }
      if (incomingUsername || existingUsername) return false;
      return true;
    });
  } else if (data.authType === "apikey" && data.name) {
    existing = all.find((c) => c.authType === "apikey" && c.name === data.name);
  }

  if (existing) {
    if (data.allowOverwrite === false) {
      const err = new Error(
        `A connection named "${existing.name}" already exists for provider "${data.provider}". ` +
        `Pass allowOverwrite: true to replace it.`
      );
      err.code = "PROVIDER_NAME_CONFLICT";
      err.existingId = existing.id;
      err.existingName = existing.name;
      throw err;
    }
    const normalized = resetHealthStateOnActivation(existing, data);
    const merged = { ...existing, ...normalized, updatedAt: now };
    await upsert(merged);
    return merged;
  }

  let connectionName = data.name || null;
  if (!connectionName && (data.authType === "oauth" || data.authType === "access_token")) {
    connectionName = deriveConnectionName(data, data.email || `Account ${poolSize + 1}`);
  }

  let connectionPriority = data.priority;
  if (!connectionPriority) {
    const maxAgg = await prisma.providerConnection.aggregate({
      where: { provider: data.provider },
      _max: { priority: true },
    });
    connectionPriority = (maxAgg?._max?.priority || 0) + 1;
  }

  const conn = {
    id: uuidv4(),
    provider: data.provider,
    authType: data.authType || "oauth",
    name: connectionName,
    priority: connectionPriority,
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: now,
    updatedAt: now,
  };

  for (const f of OPTIONAL_FIELDS) {
    if (data[f] !== undefined && data[f] !== null) conn[f] = data[f];
  }
  if (data.providerSpecificData && Object.keys(data.providerSpecificData).length > 0) {
    conn.providerSpecificData = data.providerSpecificData;
  }
  if (data.email !== undefined) conn.email = data.email;

  await upsert(conn);
  return conn;
}

export async function updateProviderConnection(id, data) {
  if (!id) return null;
  const row = await prisma.providerConnection.findUnique({ where: { id } });
  if (!row) return null;

  const existing = rowToConn(row);
  const normalized = resetHealthStateOnActivation(existing, data);
  const merged = { ...existing, ...normalized, updatedAt: new Date().toISOString() };

  await upsert(merged);
  if (data.priority !== undefined) {
    await reorderInTx(existing.provider);
  }
  return merged;
}

export async function deleteProviderConnection(id) {
  if (!id) return false;
  const row = await prisma.providerConnection.findUnique({
    where: { id },
    select: { provider: true },
  });
  if (!row) return false;

  await prisma.providerConnection.delete({ where: { id } });
  await reorderInTx(row.provider);
  return true;
}

export async function deleteProviderConnectionsByProvider(providerId) {
  if (!providerId) return 0;
  const res = await prisma.providerConnection.deleteMany({
    where: { provider: providerId },
  });
  return res.count;
}

export async function reorderProviderConnections(providerId) {
  if (!providerId) return;
  await reorderInTx(providerId);
}

export async function cleanupProviderConnections() {
  const fieldsToCheck = [
    "displayName", "email", "globalPriority", "defaultModel",
    "accessToken", "refreshToken", "expiresAt", "tokenType",
    "scope", "projectId", "apiKey", "testStatus",
    "lastTested", "lastError", "lastErrorAt", "rateLimitedUntil", "expiresIn",
    "consecutiveUseCount",
  ];
  let cleaned = 0;
  const rows = await prisma.providerConnection.findMany();

  for (const row of rows) {
    const conn = rowToConn(row);
    let dirty = false;
    for (const f of fieldsToCheck) {
      if (conn[f] === null || conn[f] === undefined) {
        if (f in conn) { delete conn[f]; cleaned++; dirty = true; }
      }
    }
    if (conn.providerSpecificData && Object.keys(conn.providerSpecificData).length === 0) {
      delete conn.providerSpecificData;
      cleaned++;
      dirty = true;
    }
    if (dirty) await upsert(conn);
  }
  return cleaned;
}
