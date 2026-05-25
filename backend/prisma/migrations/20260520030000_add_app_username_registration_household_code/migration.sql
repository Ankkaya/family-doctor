ALTER TABLE "app_user"
  ADD COLUMN IF NOT EXISTS "username" TEXT,
  ADD COLUMN IF NOT EXISTS "password_hash" TEXT;

CREATE INDEX IF NOT EXISTS "app_user_username_idx" ON "app_user"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "app_user_username_active_key"
  ON "app_user"("username")
  WHERE "username" IS NOT NULL AND "deleted_at" IS NULL;

ALTER TABLE "household"
  ADD COLUMN IF NOT EXISTS "code" TEXT;

WITH missing_code AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "created_at", "id") AS rn
  FROM "household"
  WHERE "code" IS NULL
)
UPDATE "household" h
SET "code" = UPPER(SUBSTRING(MD5(h."id" || missing_code.rn::text), 1, 6))
FROM missing_code
WHERE h."id" = missing_code."id";

ALTER TABLE "household"
  ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "household_code_key" ON "household"("code");

INSERT INTO "SystemSetting" (
  "key",
  "name",
  "value",
  "category",
  "description",
  "updatedAt"
)
VALUES (
  'app_registration_policy',
  'App 注册码策略',
  '{"code":"REG2026","enabled":true,"maxActivations":100,"usedActivations":0,"expiresAt":"2099-12-31T23:59:59+08:00"}'::jsonb,
  'app',
  'App 用户注册时校验的系统注册码、激活上限和有效期',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;
