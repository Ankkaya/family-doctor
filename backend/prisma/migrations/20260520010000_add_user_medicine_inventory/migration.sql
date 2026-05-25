CREATE TABLE IF NOT EXISTS "user_medicine_inventory" (
  "id" TEXT NOT NULL,
  "dev_user_id" TEXT NOT NULL,
  "medicine_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "expire_at" DATE,
  "source" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_medicine_inventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_medicine_inventory_medicine_id_fkey"
    FOREIGN KEY ("medicine_id") REFERENCES "medicine_catalog"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_medicine_inventory_dev_user_id_medicine_id_key"
  ON "user_medicine_inventory"("dev_user_id", "medicine_id");
CREATE INDEX IF NOT EXISTS "user_medicine_inventory_dev_user_id_idx"
  ON "user_medicine_inventory"("dev_user_id");
CREATE INDEX IF NOT EXISTS "user_medicine_inventory_medicine_id_idx"
  ON "user_medicine_inventory"("medicine_id");
