-- 幂等回填：为「没有任何版本」的提示词模板补一个 v1，并把 activeVersionId 指向它。
-- 背景：生产部署用 `prisma db push`（只同步 schema，不跑 migration 文件），
--       所以迁移 202607070001 里的 v1 回填不会在生产执行，已有模板需在部署时单独补。
-- 安全性：只处理无版本的模板，可反复执行（每次部署都跑）。

INSERT INTO "prompt_template_versions" ("id", "templateId", "userId", "versionNo", "label", "content", "createdAt")
SELECT t."id" || '-v1', t."id", t."userId", 1, 'v1', t."prompt", t."createdAt"
FROM "prompt_templates" t
WHERE NOT EXISTS (
  SELECT 1 FROM "prompt_template_versions" v WHERE v."templateId" = t."id"
);

UPDATE "prompt_templates"
SET "activeVersionId" = "id" || '-v1'
WHERE "activeVersionId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "prompt_template_versions" v WHERE v."id" = "prompt_templates"."id" || '-v1'
  );
