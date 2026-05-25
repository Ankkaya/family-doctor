import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildModuleConfig,
  createModuleFiles,
  getModuleFiles,
} from './generate-module.mjs';

test('buildModuleConfig normalizes names and defaults route/API paths', () => {
  const config = buildModuleConfig({
    name: 'audit-records',
    title: '审计记录',
    permission: 'system:audit-record',
  });

  assert.equal(config.domainName, 'audit-records');
  assert.equal(config.entityName, 'audit-record');
  assert.equal(config.className, 'AuditRecord');
  assert.equal(config.classPluralName, 'AuditRecords');
  assert.equal(config.camelName, 'auditRecord');
  assert.equal(config.camelPluralName, 'auditRecords');
  assert.equal(config.apiPath, 'audit-records');
  assert.equal(config.routePath, '/audit-records');
  assert.equal(config.permissionPrefix, 'system:audit-record');
});

test('getModuleFiles returns backend and frontend skeleton files without touching app registration', () => {
  const config = buildModuleConfig({
    name: 'brands',
    title: '品牌管理',
    permission: 'system:brand',
    route: '/system/brands',
  });

  const files = getModuleFiles(config);
  const paths = files.map(file => file.path).sort();

  assert.deepEqual(paths, [
    'backend/src/domains/brands/brands.controller.ts',
    'backend/src/domains/brands/brands.module.ts',
    'backend/src/domains/brands/brands.service.ts',
    'backend/src/domains/brands/dto/create-brand.dto.ts',
    'backend/src/domains/brands/dto/query-brand.dto.ts',
    'backend/src/domains/brands/dto/update-brand.dto.ts',
    'backend/src/domains/brands/vo/brand.vo.ts',
    'backend/src/domains/brands/vo/index.ts',
    'frontend/src/api/brands.ts',
    'frontend/src/types/api/brands.api.ts',
    'frontend/src/types/brands.ts',
    'frontend/src/views/brands/index.vue',
  ]);

  const controller = files.find(file => file.path.endsWith('brands.controller.ts'))?.content ?? '';
  assert.match(controller, /@Controller\('brands'\)/);
  assert.match(controller, /@RequirePermissions\('system:brand:view'\)/);
  assert.match(controller, /@RequirePermissions\('system:brand:create'\)/);

  const page = files.find(file => file.path.endsWith('frontend/src/views/brands/index.vue'))?.content ?? '';
  assert.match(page, /meta: \{ title: '品牌管理', permission: 'system:brand:view' \}/);
  assert.match(page, /authStore\.hasPermission\('system:brand:create'\)/);
  assert.match(page, /<PageToolbar>/);
  assert.match(page, /<PageSearchCard>/);
  assert.match(page, /<PageTableCard/);
  assert.match(page, /<PagePagination/);
  assert.match(page, /useTableColumnSettings/);
  assert.ok(page.indexOf('<PageSearchCard>') < page.indexOf('<PageToolbar>'));
});

test('createModuleFiles dry run returns planned files and writes nothing', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'module-generator-dry-'));
  try {
    const config = buildModuleConfig({
      name: 'brands',
      title: '品牌管理',
      permission: 'system:brand',
    });

    const result = await createModuleFiles(config, { root, dryRun: true });

    assert.equal(result.created.length, 0);
    assert.equal(result.planned.length, 12);
    await assert.rejects(readFile(path.join(root, 'backend/src/domains/brands/brands.module.ts'), 'utf8'));
  }
  finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('createModuleFiles writes skeleton files and prevents accidental overwrite', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'module-generator-write-'));
  try {
    const config = buildModuleConfig({
      name: 'brands',
      title: '品牌管理',
      permission: 'system:brand',
    });

    const first = await createModuleFiles(config, { root });
    assert.equal(first.created.length, 12);

    const service = await readFile(path.join(root, 'backend/src/domains/brands/brands.service.ts'), 'utf8');
    assert.match(service, /this\.prisma\.brand\.findMany/);
    assert.match(service, /deletedAt: null/);

    await assert.rejects(
      createModuleFiles(config, { root }),
      /already exists/,
    );
  }
  finally {
    await rm(root, { recursive: true, force: true });
  }
});
