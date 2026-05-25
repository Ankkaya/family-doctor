<template>
  <div class="page-container">
    <n-card class="bg-container transition-theme">
      <n-tabs type="line" animated v-model:value="activeTab">
        <n-tab-pane name="operation" tab="操作审计日志">
          <PageSearchCard>
            <QueryForm :model="operationSearch" @search="handleOperationSearch">
              <n-form-item label="模块">
                <n-input v-model:value="operationSearch.module" placeholder="模块" clearable />
              </n-form-item>
              <n-form-item label="方法">
                <n-select v-model:value="operationSearch.method" :options="methodOptions" placeholder="方法" clearable />
              </n-form-item>
              <n-form-item label="路径">
                <n-input v-model:value="operationSearch.path" placeholder="路径" clearable />
              </n-form-item>
              <n-form-item label="状态码">
                <n-input-number v-model:value="operationSearch.statusCode" placeholder="状态码" clearable />
              </n-form-item>
              <n-form-item label="动作">
                <n-select v-model:value="operationSearch.action" :options="actionOptions" placeholder="动作" clearable />
              </n-form-item>
              <n-form-item label="用户ID">
                <n-input-number v-model:value="operationSearch.userId" placeholder="用户ID" clearable />
              </n-form-item>
              <n-form-item>
                <n-space>
                  <n-button type="primary" @click="handleOperationSearch">搜索</n-button>
                  <n-button @click="handleOperationReset">重置</n-button>
                </n-space>
              </n-form-item>
            </QueryForm>
          </PageSearchCard>

          <PageTableCard>
            <n-data-table
              :columns="operationColumns"
              :data="operationList"
              :loading="operationLoading"
              :pagination="false"
              :scroll-x="1500"
            />
            <template #footer>
              <PagePagination
                :page="operationPagination.page"
                :page-size="operationPagination.pageSize"
                :page-sizes="operationPagination.pageSizes"
                :item-count="operationPagination.itemCount"
                :show-size-picker="operationPagination.showSizePicker"
                @update:page="handleOperationPageChange"
                @update:pageSize="handleOperationPageSizeChange"
              />
            </template>
          </PageTableCard>
        </n-tab-pane>

        <n-tab-pane name="login" tab="登录安全日志">
          <PageSearchCard>
            <QueryForm :model="loginSearch" @search="handleLoginSearch">
              <n-form-item label="类型">
                <n-select v-model:value="loginSearch.type" :options="loginTypeOptions" placeholder="类型" clearable />
              </n-form-item>
              <n-form-item label="用户ID">
                <n-input-number v-model:value="loginSearch.userId" placeholder="用户ID" clearable />
              </n-form-item>
              <n-form-item label="结果">
                <n-select v-model:value="loginSearch.success" :options="successOptions" placeholder="结果" clearable />
              </n-form-item>
              <n-form-item>
                <n-space>
                  <n-button type="primary" @click="handleLoginSearch">搜索</n-button>
                  <n-button @click="handleLoginReset">重置</n-button>
                </n-space>
              </n-form-item>
            </QueryForm>
          </PageSearchCard>

          <PageTableCard>
            <n-data-table
              :columns="loginColumns"
              :data="loginList"
              :loading="loginLoading"
              :pagination="false"
            />
            <template #footer>
              <PagePagination
                :page="loginPagination.page"
                :page-size="loginPagination.pageSize"
                :page-sizes="loginPagination.pageSizes"
                :item-count="loginPagination.itemCount"
                :show-size-picker="loginPagination.showSizePicker"
                @update:page="handleLoginPageChange"
                @update:pageSize="handleLoginPageSizeChange"
              />
            </template>
          </PageTableCard>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h, onMounted } from 'vue';
import { useDialog, NTag, NButton, NSpace } from 'naive-ui';
import type { DataTableColumns, DataTableRowData } from 'naive-ui';
import PagePagination from '@/components/common/PagePagination.vue';
import PageSearchCard from '@/components/common/PageSearchCard.vue';
import PageTableCard from '@/components/common/PageTableCard.vue';
import QueryForm from '@/components/common/QueryForm.vue';
import { getOperationLogs, getLoginLogs, type OperationLog, type LoginLog } from '@/api/system-logs';

const dialog = useDialog();

const activeTab = ref('operation');

// ==================== 操作审计日志 ====================
const actionOptions = [
  { label: '创建', value: 'CREATE' },
  { label: '更新', value: 'UPDATE' },
  { label: '删除', value: 'DELETE' },
  { label: '登录', value: 'LOGIN' },
  { label: '登出', value: 'LOGOUT' },
  { label: '导出', value: 'EXPORT' },
  { label: '导入', value: 'IMPORT' },
  { label: '其他', value: 'OTHER' },
];

const methodOptions = [
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
];

const operationSearch = reactive({
  module: '',
  method: undefined as string | undefined,
  path: '',
  statusCode: undefined as number | undefined,
  action: undefined as string | undefined,
  userId: undefined as number | undefined,
  page: 1,
  pageSize: 10,
});

const operationLoading = ref(false);
const operationList = ref<OperationLog[]>([]);
const operationPagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
});

const operationColumns: DataTableColumns<OperationLog> = [
  { title: 'ID', key: 'id', width: 60 },
  { title: '用户', key: 'username', width: 120 },
  { title: '模块', key: 'module', width: 120 },
  { title: '方法', key: 'method', width: 90, render: row => row.method || '-' },
  {
    title: '动作',
    key: 'action',
    width: 100,
    render(row: DataTableRowData) {
      const label = actionOptions.find(o => o.value === row.action)?.label || row.action;
      return h(NTag, { type: 'info', size: 'small' }, { default: () => label });
    },
  },
  {
    title: '状态',
    key: 'statusCode',
    width: 90,
    render(row: DataTableRowData) {
      const statusCode = row.statusCode as number | null;
      if (!statusCode) return '-';
      const tagType: 'error' | 'success' = statusCode >= 400 ? 'error' : 'success';
      return h(NTag, { type: tagType, size: 'small' }, { default: () => statusCode });
    },
  },
  { title: '路径', key: 'path', width: 220, ellipsis: { tooltip: true }, render: row => row.path || '-' },
  { title: '目标ID', key: 'targetId', width: 120, ellipsis: { tooltip: true }, render: row => row.targetId || '-' },
  { title: '描述', key: 'description', ellipsis: { tooltip: true }, render: row => row.description || '-' },
  { title: 'IP', key: 'ip', width: 140, render: row => row.ip || '-' },
  { title: '耗时(ms)', key: 'duration', width: 100, render: row => row.duration ?? '-' },
  { title: '时间', key: 'createdAt', width: 180, render: row => formatDateTime(row.createdAt as string) },
  {
    title: '详情',
    key: 'actions',
    width: 80,
    render(row: DataTableRowData) {
      return h(
        NButton,
        { text: true, type: 'primary', size: 'small', onClick: () => showDetail(row as OperationLog) },
        { default: () => '详情' }
      );
    },
  },
];

async function loadOperationLogs() {
  operationLoading.value = true;
  try {
    const res: any = await getOperationLogs(operationSearch);
    operationList.value = res.list || [];
    operationPagination.itemCount = res.total || 0;
    operationPagination.page = res.page || 1;
    operationPagination.pageSize = res.pageSize || 10;
  } finally {
    operationLoading.value = false;
  }
}

function handleOperationSearch() {
  operationSearch.page = 1;
  loadOperationLogs();
}

function handleOperationReset() {
  operationSearch.module = '';
  operationSearch.method = undefined;
  operationSearch.path = '';
  operationSearch.statusCode = undefined;
  operationSearch.action = undefined;
  operationSearch.userId = undefined;
  operationSearch.page = 1;
  loadOperationLogs();
}

function handleOperationPageChange(page: number) {
  operationSearch.page = page;
  loadOperationLogs();
}

function handleOperationPageSizeChange(pageSize: number) {
  operationSearch.pageSize = pageSize;
  operationSearch.page = 1;
  loadOperationLogs();
}

// ==================== 登录安全日志 ====================
const loginTypeOptions = [
  { label: '登录', value: 'LOGIN' },
  { label: '登出', value: 'LOGOUT' },
  { label: '刷新', value: 'REFRESH' },
  { label: '注册', value: 'REGISTER' },
];

const successOptions = [
  { label: '成功', value: 'true' },
  { label: '失败', value: 'false' },
];

const loginSearch = reactive({
  type: undefined as string | undefined,
  userId: undefined as number | undefined,
  success: undefined as string | undefined,
  page: 1,
  pageSize: 10,
});

const loginLoading = ref(false);
const loginList = ref<LoginLog[]>([]);
const loginPagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
});

const loginColumns: DataTableColumns<LoginLog> = [
  { title: 'ID', key: 'id', width: 60 },
  { title: '用户', key: 'username', width: 120 },
  {
    title: '类型',
    key: 'type',
    width: 120,
    render(row: DataTableRowData) {
      const label = loginTypeOptions.find(o => o.value === row.type)?.label || row.type;
      return h(NTag, { type: 'info', size: 'small' }, { default: () => label });
    },
  },
  {
    title: '结果',
    key: 'success',
    width: 100,
    render(row: DataTableRowData) {
      const success = row.success as boolean;
      return h(NTag, { type: success ? 'success' : 'error', size: 'small' }, { default: () => success ? '成功' : '失败' });
    },
  },
  { title: 'IP', key: 'ip', width: 140, render: row => row.ip || '-' },
  { title: '消息', key: 'message', ellipsis: { tooltip: true }, render: row => row.message || '-' },
  { title: 'User-Agent', key: 'userAgent', ellipsis: { tooltip: true }, render: row => row.userAgent || '-' },
  { title: '时间', key: 'createdAt', width: 180, render: row => formatDateTime(row.createdAt as string) },
];

async function loadLoginLogs() {
  loginLoading.value = true;
  try {
    const params: any = { ...loginSearch };
    if (params.success !== undefined) {
      params.success = params.success === 'true';
    }
    const res: any = await getLoginLogs(params);
    loginList.value = res.list || [];
    loginPagination.itemCount = res.total || 0;
    loginPagination.page = res.page || 1;
    loginPagination.pageSize = res.pageSize || 10;
  } finally {
    loginLoading.value = false;
  }
}

function handleLoginSearch() {
  loginSearch.page = 1;
  loadLoginLogs();
}

function handleLoginReset() {
  loginSearch.type = undefined;
  loginSearch.userId = undefined;
  loginSearch.success = undefined;
  loginSearch.page = 1;
  loadLoginLogs();
}

function handleLoginPageChange(page: number) {
  loginSearch.page = page;
  loadLoginLogs();
}

function handleLoginPageSizeChange(pageSize: number) {
  loginSearch.pageSize = pageSize;
  loginSearch.page = 1;
  loadLoginLogs();
}

// ==================== 通用 ====================
function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function showDetail(row: OperationLog) {
  const detail = JSON.stringify({
    method: row.method,
    path: row.path,
    statusCode: row.statusCode,
    requestBody: parseJsonText(row.requestBody),
    oldValue: row.oldValue,
    newValue: row.newValue,
    response: parseJsonText(row.response),
    error: parseJsonText(row.error),
  }, null, 2);

  dialog.info({
    title: '操作详情',
    content: () => h('pre', {
      class: 'max-h-[520px] overflow-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-3 text-xs dark:bg-gray-900',
    }, detail),
    positiveText: '关闭',
  });
}

function parseJsonText(value?: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

onMounted(() => {
  loadOperationLogs();
  loadLoginLogs();
});
</script>

<style scoped>
:deep(.n-tabs-nav) {
  justify-content: flex-start !important;
}
:deep(.n-tabs-tab) {
  flex: 0 0 auto !important;
  padding: 0 16px 12px 16px !important;
}
:deep(.n-tabs-pad) {
  padding-top: 16px !important;
}
</style>
