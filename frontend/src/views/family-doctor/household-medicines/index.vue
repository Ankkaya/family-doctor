<template>
  <div class="page-container">
    <PageSearchCard>
      <QueryForm :model="query" @search="fetchMedicines">
        <n-form-item label="关键词">
          <n-input v-model:value="query.keyword" clearable placeholder="家庭名称 / 药品名称 / 适应症" />
        </n-form-item>
        <n-form-item label="家庭 ID">
          <n-input v-model:value="query.householdId" clearable placeholder="household_xxx" />
        </n-form-item>
        <n-form-item label="用户 ID">
          <n-input v-model:value="query.userId" clearable placeholder="app_user_xxx" />
        </n-form-item>
        <n-form-item label="有效期">
          <n-select
            v-model:value="query.expireStatus"
            clearable
            placeholder="全部"
            :options="expireStatusOptions"
            style="width: 140px"
          />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" @click="handleSearch">搜索</n-button>
            <n-button @click="handleReset">重置</n-button>
          </n-space>
        </n-form-item>
      </QueryForm>
    </PageSearchCard>

    <n-alert type="info" :bordered="false" class="mb-4">
      当前页面展示各家庭自行维护的药品信息；后台仅删除异常记录，不编辑用户药箱内容。
    </n-alert>

    <PageTableCard>
      <n-data-table
        :columns="columns"
        :data="medicines"
        :loading="loading"
        :pagination="false"
        :scroll-x="1480"
        striped
      />
      <template #footer>
        <PagePagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :item-count="pagination.total"
          @update:page="handlePageChange"
          @update:pageSize="handlePageSizeChange"
        />
      </template>
    </PageTableCard>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref, type VNode } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NSpace, NTag, useDialog, useMessage } from 'naive-ui';
import dayjs from 'dayjs';
import PagePagination from '@/components/common/PagePagination.vue';
import PageSearchCard from '@/components/common/PageSearchCard.vue';
import PageTableCard from '@/components/common/PageTableCard.vue';
import QueryForm from '@/components/common/QueryForm.vue';
import { useAuthStore } from '@/store';
import {
  deleteAdminHouseholdMedicine,
  getAdminHouseholdMedicines,
  type HouseholdMedicineItem,
} from '@/api/family-doctor';

const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const loading = ref(false);
const medicines = ref<HouseholdMedicineItem[]>([]);

const expireStatusOptions = [
  { label: '已过期', value: 'expired' },
  { label: '30天内过期', value: 'expiring' },
  { label: '有效', value: 'valid' },
  { label: '未记录', value: 'unknown' },
];

const query = reactive<{
  keyword: string;
  householdId: string;
  userId: string;
  expireStatus: 'expired' | 'expiring' | 'valid' | 'unknown' | null;
}>({
  keyword: '',
  householdId: '',
  userId: '',
  expireStatus: null,
});

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const columns: DataTableColumns<HouseholdMedicineItem> = [
  { title: '家庭', key: 'householdName', minWidth: 170, fixed: 'left', ellipsis: { tooltip: true } },
  {
    title: '拥有者',
    key: 'userNickname',
    minWidth: 150,
    render: row => row.userNickname || row.userPhone || row.ownerUserId,
  },
  { title: '药品', key: 'name', minWidth: 180, ellipsis: { tooltip: true } },
  {
    title: '分类',
    key: 'otc',
    width: 140,
    render: row => h(NTag, { size: 'small', type: row.otc === 'OTC' ? 'success' : 'warning' }, {
      default: () => formatOtcLabel(row.otc),
    }),
  },
  { title: '数量', key: 'quantity', width: 80, align: 'center' },
  {
    title: '有效期',
    key: 'expireAt',
    width: 130,
    render: row => renderExpireAt(row.expireAt),
  },
  { title: '来源', key: 'source', width: 110, render: row => row.source || '-' },
  { title: '适应症', key: 'indication', minWidth: 260, ellipsis: { tooltip: true } },
  { title: '更新时间', key: 'inventoryUpdatedAt', width: 180, render: row => formatDate(row.inventoryUpdatedAt) },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render(row) {
      const actions: VNode[] = [];
      if (authStore.hasPermission('family-doctor:household-medicine:delete')) {
        actions.push(h(NButton, { text: true, type: 'error', onClick: () => handleDelete(row) }, {
          default: () => '删除',
        }));
      }
      return actions.length ? h(NSpace, null, { default: () => actions }) : '-';
    },
  },
];

function formatDate(value?: string | null) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

function formatOtcLabel(value: HouseholdMedicineItem['otc']) {
  return value === 'OTC' ? 'OTC(非处方药)' : 'RX(处方药)';
}

function renderExpireAt(value: string | null) {
  if (!value) {
    return h(NTag, { size: 'small' }, { default: () => '未记录' });
  }

  const date = dayjs(value);
  const today = dayjs().startOf('day');
  if (date.isBefore(today)) {
    return h(NTag, { size: 'small', type: 'error' }, { default: () => date.format('YYYY-MM-DD') });
  }
  if (date.diff(today, 'day') <= 30) {
    return h(NTag, { size: 'small', type: 'warning' }, { default: () => date.format('YYYY-MM-DD') });
  }
  return h(NTag, { size: 'small', type: 'success' }, { default: () => date.format('YYYY-MM-DD') });
}

async function fetchMedicines() {
  loading.value = true;
  try {
    const res = await getAdminHouseholdMedicines({
      keyword: query.keyword || undefined,
      householdId: query.householdId || undefined,
      userId: query.userId || undefined,
      expireStatus: query.expireStatus || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    medicines.value = res.items;
    pagination.total = res.total;
  } catch (error: any) {
    message.error(error?.message || '家庭药箱加载失败');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  fetchMedicines();
}

function handleReset() {
  query.keyword = '';
  query.householdId = '';
  query.userId = '';
  query.expireStatus = null;
  pagination.page = 1;
  fetchMedicines();
}

function handlePageChange(page: number) {
  pagination.page = page;
  fetchMedicines();
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  fetchMedicines();
}

function handleDelete(row: HouseholdMedicineItem) {
  dialog.warning({
    title: '删除确认',
    content: `确定删除「${row.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteAdminHouseholdMedicine(row.inventoryId);
        message.success('删除成功');
        await fetchMedicines();
      } catch (error: any) {
        message.error(error?.message || '删除失败');
      }
    },
  });
}

onMounted(() => {
  fetchMedicines();
});
</script>
