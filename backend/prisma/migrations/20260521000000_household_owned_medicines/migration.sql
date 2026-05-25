ALTER TABLE "household_medicine_inventory"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "otc" "OtcType",
  ADD COLUMN IF NOT EXISTS "indication" TEXT,
  ADD COLUMN IF NOT EXISTS "contraindication" TEXT,
  ADD COLUMN IF NOT EXISTS "adverse_reaction" TEXT,
  ADD COLUMN IF NOT EXISTS "dosage" TEXT,
  ADD COLUMN IF NOT EXISTS "barcode" TEXT,
  ADD COLUMN IF NOT EXISTS "approval_number" TEXT;

UPDATE "household_medicine_inventory" i
SET
  "name" = COALESCE(i."name", m."name"),
  "aliases" = COALESCE(NULLIF(i."aliases", ARRAY[]::TEXT[]), m."aliases", ARRAY[]::TEXT[]),
  "otc" = COALESCE(i."otc", m."otc"),
  "indication" = COALESCE(i."indication", m."indication"),
  "contraindication" = COALESCE(i."contraindication", m."contraindication"),
  "adverse_reaction" = COALESCE(i."adverse_reaction", m."adverse_reaction"),
  "dosage" = COALESCE(i."dosage", m."dosage"),
  "barcode" = COALESCE(i."barcode", m."barcode"),
  "approval_number" = COALESCE(i."approval_number", m."approval_number")
FROM "medicine_catalog" m
WHERE i."medicine_id" = m."id";

UPDATE "household_medicine_inventory"
SET
  "name" = COALESCE("name", '未命名药品'),
  "otc" = COALESCE("otc", 'OTC'::"OtcType"),
  "indication" = COALESCE("indication", '用户未填写适应症');

ALTER TABLE "household_medicine_inventory"
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "otc" SET NOT NULL,
  ALTER COLUMN "indication" SET NOT NULL,
  ALTER COLUMN "medicine_id" DROP NOT NULL;

ALTER TABLE "household_medicine_inventory"
  DROP CONSTRAINT IF EXISTS "household_medicine_inventory_medicine_id_fkey";

ALTER TABLE "household_medicine_inventory"
  ADD CONSTRAINT "household_medicine_inventory_medicine_id_fkey"
  FOREIGN KEY ("medicine_id") REFERENCES "medicine_catalog"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "household_medicine_inventory_name_idx"
  ON "household_medicine_inventory"("name");
