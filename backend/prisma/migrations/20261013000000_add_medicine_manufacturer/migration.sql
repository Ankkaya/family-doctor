ALTER TABLE "medicine_catalog" ADD COLUMN IF NOT EXISTS "manufacturer" TEXT;
ALTER TABLE "household_medicine_inventory" ADD COLUMN IF NOT EXISTS "manufacturer" TEXT;
CREATE INDEX IF NOT EXISTS "medicine_catalog_name_manufacturer_idx" ON "medicine_catalog"("name", "manufacturer");
