BEGIN;

-- Preserve the manufacturer on older linked inventories before removing the catalog.
UPDATE "household_medicine_inventory" i
SET "manufacturer" = m."manufacturer"
FROM "medicine_catalog" m
WHERE i."medicine_id" = m."id"
  AND NULLIF(btrim(i."manufacturer"), '') IS NULL
  AND m."manufacturer" IS NOT NULL;

ALTER TABLE "household_medicine_inventory"
  DROP CONSTRAINT IF EXISTS "household_medicine_inventory_medicine_id_fkey";
DROP INDEX IF EXISTS "household_medicine_inventory_medicine_id_idx";
ALTER TABLE "household_medicine_inventory" DROP COLUMN "medicine_id";
DROP TABLE "medicine_catalog";
DROP FUNCTION IF EXISTS medicine_catalog_search_vector_refresh();

-- Remove catalog menus and their permissions without touching household medicine menus.
CREATE TEMP TABLE removed_catalog_menus ON COMMIT DROP AS
WITH RECURSIVE catalog_menus AS (
  SELECT "id" FROM "Menu"
  WHERE "path" = '/family-doctor/medicine-catalog'
    OR "component" = 'views/family-doctor/medicines/index'
    OR "permission" LIKE 'family-doctor:medicine:%'
  UNION
  SELECT m."id" FROM "Menu" m
  INNER JOIN catalog_menus c ON m."parentId" = c."id"
)
SELECT "id" FROM catalog_menus;

DELETE FROM "_RoleMenus"
WHERE "A" IN (SELECT "id" FROM removed_catalog_menus);
DELETE FROM "Menu"
WHERE "id" IN (SELECT "id" FROM removed_catalog_menus);

COMMIT;
