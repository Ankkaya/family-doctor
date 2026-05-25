#!/usr/bin/env node
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ACTIONS = [
  ['view', '查看'],
  ['create', '新增'],
  ['update', '编辑'],
  ['delete', '删除'],
  ['export', '导出'],
  ['batch-delete', '批量删除'],
];

function upperFirst(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function lowerFirst(value) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function toKebabCase(value) {
  return String(value)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function toPascalCase(value) {
  return toKebabCase(value)
    .split('-')
    .filter(Boolean)
    .map(upperFirst)
    .join('');
}

function singularizeKebab(value) {
  if (value.endsWith('ies')) {
    return `${value.slice(0, -3)}y`;
  }
  if (value.endsWith('sses')) {
    return value.slice(0, -2);
  }
  if (value.endsWith('ses')) {
    return value.slice(0, -2);
  }
  if (value.endsWith('s') && value.length > 1) {
    return value.slice(0, -1);
  }
  return value;
}

function stripSlashes(value) {
  return String(value).replace(/^\/+|\/+$/g, '');
}

function normalizeRoutePath(value) {
  const route = String(value || '').trim();
  if (!route) return '';
  return route.startsWith('/') ? route : `/${route}`;
}

function assertRequired(value, message) {
  if (!value || String(value).trim() === '') {
    throw new Error(message);
  }
}

export function buildModuleConfig(options) {
  assertRequired(options?.name, 'Missing required option: name');
  assertRequired(options?.title, 'Missing required option: title');
  assertRequired(options?.permission, 'Missing required option: permission');

  const domainName = toKebabCase(options.name);
  if (!/^[a-z][a-z0-9-]*$/.test(domainName)) {
    throw new Error('Module name must start with a letter and use kebab-case letters, numbers, or hyphens.');
  }

  const entityName = toKebabCase(options.entity || singularizeKebab(domainName));
  const className = options.model ? toPascalCase(options.model) : toPascalCase(entityName);
  const classPluralName = toPascalCase(domainName);
  const camelName = lowerFirst(className);
  const camelPluralName = lowerFirst(classPluralName);
  const apiPath = stripSlashes(options.apiPath || domainName);
  const routePath = normalizeRoutePath(options.route || `/${domainName}`);
  const permissionPrefix = String(options.permission).replace(/:+$/g, '');
  const title = String(options.title).trim();

  return {
    domainName,
    entityName,
    className,
    classPluralName,
    camelName,
    camelPluralName,
    apiPath,
    routePath,
    permissionPrefix,
    title,
    prismaName: lowerFirst(className),
  };
}

function backendModuleTemplate(config) {
  return `import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { ${config.classPluralName}Controller } from './${config.domainName}.controller';
import { ${config.classPluralName}Service } from './${config.domainName}.service';

@Module({
  imports: [PrismaModule],
  controllers: [${config.classPluralName}Controller],
  providers: [${config.classPluralName}Service],
  exports: [${config.classPluralName}Service],
})
export class ${config.classPluralName}Module {}
`;
}

function backendCreateDtoTemplate(config) {
  return `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class Create${config.className}Dto {
  @ApiProperty({ description: '${config.title}名称' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: '${config.title}说明' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '排序号', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
`;
}

function backendUpdateDtoTemplate(config) {
  return `import { PartialType } from '@nestjs/swagger';
import { Create${config.className}Dto } from './create-${config.entityName}.dto';

export class Update${config.className}Dto extends PartialType(Create${config.className}Dto) {}
`;
}

function backendQueryDtoTemplate(config) {
  return `import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return String(value).toLowerCase() === 'true';
}

export class Query${config.className}Dto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: '按名称模糊查询' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '启用状态' })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  isEnabled?: boolean;
}
`;
}

function backendVoTemplate(config) {
  return `import { ApiProperty } from '@nestjs/swagger';
import type { ${config.className} } from '@prisma/client';

export class ${config.className}Vo {
  @ApiProperty({ description: '${config.title}ID' })
  id: number;

  @ApiProperty({ description: '${config.title}名称' })
  name: string;

  @ApiProperty({ description: '${config.title}说明', nullable: true })
  description: string | null;

  @ApiProperty({ description: '排序号' })
  sort: number;

  @ApiProperty({ description: '是否启用' })
  isEnabled: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  static fromEntity(entity: ${config.className}): ${config.className}Vo {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      sort: entity.sort,
      isEnabled: entity.isEnabled,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static fromEntities(entities: ${config.className}[]): ${config.className}Vo[] {
    return entities.map(entity => ${config.className}Vo.fromEntity(entity));
  }
}
`;
}

function backendServiceTemplate(config) {
  return `import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Create${config.className}Dto } from './dto/create-${config.entityName}.dto';
import { Query${config.className}Dto } from './dto/query-${config.entityName}.dto';
import { Update${config.className}Dto } from './dto/update-${config.entityName}.dto';
import { ${config.className}Vo } from './vo';

@Injectable()
export class ${config.classPluralName}Service {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: Create${config.className}Dto) {
    const existing = await this.prisma.${config.prismaName}.findFirst({
      where: { name: dto.name.trim(), deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('${config.title}名称已存在');
    }

    const entity = await this.prisma.${config.prismaName}.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        sort: dto.sort ?? 0,
        isEnabled: dto.isEnabled ?? true,
      },
    });

    return ${config.className}Vo.fromEntity(entity);
  }

  async findAll(query: Query${config.className}Dto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const keyword = query.keyword?.trim();
    const where: Prisma.${config.className}WhereInput = { deletedAt: null };

    if (keyword) {
      where.name = { contains: keyword };
    }
    if (query.isEnabled !== undefined) {
      where.isEnabled = query.isEnabled;
    }

    const [list, total] = await Promise.all([
      this.prisma.${config.prismaName}.findMany({
        where,
        orderBy: [{ sort: 'asc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.${config.prismaName}.count({ where }),
    ]);

    return {
      list: ${config.className}Vo.fromEntities(list),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number) {
    const entity = await this.prisma.${config.prismaName}.findFirst({
      where: { id, deletedAt: null },
    });

    if (!entity) {
      throw new NotFoundException('${config.title}不存在');
    }

    return ${config.className}Vo.fromEntity(entity);
  }

  async update(id: number, dto: Update${config.className}Dto) {
    const existing = await this.prisma.${config.prismaName}.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('${config.title}不存在');
    }

    if (dto.name && dto.name.trim() !== existing.name) {
      const duplicate = await this.prisma.${config.prismaName}.findFirst({
        where: {
          name: dto.name.trim(),
          deletedAt: null,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException('${config.title}名称已存在');
      }
    }

    const entity = await this.prisma.${config.prismaName}.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
        ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
      },
    });

    return ${config.className}Vo.fromEntity(entity);
  }

  async remove(id: number) {
    const entity = await this.prisma.${config.prismaName}.findFirst({
      where: { id, deletedAt: null },
    });

    if (!entity) {
      throw new NotFoundException('${config.title}不存在');
    }

    await this.prisma.${config.prismaName}.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return ${config.className}Vo.fromEntity(entity);
  }

  async removeMany(ids: number[]) {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) {
      return { count: 0, ids: [] };
    }

    const existingCount = await this.prisma.${config.prismaName}.count({
      where: { id: { in: uniqueIds }, deletedAt: null },
    });

    if (existingCount !== uniqueIds.length) {
      throw new NotFoundException('部分${config.title}不存在');
    }

    const result = await this.prisma.${config.prismaName}.updateMany({
      where: { id: { in: uniqueIds }, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return { count: result.count, ids: uniqueIds };
  }
}
`;
}

function backendControllerTemplate(config) {
  return `import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BatchIdsDto } from '@/common/dto/batch-ids.dto';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { ${config.classPluralName}Service } from './${config.domainName}.service';
import { Create${config.className}Dto } from './dto/create-${config.entityName}.dto';
import { Query${config.className}Dto } from './dto/query-${config.entityName}.dto';
import { Update${config.className}Dto } from './dto/update-${config.entityName}.dto';
import { ${config.className}Vo } from './vo';

@ApiTags('后台接口/${config.title}')
@Controller('${config.apiPath}')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ${config.classPluralName}Controller {
  constructor(private readonly ${config.camelPluralName}Service: ${config.classPluralName}Service) {}

  @Post()
  @RequirePermissions('${config.permissionPrefix}:create')
  @ApiOperation({ summary: '创建${config.title}' })
  @ApiOkResponse({ type: ${config.className}Vo })
  create(@Body() dto: Create${config.className}Dto) {
    return this.${config.camelPluralName}Service.create(dto);
  }

  @Get()
  @RequirePermissions('${config.permissionPrefix}:view')
  @ApiOperation({ summary: '查询${config.title}列表' })
  findAll(@Query() query: Query${config.className}Dto) {
    return this.${config.camelPluralName}Service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('${config.permissionPrefix}:view')
  @ApiOperation({ summary: '获取${config.title}详情' })
  @ApiOkResponse({ type: ${config.className}Vo })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.${config.camelPluralName}Service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('${config.permissionPrefix}:update')
  @ApiOperation({ summary: '更新${config.title}' })
  @ApiOkResponse({ type: ${config.className}Vo })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Update${config.className}Dto) {
    return this.${config.camelPluralName}Service.update(id, dto);
  }

  @Delete('batch')
  @RequirePermissions('${config.permissionPrefix}:batch-delete')
  @ApiOperation({ summary: '批量删除${config.title}' })
  removeMany(@Body() dto: BatchIdsDto) {
    return this.${config.camelPluralName}Service.removeMany(dto.ids);
  }

  @Delete(':id')
  @RequirePermissions('${config.permissionPrefix}:delete')
  @ApiOperation({ summary: '删除${config.title}' })
  @ApiOkResponse({ type: ${config.className}Vo })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.${config.camelPluralName}Service.remove(id);
  }
}
`;
}

function frontendEntityTypesTemplate(config) {
  return `export interface ${config.className} {
  id: number
  name: string
  description: string | null
  sort: number
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface Create${config.className}Dto {
  name: string
  description?: string
  sort?: number
  isEnabled?: boolean
}

export interface Update${config.className}Dto extends Partial<Create${config.className}Dto> {}
`;
}

function frontendApiTypesTemplate(config) {
  return `import type {
  Create${config.className}Dto,
  ${config.className},
  Update${config.className}Dto,
} from '@/types/${config.domainName}'

export interface Query${config.classPluralName}Params {
  page?: number
  pageSize?: number
  keyword?: string
  isEnabled?: boolean
}

export interface BatchDelete${config.classPluralName}Params {
  ids: number[]
}

export interface ${config.className}Page {
  list: ${config.className}[]
  total: number
  page: number
  pageSize: number
}

export type Create${config.className}Params = Create${config.className}Dto
export type Update${config.className}Params = Update${config.className}Dto

export namespace ${config.classPluralName}Api {
  export type List = ${config.className}Page
  export type Detail = ${config.className}
  export type Create = ${config.className}
  export type Update = ${config.className}
  export type Delete = ${config.className}
  export type BatchDelete = { count: number; ids: number[] }
}
`;
}

function frontendApiTemplate(config) {
  return `import api from './request'
import type {
  Create${config.className}Params,
  ${config.classPluralName}Api,
  BatchDelete${config.classPluralName}Params,
  Query${config.classPluralName}Params,
  Update${config.className}Params,
} from '@/types/api/${config.domainName}.api'

export const get${config.classPluralName} = (params?: Query${config.classPluralName}Params) => {
  return api.get<${config.classPluralName}Api.List>('/${config.apiPath}', { params })
}

export const get${config.className} = (id: number) => {
  return api.get<${config.classPluralName}Api.Detail>(\`/${config.apiPath}/\${id}\`)
}

export const create${config.className} = (data: Create${config.className}Params) => {
  return api.post<${config.classPluralName}Api.Create>('/${config.apiPath}', data)
}

export const update${config.className} = (id: number, data: Update${config.className}Params) => {
  return api.patch<${config.classPluralName}Api.Update>(\`/${config.apiPath}/\${id}\`, data)
}

export const delete${config.className} = (id: number) => {
  return api.delete<${config.classPluralName}Api.Delete>(\`/${config.apiPath}/\${id}\`)
}

export const batchDelete${config.classPluralName} = (ids: number[]) => {
  const data: BatchDelete${config.classPluralName}Params = { ids }
  return api.delete<${config.classPluralName}Api.BatchDelete>('/${config.apiPath}/batch', { data })
}
`;
}

function frontendPageTemplate(config) {
  return `<template>
  <!-- Register route meta: { title: '${config.title}', permission: '${config.permissionPrefix}:view' } -->
  <div class="p-4 ${config.entityName}-page">
    <PageSearchCard>
      <QueryForm :model="query" @search="fetchList">
        <n-form-item label="关键词">
          <n-input v-model:value="query.keyword" clearable placeholder="名称" />
        </n-form-item>
        <n-form-item label="状态">
          <n-select v-model:value="query.isEnabled" :options="statusOptions" clearable placeholder="全部" />
        </n-form-item>
        <n-form-item>
          <n-space justify="end">
            <n-button @click="resetQuery">重置</n-button>
            <n-button type="primary" @click="fetchList">查询</n-button>
          </n-space>
        </n-form-item>
      </QueryForm>
    </PageSearchCard>

    <PageToolbar>
      <n-button v-if="authStore.hasPermission('${config.permissionPrefix}:create')" type="primary" @click="handleCreate">
        新增${config.title}
      </n-button>
    </PageToolbar>

    <PageTableCard
      v-model:column-setting-value="checkedColumnKeys"
      :column-setting-options="columnOptions"
      export-permission="${config.permissionPrefix}:export"
      batch-delete-permission="${config.permissionPrefix}:batch-delete"
      :selected-count="selectedRowKeys.length"
      @reset-columns="resetColumnSettings"
      @export="handleExport"
      @batch-delete="handleBatchDelete"
    >
      <n-data-table
        :columns="columns"
        :data="list"
        :loading="loading"
        :scroll-x="tableScrollX"
        :row-key="(row: ${config.className}) => row.id"
        :checked-row-keys="selectedRowKeys"
        striped
        @update:checked-row-keys="handleSelectedRowKeysUpdate"
      />
      <template #footer>
        <PagePagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :item-count="pagination.total"
          @update:page="handlePageChange"
          @update:pageSize="handlePageSizeChange"
        />
      </template>
    </PageTableCard>

    <n-modal
      v-model:show="dialogVisible"
      :title="isEdit ? '编辑${config.title}' : '新增${config.title}'"
      preset="card"
      style="width: 520px"
    >
      <n-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <n-form-item label="名称" path="name">
          <n-input v-model:value="form.name" placeholder="请输入名称" />
        </n-form-item>
        <n-form-item label="排序" path="sort">
          <n-input-number v-model:value="form.sort" :min="0" :max="9999" class="w-full" />
        </n-form-item>
        <n-form-item label="状态" path="isEnabled">
          <n-switch v-model:value="form.isEnabled" />
        </n-form-item>
        <n-form-item label="说明" path="description">
          <n-input v-model:value="form.description" type="textarea" placeholder="请输入说明" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="dialogVisible = false">取消</n-button>
          <n-button type="primary" :loading="submitLoading" @click="handleSubmit">
            确定
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, type VNode } from 'vue'
import type { DataTableRowKey, FormInst, FormRules } from 'naive-ui'
import { NButton, NSpace, NTag, useDialog, useMessage } from 'naive-ui'
import dayjs from 'dayjs'
import PagePagination from '@/components/common/PagePagination.vue'
import PageSearchCard from '@/components/common/PageSearchCard.vue'
import PageToolbar from '@/components/common/PageToolbar.vue'
import PageTableCard from '@/components/common/PageTableCard.vue'
import QueryForm from '@/components/common/QueryForm.vue'
import {
  create${config.className},
  batchDelete${config.classPluralName},
  delete${config.className},
  get${config.classPluralName},
  update${config.className},
} from '@/api/${config.domainName}'
import type { Create${config.className}Dto, ${config.className} } from '@/types/${config.domainName}'
import { useAuthStore } from '@/store'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { autoFitTableColumns, createActionColumn } from '@/utils/table'
import { exportExcel } from '@/utils/export'

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()

const statusOptions = [
  { label: '启用', value: true },
  { label: '停用', value: false },
]

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const list = ref<${config.className}[]>([])
const selectedRowKeys = ref<DataTableRowKey[]>([])
const currentId = ref<number>()
const formRef = ref<FormInst>()

const query = reactive<{
  keyword: string
  isEnabled: boolean | null
}>({
  keyword: '',
  isEnabled: null,
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const form = reactive<Create${config.className}Dto>({
  name: '',
  description: '',
  sort: 0,
  isEnabled: true,
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
}

const queryParams = computed(() => ({
  page: pagination.page,
  pageSize: pagination.pageSize,
  keyword: query.keyword || undefined,
  isEnabled: query.isEnabled === null ? undefined : query.isEnabled,
}))

const renderStatus = (isEnabled: boolean) => {
  return h(NTag, { type: isEnabled ? 'success' : 'error', size: 'small' }, {
    default: () => (isEnabled ? '启用' : '停用'),
  })
}

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const baseColumns = autoFitTableColumns<${config.className}>([
  { type: 'selection', width: 48, fixed: 'left' },
  { title: '名称', key: 'name' },
  {
    title: '状态',
    key: 'isEnabled',
    align: 'center',
    render: row => renderStatus(row.isEnabled),
  },
  { title: '排序', key: 'sort', align: 'center' },
  {
    title: '创建时间',
    key: 'createdAt',
    render: row => formatDate(row.createdAt),
  },
  createActionColumn<${config.className}>({
    title: '操作',
    key: 'actions',
    render: (row) => {
      const actions: VNode[] = []
      if (authStore.hasPermission('${config.permissionPrefix}:update')) {
        actions.push(h(NButton, {
          text: true,
          type: 'primary',
          onClick: () => handleEdit(row),
        }, { default: () => '编辑' }))
      }
      if (authStore.hasPermission('${config.permissionPrefix}:delete')) {
        actions.push(h(NButton, {
          text: true,
          type: 'error',
          onClick: () => handleDelete(row),
        }, { default: () => '删除' }))
      }
      if (actions.length === 0) return '-'
      return h(NSpace, null, { default: () => actions })
    },
  }, 2),
])

const {
  checkedColumnKeys,
  columnOptions,
  columns,
  resetColumnSettings,
  tableScrollX,
} = useTableColumnSettings<${config.className}>('${config.routePath.replace(/^\//, '').replace(/\//g, '-')}', baseColumns)

async function fetchList() {
  loading.value = true
  try {
    const res = await get${config.classPluralName}(queryParams.value)
    list.value = res.list
    pagination.total = res.total
    selectedRowKeys.value = []
  } catch (error: any) {
    message.error(error.message || '获取${config.title}列表失败')
  } finally {
    loading.value = false
  }
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  fetchList()
}

function handlePageChange(page: number) {
  pagination.page = page
  fetchList()
}

function resetQuery() {
  query.keyword = ''
  query.isEnabled = null
  pagination.page = 1
  fetchList()
}

function handleSelectedRowKeysUpdate(keys: DataTableRowKey[]) {
  selectedRowKeys.value = keys
}

function handleExport() {
  exportExcel('${config.title}', list.value, [
    { title: 'ID', value: 'id' },
    { title: '名称', value: 'name' },
    { title: '状态', value: row => (row.isEnabled ? '启用' : '停用') },
    { title: '排序', value: 'sort' },
    { title: '创建时间', value: row => formatDate(row.createdAt) },
  ])
}

function handleBatchDelete() {
  const ids = selectedRowKeys.value.map(Number)
  if (ids.length === 0) {
    message.warning('请先选择要删除的数据')
    return
  }

  dialog.warning({
    title: '提示',
    content: \`确定要删除选中的 \${ids.length} 条数据吗?\`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await batchDelete${config.classPluralName}(ids)
        message.success('批量删除成功')
        await fetchList()
      } catch (error: any) {
        message.error(error.message || '批量删除失败')
      }
    },
  })
}

function resetForm() {
  currentId.value = undefined
  form.name = ''
  form.description = ''
  form.sort = 0
  form.isEnabled = true
}

function handleCreate() {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: ${config.className}) {
  isEdit.value = true
  currentId.value = row.id
  form.name = row.name
  form.description = row.description || ''
  form.sort = row.sort
  form.isEnabled = row.isEnabled
  dialogVisible.value = true
}

function handleDelete(row: ${config.className}) {
  dialog.warning({
    title: '提示',
    content: \`确定要删除「\${row.name}」吗?\`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await delete${config.className}(row.id)
        message.success('删除成功')
        await fetchList()
      } catch (error: any) {
        message.error(error.message || '删除失败')
      }
    },
  })
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (errors) => {
    if (errors) return

    submitLoading.value = true
    try {
      if (isEdit.value && currentId.value) {
        await update${config.className}(currentId.value, form)
        message.success('更新成功')
      } else {
        await create${config.className}(form)
        message.success('创建成功')
      }
      dialogVisible.value = false
      await fetchList()
    } catch (error: any) {
      message.error(error.message || '操作失败')
    } finally {
      submitLoading.value = false
    }
  })
}

onMounted(() => {
  fetchList()
})
</script>
`;
}

export function getModuleFiles(config) {
  const domainDir = `backend/src/domains/${config.domainName}`;
  return [
    { path: `${domainDir}/${config.domainName}.module.ts`, content: backendModuleTemplate(config) },
    { path: `${domainDir}/${config.domainName}.controller.ts`, content: backendControllerTemplate(config) },
    { path: `${domainDir}/${config.domainName}.service.ts`, content: backendServiceTemplate(config) },
    { path: `${domainDir}/dto/create-${config.entityName}.dto.ts`, content: backendCreateDtoTemplate(config) },
    { path: `${domainDir}/dto/update-${config.entityName}.dto.ts`, content: backendUpdateDtoTemplate(config) },
    { path: `${domainDir}/dto/query-${config.entityName}.dto.ts`, content: backendQueryDtoTemplate(config) },
    { path: `${domainDir}/vo/${config.entityName}.vo.ts`, content: backendVoTemplate(config) },
    { path: `${domainDir}/vo/index.ts`, content: `export * from './${config.entityName}.vo';\n` },
    { path: `frontend/src/types/${config.domainName}.ts`, content: frontendEntityTypesTemplate(config) },
    { path: `frontend/src/types/api/${config.domainName}.api.ts`, content: frontendApiTypesTemplate(config) },
    { path: `frontend/src/api/${config.domainName}.ts`, content: frontendApiTemplate(config) },
    { path: `frontend/src/views/${config.domainName}/index.vue`, content: frontendPageTemplate(config) },
  ];
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  }
  catch {
    return false;
  }
}

export async function createModuleFiles(config, options = {}) {
  const root = options.root || process.cwd();
  const files = getModuleFiles(config);
  const planned = files.map(file => file.path);

  if (options.dryRun) {
    return { planned, created: [] };
  }

  const created = [];
  for (const file of files) {
    const target = path.join(root, file.path);
    if (!options.force && await pathExists(target)) {
      throw new Error(`File already exists: ${file.path}`);
    }
  }

  for (const file of files) {
    const target = path.join(root, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content, 'utf8');
    created.push(file.path);
  }

  return { planned, created };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '-h' || arg === '--help') {
      options.help = true;
      continue;
    }
    if (!arg.startsWith('--')) {
      throw new Error(`Unknown argument: ${arg}`);
    }
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }
    options[key] = value;
    index += 1;
  }
  return options;
}

function printUsage() {
  console.log(`Usage: pnpm generate:module -- --name <module> --title <title> --permission <prefix> [options]

Options:
  --name <module>        Plural kebab-case module name, e.g. brands
  --title <title>        Display title, e.g. 品牌管理
  --permission <prefix>  Permission prefix, e.g. system:brand
  --route <path>         Frontend route path, defaults to /<module>
  --api-path <path>      Backend API path, defaults to <module>
  --entity <name>        Singular kebab-case entity name override
  --model <name>         Prisma model/class name override
  --dry-run              Print planned files without writing them
  --force                Overwrite existing generated files
  -h, --help             Show this help
`);
}

function printNextSteps(config, result) {
  const routeChild = config.routePath.startsWith('/system/')
    ? config.routePath.replace('/system/', '')
    : stripSlashes(config.routePath);

  console.log('');
  console.log(result.created.length > 0 ? 'Created files:' : 'Planned files:');
  for (const file of (result.created.length > 0 ? result.created : result.planned)) {
    console.log(`  - ${file}`);
  }

  console.log('');
  console.log('Next steps:');
  console.log(`  1. Add Prisma model ${config.className} to backend/prisma/schema.prisma, then run migration and generate.`);
  console.log(`  2. Register ${config.classPluralName}Module in backend/src/app.module.ts and backend/src/main.ts Swagger include array.`);
  console.log('  3. Register the frontend route:');
  console.log(`     { path: '${routeChild}', name: '${config.domainName}', component: () => import('@/views/${config.domainName}/index.vue'), meta: { title: '${config.title}', permission: '${config.permissionPrefix}:view' } }`);
  console.log('  4. Add or seed a Menu row with:');
  console.log(`     name=${config.title}, path=${config.routePath}, component=views/${config.domainName}/index, permission=${config.permissionPrefix}:view`);
  console.log('  5. Add button permissions:');
  for (const [action, label] of ACTIONS) {
    console.log(`     ${config.permissionPrefix}:${action} (${label}${config.title})`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const config = buildModuleConfig({
    name: options.name,
    title: options.title,
    permission: options.permission,
    route: options.route,
    apiPath: options['api-path'],
    entity: options.entity,
    model: options.model,
  });
  const result = await createModuleFiles(config, {
    root: process.cwd(),
    dryRun: options.dryRun,
    force: options.force,
  });
  printNextSteps(config, result);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  });
}
