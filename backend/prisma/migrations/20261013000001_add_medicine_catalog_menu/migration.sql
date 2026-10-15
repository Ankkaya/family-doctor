INSERT INTO "Menu" (
  "id", "name", "path", "icon", "component", "permission", "parentId", "order", "hidden", "type", "createdAt", "updatedAt"
)
SELECT 37, '药品目录', '/family-doctor/medicine-catalog', 'material-symbols:medication-outline',
  'views/family-doctor/medicines/index', 'family-doctor:medicine:view', "id", 7, false, 'menu', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Menu"
WHERE "path" = '/family-doctor' AND "deletedAt" IS NULL
ON CONFLICT ("id") DO NOTHING;

UPDATE "Menu" SET "parentId" = 37, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (300, 301, 302)
  AND "permission" IN ('family-doctor:medicine:create', 'family-doctor:medicine:update', 'family-doctor:medicine:delete')
  AND EXISTS (SELECT 1 FROM "Menu" WHERE "id" = 37 AND "path" = '/family-doctor/medicine-catalog');

INSERT INTO "_RoleMenus" ("A", "B")
SELECT m."id", r."id" FROM "Menu" m CROSS JOIN "Role" r
WHERE m."path" = '/family-doctor/medicine-catalog' AND r."code" = 'admin' AND r."deletedAt" IS NULL
ON CONFLICT DO NOTHING;
