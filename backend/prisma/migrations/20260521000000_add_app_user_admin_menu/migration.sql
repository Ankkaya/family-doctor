INSERT INTO "Menu" (
  "id",
  "name",
  "path",
  "icon",
  "permission",
  "parentId",
  "order",
  "hidden",
  "type",
  "createdAt",
  "updatedAt"
)
VALUES (
  30,
  '家庭医生',
  '/family-doctor',
  'material-symbols:medical-services-outline',
  NULL,
  NULL,
  2,
  false,
  'menu',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "path" = EXCLUDED."path",
  "icon" = EXCLUDED."icon",
  "permission" = EXCLUDED."permission",
  "parentId" = EXCLUDED."parentId",
  "order" = EXCLUDED."order",
  "hidden" = EXCLUDED."hidden",
  "type" = EXCLUDED."type",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Menu" (
  "id",
  "name",
  "path",
  "icon",
  "component",
  "permission",
  "parentId",
  "order",
  "hidden",
  "type",
  "createdAt",
  "updatedAt"
)
VALUES (
  35,
  'App 用户',
  '/family-doctor/app-users',
  'material-symbols:supervised-user-circle-outline',
  'views/family-doctor/app-users/index',
  'family-doctor:app-user:view',
  30,
  3,
  false,
  'menu',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "path" = EXCLUDED."path",
  "icon" = EXCLUDED."icon",
  "component" = EXCLUDED."component",
  "permission" = EXCLUDED."permission",
  "parentId" = EXCLUDED."parentId",
  "order" = EXCLUDED."order",
  "hidden" = EXCLUDED."hidden",
  "type" = EXCLUDED."type",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "Menu"
SET "order" = 4,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 33;

UPDATE "Menu"
SET "order" = 5,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 34;

INSERT INTO "Menu" (
  "id",
  "name",
  "permission",
  "parentId",
  "order",
  "hidden",
  "type",
  "createdAt",
  "updatedAt"
)
VALUES
  (
    305,
    '启停 App 用户',
    'family-doctor:app-user:update',
    35,
    1,
    true,
    'button',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    306,
    '重置 App 用户密码',
    'family-doctor:app-user:reset-password',
    35,
    2,
    true,
    'button',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "permission" = EXCLUDED."permission",
  "parentId" = EXCLUDED."parentId",
  "order" = EXCLUDED."order",
  "hidden" = EXCLUDED."hidden",
  "type" = EXCLUDED."type",
  "path" = NULL,
  "icon" = NULL,
  "component" = NULL,
  "redirect" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "_RoleMenus" ("A", "B")
SELECT m."id", r."id"
FROM "Menu" m
CROSS JOIN "Role" r
WHERE r."code" = 'admin'
  AND m."id" IN (35, 305, 306)
ON CONFLICT DO NOTHING;
