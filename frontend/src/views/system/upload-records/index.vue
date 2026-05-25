<template>
  <div class="page-container">
    <PageSearchCard>
      <QueryForm :model="searchForm" @search="handleSearch">
        <n-form-item label="模块">
          <n-input v-model:value="searchForm.module" placeholder="模块" clearable />
        </n-form-item>
        <n-form-item label="原始文件名">
          <n-input v-model:value="searchForm.originalName" placeholder="原始文件名" clearable />
        </n-form-item>
        <n-form-item label="关联ID">
          <n-input v-model:value="searchForm.refId" placeholder="关联ID" clearable />
        </n-form-item>
        <n-form-item label="状态">
          <n-select v-model:value="searchForm.status" :options="statusOptions" placeholder="状态" clearable />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" @click="handleSearch">搜索</n-button>
            <n-button @click="handleReset">重置</n-button>
          </n-space>
        </n-form-item>
      </QueryForm>
    </PageSearchCard>

    <PageTableCard>
      <n-data-table :columns="columns" :data="recordList" :loading="loading" :pagination="false" />
      <template #footer>
        <PagePagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="pagination.pageSizes"
          :item-count="pagination.itemCount"
          :show-size-picker="pagination.showSizePicker"
          @update:page="handlePageChange"
          @update:pageSize="handlePageSizeChange"
        />
      </template>
    </PageTableCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h, onMounted } from 'vue';
import { NTag, NButton, NSpace, NImage } from 'naive-ui';
import type { DataTableColumns, DataTableRowData } from 'naive-ui';
import PagePagination from '@/components/common/PagePagination.vue';
import PageSearchCard from '@/components/common/PageSearchCard.vue';
import PageTableCard from '@/components/common/PageTableCard.vue';
import QueryForm from '@/components/common/QueryForm.vue';
import { getUploadRecords, type UploadRecord } from '@/api/upload-records';

const statusOptions = [
  { label: '正常', value: 'ACTIVE' },
  { label: '已删除', value: 'DELETED' },
];

const moduleOptions = [
  { label: '用户头像', value: 'avatars' },
  { label: '商品图片', value: 'products' },
  { label: '轮播图', value: 'banners' },
  { label: '其他', value: 'others' },
];

const searchForm = reactive({
  module: '',
  originalName: '',
  refId: '',
  status: undefined as string | undefined,
  page: 1,
  pageSize: 10,
});

const loading = ref(false);
const recordList = ref<UploadRecord[]>([]);
const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
});

function formatFileSize(size: number): string {
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
  if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB';
  return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function isImage(mimeType: string): boolean {
  return Boolean(mimeType) && mimeType.startsWith('image/');
}

const columns: DataTableColumns<UploadRecord> = [
  { title: 'ID', key: 'id', width: 60 },
  { title: '用户ID', key: 'userId', width: 80 },
  {
    title: '预览',
    key: 'url',
    width: 80,
    render(row: DataTableRowData) {
      const url = row.url as string | undefined;
      const mimeType = row.mimeType as string | undefined;
      if (url && isImage(mimeType || '')) {
        return h(NImage, { src: url, width: 50, height: 50, objectFit: 'cover', previewSrc: url });
      }
      return h(NTag, { type: 'default', size: 'small' }, { default: () => '非图片' });
    },
  },
  { title: '原始文件名', key: 'originalName', ellipsis: { tooltip: true } },
  { title: 'ObjectKey', key: 'objectKey', ellipsis: { tooltip: true } },
  {
    title: '模块',
    key: 'module',
    width: 120,
    render(row: DataTableRowData) {
      const label = moduleOptions.find(o => o.value === row.module)?.label || row.module || '-';
      return h(NTag, { type: 'info', size: 'small' }, { default: () => label });
    },
  },
  { title: '关联ID', key: 'refId', width: 120, ellipsis: { tooltip: true }, render: row => row.refId || '-' },
  { title: '关联类型', key: 'refType', width: 120, render: row => row.refType || '-' },
  { title: 'MIME类型', key: 'mimeType', width: 150, render: row => row.mimeType || '-' },
  {
    title: '大小',
    key: 'size',
    width: 100,
    render(row: DataTableRowData) {
      return row.size == null ? '-' : formatFileSize(row.size as number);
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row: DataTableRowData) {
      const status = row.status as string | undefined;
      const type = !status || status === 'ACTIVE' ? 'success' : 'error';
      const label = !status || status === 'ACTIVE' ? '正常' : '已删除';
      return h(NTag, { type, size: 'small' }, { default: () => label });
    },
  },
  { title: '上传时间', key: 'createdAt', width: 180, render: row => formatDateTime(row.createdAt as string) },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render(row: DataTableRowData) {
      return h(
        NButton,
        { text: true, type: 'primary', size: 'small', disabled: !row.url, onClick: () => row.url && window.open(row.url as string, '_blank') },
        { default: () => '下载' }
      );
    },
  },
];

async function loadData() {
  loading.value = true;
  try {
    const params: any = {
      page: searchForm.page,
      pageSize: searchForm.pageSize,
    };
    if (searchForm.module) params.module = searchForm.module;
    if (searchForm.originalName) params.originalName = searchForm.originalName;
    if (searchForm.refId) params.refId = searchForm.refId;
    if (searchForm.status) params.status = searchForm.status;

    const res: any = await getUploadRecords(params);
    recordList.value = res.list || [];
    pagination.itemCount = res.total || 0;
    pagination.page = res.page || 1;
    pagination.pageSize = res.pageSize || 10;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  searchForm.page = 1;
  loadData();
}

function handleReset() {
  searchForm.module = '';
  searchForm.originalName = '';
  searchForm.refId = '';
  searchForm.status = undefined;
  searchForm.page = 1;
  loadData();
}

function handlePageChange(page: number) {
  searchForm.page = page;
  loadData();
}

function handlePageSizeChange(pageSize: number) {
  searchForm.pageSize = pageSize;
  searchForm.page = 1;
  loadData();
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

onMounted(() => {
  loadData();
});
</script>
