/*
  Warnings:

  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bot_api_keys` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usage_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bot_api_keys" DROP CONSTRAINT "bot_api_keys_botId_fkey";

-- DropForeignKey
ALTER TABLE "usage_logs" DROP CONSTRAINT "usage_logs_apiKeyId_fkey";

-- DropForeignKey
ALTER TABLE "usage_logs" DROP CONSTRAINT "usage_logs_botId_fkey";

-- DropTable
DROP TABLE "audit_logs";

-- DropTable
DROP TABLE "bot_api_keys";

-- DropTable
DROP TABLE "bots";

-- DropTable
DROP TABLE "usage_logs";
