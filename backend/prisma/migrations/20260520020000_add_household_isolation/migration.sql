CREATE TABLE IF NOT EXISTS "app_user" (
  "id" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "nickname" TEXT,
  "avatar_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "default_household_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "app_user_phone_idx" ON "app_user"("phone");
CREATE INDEX IF NOT EXISTS "app_user_email_idx" ON "app_user"("email");
CREATE INDEX IF NOT EXISTS "app_user_default_household_id_idx" ON "app_user"("default_household_id");
CREATE INDEX IF NOT EXISTS "app_user_deleted_at_idx" ON "app_user"("deleted_at");
CREATE UNIQUE INDEX IF NOT EXISTS "app_user_phone_active_key"
  ON "app_user"("phone")
  WHERE "phone" IS NOT NULL AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "app_user_email_active_key"
  ON "app_user"("email")
  WHERE "email" IS NOT NULL AND "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "household" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "owner_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "household_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "household_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "app_user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "household_owner_user_id_idx" ON "household"("owner_user_id");
CREATE INDEX IF NOT EXISTS "household_deleted_at_idx" ON "household"("deleted_at");

DO $$ BEGIN
  ALTER TABLE "app_user"
    ADD CONSTRAINT "app_user_default_household_id_fkey"
    FOREIGN KEY ("default_household_id") REFERENCES "household"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "household_member" (
  "id" TEXT NOT NULL,
  "household_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "display_name" TEXT,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "household_member_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "household_member_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "household"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "household_member_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "app_user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "household_member_household_id_idx" ON "household_member"("household_id");
CREATE INDEX IF NOT EXISTS "household_member_user_id_idx" ON "household_member"("user_id");
CREATE INDEX IF NOT EXISTS "household_member_deleted_at_idx" ON "household_member"("deleted_at");
CREATE UNIQUE INDEX IF NOT EXISTS "household_member_active_user_key"
  ON "household_member"("household_id", "user_id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "household_medicine_inventory" (
  "id" TEXT NOT NULL,
  "household_id" TEXT NOT NULL,
  "medicine_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "expire_at" DATE,
  "source" TEXT,
  "notes" TEXT,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "household_medicine_inventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "household_medicine_inventory_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "household"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "household_medicine_inventory_medicine_id_fkey"
    FOREIGN KEY ("medicine_id") REFERENCES "medicine_catalog"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "household_medicine_inventory_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "app_user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "household_medicine_inventory_household_id_idx"
  ON "household_medicine_inventory"("household_id");
CREATE INDEX IF NOT EXISTS "household_medicine_inventory_medicine_id_idx"
  ON "household_medicine_inventory"("medicine_id");
CREATE INDEX IF NOT EXISTS "household_medicine_inventory_created_by_idx"
  ON "household_medicine_inventory"("created_by");
CREATE INDEX IF NOT EXISTS "household_medicine_inventory_expire_at_idx"
  ON "household_medicine_inventory"("expire_at");
CREATE INDEX IF NOT EXISTS "household_medicine_inventory_deleted_at_idx"
  ON "household_medicine_inventory"("deleted_at");

ALTER TABLE "consultation_session"
  ADD COLUMN IF NOT EXISTS "user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "household_id" TEXT;

ALTER TABLE "consultation_session"
  ALTER COLUMN "dev_user_id" DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE "consultation_session"
    ADD CONSTRAINT "consultation_session_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "app_user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "consultation_session"
    ADD CONSTRAINT "consultation_session_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "household"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "consultation_session_household_id_created_at_idx"
  ON "consultation_session"("household_id", "created_at");
CREATE INDEX IF NOT EXISTS "consultation_session_user_id_created_at_idx"
  ON "consultation_session"("user_id", "created_at");

INSERT INTO "app_user" (
  "id",
  "nickname",
  "status"
)
VALUES (
  'local-dev-user',
  '本地示例用户',
  'active'
)
ON CONFLICT ("id") DO UPDATE SET
  "nickname" = EXCLUDED."nickname",
  "status" = EXCLUDED."status",
  "deleted_at" = NULL,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "household" (
  "id",
  "name",
  "owner_user_id"
)
VALUES (
  'local-dev-household',
  '本地示例家庭',
  'local-dev-user'
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "owner_user_id" = EXCLUDED."owner_user_id",
  "deleted_at" = NULL,
  "updated_at" = CURRENT_TIMESTAMP;

UPDATE "app_user"
SET "default_household_id" = 'local-dev-household',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 'local-dev-user';

INSERT INTO "household_member" (
  "id",
  "household_id",
  "user_id",
  "role",
  "display_name"
)
VALUES (
  'local-dev-household-owner',
  'local-dev-household',
  'local-dev-user',
  'owner',
  '本地示例用户'
)
ON CONFLICT ("id") DO UPDATE SET
  "household_id" = EXCLUDED."household_id",
  "user_id" = EXCLUDED."user_id",
  "role" = EXCLUDED."role",
  "display_name" = EXCLUDED."display_name",
  "deleted_at" = NULL;

INSERT INTO "household_medicine_inventory" (
  "id",
  "household_id",
  "medicine_id",
  "quantity",
  "expire_at",
  "source",
  "notes",
  "created_by",
  "created_at",
  "updated_at"
)
SELECT
  'hh-' || "id",
  'local-dev-household',
  "medicine_id",
  "quantity",
  "expire_at",
  "source",
  "notes",
  'local-dev-user',
  "created_at",
  "updated_at"
FROM "user_medicine_inventory"
WHERE "dev_user_id" = 'local-dev'
ON CONFLICT ("id") DO UPDATE SET
  "household_id" = EXCLUDED."household_id",
  "medicine_id" = EXCLUDED."medicine_id",
  "quantity" = EXCLUDED."quantity",
  "expire_at" = EXCLUDED."expire_at",
  "source" = EXCLUDED."source",
  "notes" = EXCLUDED."notes",
  "created_by" = EXCLUDED."created_by",
  "updated_at" = EXCLUDED."updated_at",
  "deleted_at" = NULL;

UPDATE "consultation_session"
SET "user_id" = 'local-dev-user',
    "household_id" = 'local-dev-household'
WHERE "dev_user_id" = 'local-dev'
  AND ("user_id" IS NULL OR "household_id" IS NULL);
