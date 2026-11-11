-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providerConnections" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "priority" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providerConnections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providerNodes" (
    "id" TEXT NOT NULL,
    "type" TEXT,
    "name" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providerNodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proxyPools" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "testStatus" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proxyPools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apiKeys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT,
    "machineId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "accessRestricted" TEXT DEFAULT 'unrestricted',
    "accessAllow" TEXT DEFAULT 'all',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apiKeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT,
    "models" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kv" (
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "kv_pkey" PRIMARY KEY ("scope","key")
);

-- CreateTable
CREATE TABLE "requestDetails" (
    "id" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "connectionId" TEXT,
    "status" TEXT,
    "data" JSONB NOT NULL,

    CONSTRAINT "requestDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usageHistory" (
    "id" SERIAL NOT NULL,
    "timestamp" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "connectionId" TEXT,
    "apiKey" TEXT,
    "endpoint" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT,
    "tokens" TEXT,
    "meta" TEXT,

    CONSTRAINT "usageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usageDaily" (
    "dateKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "usageDaily_pkey" PRIMARY KEY ("dateKey")
);

-- CreateTable
CREATE TABLE "bots" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "tone" TEXT,
    "language" TEXT,
    "topicRules" JSONB,
    "greeting" TEXT,
    "model" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "knowledgeText" TEXT,
    "inputModes" JSONB NOT NULL DEFAULT '["text"]',
    "maxInputChars" INTEGER,
    "dailyCostLimit" DOUBLE PRECISION,
    "visibility" TEXT NOT NULL DEFAULT 'internal',
    "allowedOrigins" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_api_keys" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL DEFAULT 'default',
    "botId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "botId" TEXT,
    "apiKeyId" TEXT,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "firstTokenMs" INTEGER NOT NULL DEFAULT 0,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "hasImage" BOOLEAN NOT NULL DEFAULT false,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "sessionRef" TEXT,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "providerConnections_provider_idx" ON "providerConnections"("provider");

-- CreateIndex
CREATE INDEX "providerConnections_provider_isActive_idx" ON "providerConnections"("provider", "isActive");

-- CreateIndex
CREATE INDEX "providerConnections_provider_priority_idx" ON "providerConnections"("provider", "priority");

-- CreateIndex
CREATE INDEX "providerNodes_type_idx" ON "providerNodes"("type");

-- CreateIndex
CREATE INDEX "proxyPools_isActive_idx" ON "proxyPools"("isActive");

-- CreateIndex
CREATE INDEX "proxyPools_testStatus_idx" ON "proxyPools"("testStatus");

-- CreateIndex
CREATE UNIQUE INDEX "apiKeys_key_key" ON "apiKeys"("key");

-- CreateIndex
CREATE INDEX "apiKeys_key_idx" ON "apiKeys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "combos_name_key" ON "combos"("name");

-- CreateIndex
CREATE INDEX "combos_name_idx" ON "combos"("name");

-- CreateIndex
CREATE INDEX "kv_scope_idx" ON "kv"("scope");

-- CreateIndex
CREATE INDEX "requestDetails_timestamp_idx" ON "requestDetails"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "requestDetails_provider_idx" ON "requestDetails"("provider");

-- CreateIndex
CREATE INDEX "requestDetails_model_idx" ON "requestDetails"("model");

-- CreateIndex
CREATE INDEX "requestDetails_connectionId_idx" ON "requestDetails"("connectionId");

-- CreateIndex
CREATE INDEX "usageHistory_timestamp_idx" ON "usageHistory"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "usageHistory_provider_idx" ON "usageHistory"("provider");

-- CreateIndex
CREATE INDEX "usageHistory_model_idx" ON "usageHistory"("model");

-- CreateIndex
CREATE INDEX "usageHistory_connectionId_idx" ON "usageHistory"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "bots_productId_name_key" ON "bots"("productId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "bot_api_keys_keyHash_key" ON "bot_api_keys"("keyHash");

-- AddForeignKey
ALTER TABLE "bot_api_keys" ADD CONSTRAINT "bot_api_keys_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "bot_api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
