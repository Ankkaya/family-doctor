<template>
  <div class="page-container">
    <PageSearchCard>
      <QueryForm :model="query" @search="fetchHouseholds">
        <n-form-item label="关键词">
          <n-input v-model:value="query.keyword" clearable placeholder="家庭名称 / 昵称 / 手机号" />
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
      <n-data-table
        :columns="columns"
        :data="households"
        :loading="loading"
        :pagination="false"
        :scroll-x="1180"
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

    <n-modal
      v-model:show="memberVisible"
      title="家庭成员"
      preset="card"
      :style="memberModalStyle"
    >
      <n-spin :show="memberLoading">
        <n-data-table
          :columns="memberColumns"
          :data="members"
          :pagination="false"
          :scroll-x="memberTableScrollX"
          :max-height="memberTableMaxHeight"
          striped
        />
      </n-spin>
    </n-modal>
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
  deleteAdminHousehold,
  getAdminHouseholdMembers,
  getAdminHouseholds,
  type AdminHousehold,
  type HouseholdMember,
} from '@/api/family-doctor';

const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const loading = ref(false);
const memberLoading = ref(false);
const memberVisible = ref(false);
const households = ref<AdminHousehold[]>([]);
const members = ref<HouseholdMember[]>([]);
const currentHouseholdId = ref('');
const memberTableScrollX = 760;
const memberModalStyle = {
  width: 'min(860px, 94vw)',
  height: 'min(560px, 82vh)',
};
const memberTableMaxHeight = 'min(420px, calc(82vh - 140px))';

const query = reactive({
  keyword: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const columns: DataTableColumns<AdminHousehold> = [
  { title: '家庭名称', key: 'name', minWidth: 180, fixed: 'left', ellipsis: { tooltip: true } },
  {
    title: '拥有者',
    key: 'ownerNickname',
    minWidth: 160,
    render: row => row.ownerNickname || row.ownerPhone || row.ownerUserId,
  },
  { title: '成员数', key: 'memberCount', width: 90, align: 'center' },
  { title: '药品数', key: 'medicineCount', width: 90, align: 'center' },
  { title: '问诊数', key: 'sessionCount', width: 90, align: 'center' },
  { title: '最近问诊', key: 'lastConsultationAt', width: 180, render: row => formatDate(row.lastConsultationAt) },
  { title: '创建时间', key: 'createdAt', width: 180, render: row => formatDate(row.createdAt) },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render: row => renderActions(row),
  },
];

const memberColumns: DataTableColumns<HouseholdMember> = [
  {
    title: '成员',
    key: 'displayName',
    minWidth: 180,
    render: row => row.displayName || row.user.nickname || row.user.phone || row.user.id,
  },
  {
    title: '角色',
    key: 'role',
    width: 110,
    render: row => h(NTag, { size: 'small', type: row.role === 'owner' ? 'success' : 'default' }, {
      default: () => row.role === 'owner' ? '拥有者' : '成员',
    }),
  },
  { title: '手机号', key: 'phone', minWidth: 150, render: row => row.user.phone || '-' },
  { title: '邮箱', key: 'email', minWidth: 180, render: row => row.user.email || '-' },
  { title: '加入时间', key: 'joinedAt', width: 180, render: row => formatDate(row.joinedAt) },
];

function formatDate(value?: string | null) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

async function fetchHouseholds() {
  loading.value = true;
  try {
    const res = await getAdminHouseholds({
      keyword: query.keyword || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    households.value = res.items;
    pagination.total = res.total;
  } catch (error: any) {
    message.error(error?.message || '家庭列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function openMembers(id: string) {
  currentHouseholdId.value = id;
  memberVisible.value = true;
  memberLoading.value = true;
  try {
    members.value = await getAdminHouseholdMembers(id);
  } catch (error: any) {
    message.error(error?.message || '家庭成员加载失败');
  } finally {
    memberLoading.value = false;
  }
}

function renderActions(row: AdminHousehold) {
  const actions: VNode[] = [
    h(NButton, { text: true, type: 'primary', onClick: () => openMembers(row.id) }, { default: () => '成员' }),
  ];

  if (authStore.hasPermission('family-doctor:household:delete')) {
    actions.push(h(NButton, { text: true, type: 'error', onClick: () => handleDelete(row) }, {
      default: () => '删除',
    }));
  }

  return h(NSpace, null, { default: () => actions });
}

function handleDelete(row: AdminHousehold) {
  dialog.warning({
    title: '删除确认',
    content: `确定删除「${row.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteAdminHousehold(row.id);
        if (currentHouseholdId.value === row.id) {
          memberVisible.value = false;
          members.value = [];
        }
        message.success('删除成功');
        await fetchHouseholds();
      } catch (error: any) {
        message.error(error?.message || '删除失败');
      }
    },
  });
}

function handleSearch() {
  pagination.page = 1;
  fetchHouseholds();
}

function handleReset() {
  query.keyword = '';
  pagination.page = 1;
  fetchHouseholds();
}

function handlePageChange(page: number) {
  pagination.page = page;
  fetchHouseholds();
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  fetchHouseholds();
}

onMounted(() => {
  fetchHouseholds();
});
</script>
