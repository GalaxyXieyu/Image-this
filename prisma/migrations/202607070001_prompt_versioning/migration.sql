-- 提示词版本管理 + 对比实验：新增 activeVersionId 与三张表，并为存量模板回填 v1

-- AlterTable
ALTER TABLE "prompt_templates" ADD COLUMN "activeVersionId" TEXT;

-- CreateTable
CREATE TABLE "prompt_template_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "label" TEXT,
    "content" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prompt_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "prompt_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "prompt_comparisons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testImageUrl" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prompt_comparisons_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "prompt_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "prompt_comparison_cells" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comparisonId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "taskId" TEXT,
    "processedImageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prompt_comparison_cells_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "prompt_comparisons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "prompt_template_versions_templateId_versionNo_idx" ON "prompt_template_versions"("templateId", "versionNo");

-- CreateIndex
CREATE INDEX "prompt_comparisons_templateId_createdAt_idx" ON "prompt_comparisons"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "prompt_comparison_cells_comparisonId_idx" ON "prompt_comparison_cells"("comparisonId");

-- Backfill: 为每个存量模板创建 v1（内容=当前 prompt），并设为当前生效版本
INSERT INTO "prompt_template_versions" ("id", "templateId", "userId", "versionNo", "content", "createdAt")
SELECT "id" || '-v1', "id", "userId", 1, "prompt", "createdAt" FROM "prompt_templates";

UPDATE "prompt_templates" SET "activeVersionId" = "id" || '-v1';
