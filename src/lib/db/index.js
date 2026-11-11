// Public API barrel — all DB functions
import prisma from "../prisma.js";
import { stringifyJson, parseJson } from "./helpers/jsonCol.js";
import { keyAccessFromColumns, keyAccessToColumns, validateKeyAccessInput } from "../../shared/utils/keyAccess.js";
import { KEY_ACCESS_UNRESTRICTED } from "../../shared/constants/keyAccess.js";

// Settings
export {
  getSettings, updateSettings, isCloudEnabled, getCloudUrl, exportSettings,
} from "./repos/settingsRepo.js";

// Provider connections
export {
  getProviderConnections, getProviderConnectionById,
  createProviderConnection, updateProviderConnection,
  deleteProviderConnection, deleteProviderConnectionsByProvider,
  reorderProviderConnections, cleanupProviderConnections,
} from "./repos/connectionsRepo.js";

// Provider nodes
export {
  getProviderNodes, getProviderNodeById,
  createProviderNode, updateProviderNode, deleteProviderNode,
} from "./repos/nodesRepo.js";

// API keys
export {
  getApiKeys, getApiKeyById, getApiKeyByKey, createApiKey, updateApiKey, deleteApiKey, validateApiKey,
} from "./repos/apiKeysRepo.js";

// Combos
export {
  getCombos, getComboById, getComboByName,
  createCombo, updateCombo, deleteCombo,
} from "./repos/combosRepo.js";

// Aliases (model + custom + mitm)
export {
  getModelAliases, setModelAlias, deleteModelAlias,
  getCustomModels, addCustomModel, deleteCustomModel,
  getMitmAlias, setMitmAliasAll,
} from "./repos/aliasRepo.js";

// Pricing
export {
  getPricing, getPricingForModel, updatePricing, resetPricing, resetAllPricing,
} from "./repos/pricingRepo.js";

// Disabled models
export {
  getDisabledModels, getDisabledByProvider, disableModels, enableModels,
} from "./repos/disabledModelsRepo.js";

// Usage
export {
  statsEmitter, trackPendingRequest, getActiveRequests,
  saveRequestUsage, getUsageHistory, getUsageStats, getChartData,
  appendRequestLog, getRecentLogs,
} from "./repos/usageRepo.js";

// Request details
export {
  saveRequestDetail, getRequestDetails, getRequestDetailById, getDistinctProviders,
} from "./repos/requestDetailsRepo.js";

// Export/import full DB
export async function exportDb() {
  const { exportSettings } = await import("./repos/settingsRepo.js");

  const [
    settings,
    providerConnections,
    providerNodes,
    apiKeys,
    combos,
    kvs,
  ] = await Promise.all([
    exportSettings(),
    prisma.providerConnection.findMany(),
    prisma.providerNode.findMany(),
    prisma.apiKey.findMany(),
    prisma.combo.findMany(),
    prisma.kv.findMany(),
  ]);

  const out = {
    settings,
    providerConnections: providerConnections.map((r) => {
      const extra = typeof r.data === "string" ? parseJson(r.data, {}) : (r.data || {});
      return {
        ...extra,
        id: r.id,
        provider: r.provider,
        authType: r.authType,
        name: r.name,
        email: r.email,
        priority: r.priority,
        isActive: r.isActive === true,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
      };
    }),
    providerNodes: providerNodes.map((r) => {
      const extra = typeof r.data === "string" ? parseJson(r.data, {}) : (r.data || {});
      return {
        ...extra,
        id: r.id,
        type: r.type,
        name: r.name,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
      };
    }),
    apiKeys: apiKeys.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      machineId: r.machineId,
      isActive: r.isActive === true,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      access: keyAccessFromColumns(r.accessRestricted, r.accessAllow),
    })),
    combos: combos.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      models: typeof r.models === "string" ? parseJson(r.models, []) : (r.models || []),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    })),
    modelAliases: {},
    customModels: [],
    mitmAlias: {},
    pricing: {},
  };

  for (const r of kvs) {
    const val = typeof r.value === "string" ? parseJson(r.value, r.value) : r.value;
    if (r.scope === "modelAliases") out.modelAliases[r.key] = val;
    else if (r.scope === "customModels") out.customModels.push(val);
    else if (r.scope === "mitmAlias") out.mitmAlias[r.key] = val;
    else if (r.scope === "pricing") out.pricing[r.key] = val;
  }

  return out;
}

export async function importDb(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid database payload");
  }

  await prisma.$transaction(async (tx) => {
    // Wipe tables
    await tx.setting.deleteMany();
    await tx.providerConnection.deleteMany();
    await tx.providerNode.deleteMany();
    await tx.apiKey.deleteMany();
    await tx.combo.deleteMany();
    await tx.kv.deleteMany({
      where: { scope: { in: ["modelAliases", "customModels", "mitmAlias", "pricing"] } },
    });

    if (payload.settings) {
      await tx.setting.upsert({
        where: { id: 1 },
        update: { data: payload.settings },
        create: { id: 1, data: payload.settings },
      });
    }

    for (const c of payload.providerConnections || []) {
      const { id, provider, authType, name, email, priority, isActive, createdAt, updatedAt, ...rest } = c;
      await tx.providerConnection.create({
        data: {
          id: id || undefined,
          provider,
          authType: authType || "oauth",
          name: name || null,
          email: email || null,
          priority: priority ?? null,
          isActive: isActive !== false,
          data: rest,
          createdAt: createdAt ? new Date(createdAt) : undefined,
          updatedAt: updatedAt ? new Date(updatedAt) : undefined,
        },
      });
    }

    for (const n of payload.providerNodes || []) {
      const { id, type, name, createdAt, updatedAt, ...rest } = n;
      await tx.providerNode.create({
        data: {
          id: id || undefined,
          type: type || null,
          name: name || null,
          data: rest,
          createdAt: createdAt ? new Date(createdAt) : undefined,
          updatedAt: updatedAt ? new Date(updatedAt) : undefined,
        },
      });
    }

    for (const k of payload.apiKeys || []) {
      let access = KEY_ACCESS_UNRESTRICTED;
      if (k.access !== undefined) {
        const checked = validateKeyAccessInput(k.access);
        if (!checked.ok) throw new Error(`apiKeys ${k.id}: ${checked.error}`);
        access = checked.value;
      }
      const cols = keyAccessToColumns(access);
      await tx.apiKey.create({
        data: {
          id: k.id || undefined,
          key: k.key,
          name: k.name || null,
          machineId: k.machineId || null,
          isActive: k.isActive !== false,
          accessRestricted: cols.accessRestricted,
          accessAllow: cols.accessAllow,
          createdAt: k.createdAt ? new Date(k.createdAt) : undefined,
        },
      });
    }

    for (const c of payload.combos || []) {
      await tx.combo.create({
        data: {
          id: c.id || undefined,
          name: c.name,
          kind: c.kind || null,
          models: c.models || [],
          createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
        },
      });
    }

    for (const [a, m] of Object.entries(payload.modelAliases || {})) {
      await tx.kv.upsert({
        where: { scope_key: { scope: "modelAliases", key: a } },
        update: { value: stringifyJson(m) },
        create: { scope: "modelAliases", key: a, value: stringifyJson(m) },
      });
    }

    for (const m of payload.customModels || []) {
      const k = `${m.providerAlias}|${m.id}|${m.type || "llm"}`;
      await tx.kv.upsert({
        where: { scope_key: { scope: "customModels", key: k } },
        update: { value: stringifyJson(m) },
        create: { scope: "customModels", key: k, value: stringifyJson(m) },
      });
    }

    for (const [tool, mappings] of Object.entries(payload.mitmAlias || {})) {
      await tx.kv.upsert({
        where: { scope_key: { scope: "mitmAlias", key: tool } },
        update: { value: stringifyJson(mappings || {}) },
        create: { scope: "mitmAlias", key: tool, value: stringifyJson(mappings || {}) },
      });
    }

    for (const [provider, models] of Object.entries(payload.pricing || {})) {
      await tx.kv.upsert({
        where: { scope_key: { scope: "pricing", key: provider } },
        update: { value: stringifyJson(models || {}) },
        create: { scope: "pricing", key: provider, value: stringifyJson(models || {}) },
      });
    }
  });

  return await exportDb();
}

export async function initDb() {
  await prisma.$connect();
}
