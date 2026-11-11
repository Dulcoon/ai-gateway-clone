import prisma from "../../prisma.js";
import { parseJson } from "../helpers/jsonCol.js";

const DEFAULT_MAX_RECORDS = 200;
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_FLUSH_INTERVAL_MS = 5000;
const DEFAULT_MAX_JSON_SIZE = 5 * 1024;
const CONFIG_CACHE_TTL_MS = 5000;

let cachedConfig = null;
let cachedConfigTs = 0;

async function getObservabilityConfig() {
  if (cachedConfig && (Date.now() - cachedConfigTs) < CONFIG_CACHE_TTL_MS) return cachedConfig;
  try {
    const { getSettings } = await import("./settingsRepo.js");
    const settings = await getSettings();
    const envRequestLogs = process.env.ENABLE_REQUEST_LOGS;
    if (envRequestLogs !== undefined) {
      const enabled = envRequestLogs.toLowerCase() === "true";
      cachedConfig = {
        enabled,
        maxRecords: settings.observabilityMaxRecords || parseInt(process.env.OBSERVABILITY_MAX_RECORDS || String(DEFAULT_MAX_RECORDS), 10),
        batchSize: settings.observabilityBatchSize || parseInt(process.env.OBSERVABILITY_BATCH_SIZE || String(DEFAULT_BATCH_SIZE), 10),
        flushIntervalMs: settings.observabilityFlushIntervalMs || parseInt(process.env.OBSERVABILITY_FLUSH_INTERVAL_MS || String(DEFAULT_FLUSH_INTERVAL_MS), 10),
        maxJsonSize: (settings.observabilityMaxJsonSize || parseInt(process.env.OBSERVABILITY_MAX_JSON_SIZE || "5", 10)) * 1024,
      };
      cachedConfigTs = Date.now();
      return cachedConfig;
    }
    const envFallback = process.env.OBSERVABILITY_ENABLED !== "false";
    const uiFlag = typeof settings.enableObservability === "boolean";
    const enabled = uiFlag
      ? settings.enableObservability
      : envFallback;

    cachedConfig = {
      enabled,
      maxRecords: settings.observabilityMaxRecords || parseInt(process.env.OBSERVABILITY_MAX_RECORDS || String(DEFAULT_MAX_RECORDS), 10),
      batchSize: settings.observabilityBatchSize || parseInt(process.env.OBSERVABILITY_BATCH_SIZE || String(DEFAULT_BATCH_SIZE), 10),
      flushIntervalMs: settings.observabilityFlushIntervalMs || parseInt(process.env.OBSERVABILITY_FLUSH_INTERVAL_MS || String(DEFAULT_FLUSH_INTERVAL_MS), 10),
      maxJsonSize: (settings.observabilityMaxJsonSize || parseInt(process.env.OBSERVABILITY_MAX_JSON_SIZE || "5", 10)) * 1024,
    };
  } catch {
    cachedConfig = {
      enabled: false,
      maxRecords: DEFAULT_MAX_RECORDS,
      batchSize: DEFAULT_BATCH_SIZE,
      flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
      maxJsonSize: DEFAULT_MAX_JSON_SIZE,
    };
  }
  cachedConfigTs = Date.now();
  return cachedConfig;
}

let writeBuffer = [];
let flushTimer = null;
let isFlushing = false;

function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== "object") return {};
  const sensitiveKeys = ["authorization", "x-api-key", "cookie", "token", "api-key"];
  const sanitized = { ...headers };
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) delete sanitized[key];
  }
  return sanitized;
}

export const __test__ = { sanitizeHeaders };

function generateDetailId(model) {
  const timestamp = new Date().toISOString();
  const random = Math.random().toString(36).substring(2, 8);
  const modelPart = model ? model.replace(/[^a-zA-Z0-9-]/g, "-") : "unknown";
  return `${timestamp}-${random}-${modelPart}`;
}

function truncateField(obj, maxSize) {
  const str = JSON.stringify(obj || {});
  if (str.length > maxSize) {
    return { _truncated: true, _originalSize: str.length, _preview: str.substring(0, 200) };
  }
  return obj || {};
}

async function flushToDatabase() {
  if (isFlushing) return;
  if (writeBuffer.length === 0) return;
  isFlushing = true;
  try {
    while (writeBuffer.length > 0) {
      const items = writeBuffer.splice(0, writeBuffer.length);
      const config = await getObservabilityConfig();

      const recordsToInsert = [];
      for (const item of items) {
        if (!item.id) item.id = generateDetailId(item.model);
        if (!item.timestamp) item.timestamp = new Date().toISOString();
        if (item.request?.headers) item.request.headers = sanitizeHeaders(item.request.headers);

        const record = {
          id: item.id,
          provider: item.provider || null,
          model: item.model || null,
          connectionId: item.connectionId || null,
          timestamp: item.timestamp,
          status: item.status || null,
          latency: item.latency || {},
          tokens: item.tokens || {},
          request: truncateField(item.request, config.maxJsonSize),
          providerRequest: truncateField(item.providerRequest, config.maxJsonSize),
          providerResponse: truncateField(item.providerResponse, config.maxJsonSize),
          response: truncateField(item.response, config.maxJsonSize),
          pxpipe: item.pxpipe || undefined,
        };

        recordsToInsert.push({
          id: record.id,
          timestamp: record.timestamp,
          provider: record.provider,
          model: record.model,
          connectionId: record.connectionId,
          status: record.status,
          data: record,
        });
      }

      if (recordsToInsert.length > 0) {
        await prisma.requestDetail.createMany({
          data: recordsToInsert,
          skipDuplicates: true,
        });
      }

      const count = await prisma.requestDetail.count();
      if (count > config.maxRecords) {
        const toDelete = count - config.maxRecords;
        const oldest = await prisma.requestDetail.findMany({
          select: { id: true },
          orderBy: { timestamp: "asc" },
          take: toDelete,
        });
        if (oldest.length > 0) {
          await prisma.requestDetail.deleteMany({
            where: { id: { in: oldest.map((o) => o.id) } },
          });
        }
      }
    }
  } catch (e) {
    console.error("[requestDetailsRepo] Batch write failed:", e);
  } finally {
    isFlushing = false;
  }
}

export async function saveRequestDetail(detail) {
  const config = await getObservabilityConfig();
  if (!config.enabled) return;

  writeBuffer.push(detail);

  if (writeBuffer.length >= config.batchSize) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    flushToDatabase().catch((e) => console.error("[requestDetailsRepo] flush err:", e));
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushToDatabase().catch(() => {});
    }, config.flushIntervalMs);
  }
}

export async function getRequestDetails(filter = {}) {
  const where = {};
  if (filter.provider) where.provider = filter.provider;
  if (filter.model) where.model = filter.model;
  if (filter.connectionId) where.connectionId = filter.connectionId;
  if (filter.status) where.status = filter.status;
  if (filter.startDate || filter.endDate) {
    where.timestamp = {};
    if (filter.startDate) where.timestamp.gte = new Date(filter.startDate).toISOString();
    if (filter.endDate) where.timestamp.lte = new Date(filter.endDate).toISOString();
  }

  const totalItems = await prisma.requestDetail.count({ where });
  const page = filter.page || 1;
  const pageSize = filter.pageSize || 50;
  const totalPages = Math.ceil(totalItems / pageSize);
  const skip = (page - 1) * pageSize;

  const rows = await prisma.requestDetail.findMany({
    where,
    select: { data: true },
    orderBy: { timestamp: "desc" },
    skip,
    take: pageSize,
  });

  const details = rows.map((r) => (typeof r.data === "string" ? parseJson(r.data, {}) : (r.data || {})));

  return {
    details,
    pagination: { page, pageSize, totalItems, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  };
}

export async function getDistinctProviders() {
  const rows = await prisma.requestDetail.findMany({
    where: { provider: { not: null } },
    select: { provider: true },
    distinct: ["provider"],
    orderBy: { provider: "asc" },
  });
  return rows.map((r) => r.provider).filter(Boolean);
}

export async function getRequestDetailById(id) {
  const row = await prisma.requestDetail.findUnique({
    where: { id },
    select: { data: true },
  });
  if (!row) return null;
  return typeof row.data === "string" ? parseJson(row.data, null) : (row.data || null);
}

const _shutdownHandler = async () => {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (writeBuffer.length > 0) await flushToDatabase();
};

function ensureShutdownHandler() {
  process.off("beforeExit", _shutdownHandler);
  process.off("SIGINT", _shutdownHandler);
  process.off("SIGTERM", _shutdownHandler);
  process.off("exit", _shutdownHandler);

  process.on("beforeExit", _shutdownHandler);
  process.on("SIGINT", _shutdownHandler);
  process.on("SIGTERM", _shutdownHandler);
  process.on("exit", _shutdownHandler);
}

ensureShutdownHandler();
