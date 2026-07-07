<template>
  <div class="page-container">
    <PageSearchCard>
      <QueryForm :model="query" @search="fetchSessions">
        <n-form-item label="关键词">
          <n-input v-model:value="query.keyword" clearable placeholder="会话标题 / 会话 ID / 家庭 / 用户" />
        </n-form-item>
        <n-form-item label="家庭 ID">
          <n-input v-model:value="query.householdId" clearable placeholder="household_xxx" />
        </n-form-item>
        <n-form-item label="用户 ID">
          <n-input v-model:value="query.userId" clearable placeholder="app_user_xxx" />
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
        :data="sessions"
        :loading="loading"
        :pagination="false"
        :scroll-x="1110"
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
import { useRouter } from 'vue-router';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NSpace, NTag, useDialog, useMessage } from 'naive-ui';
import dayjs from 'dayjs';
import PagePagination from '@/components/common/PagePagination.vue';
import PageSearchCard from '@/components/common/PageSearchCard.vue';
import PageTableCard from '@/components/common/PageTableCard.vue';
import QueryForm from '@/components/common/QueryForm.vue';
import { useAuthStore } from '@/store';
import {
  deleteAdminConsultation,
  getAdminConsultations,
  type ConsultationSession,
} from '@/api/family-doctor';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const loading = ref(false);
const sessions = ref<ConsultationSession[]>([]);

const query = reactive({
  keyword: '',
  householdId: '',
  userId: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const columns: DataTableColumns<ConsultationSession> = [
  { title: '标题', key: 'title', minWidth: 220, ellipsis: { tooltip: true }, render: row => row.title || '-' },
  { title: '家庭', key: 'householdName', minWidth: 160, render: row => row.householdName || row.householdId || '-' },
  { title: '用户', key: 'userNickname', minWidth: 150, render: row => row.userNickname || row.userPhone || row.userId || row.devUserId || '-' },
  {
    title: '状态',
    key: 'status',
    width: 96,
    render: row => h(NTag, { size: 'small', type: statusTagType(row.status), round: true }, {
      default: () => statusLabel(row.status),
    }),
  },
  {
    title: '摘要',
    key: 'summary',
    minWidth: 220,
    ellipsis: { tooltip: true },
    render: row => summaryText(row.summary),
  },
  { title: '会话 ID', key: 'id', minWidth: 220, ellipsis: { tooltip: true } },
  { title: '消息数', key: 'messageCount', width: 90, align: 'center' },
  { title: '摘要更新时间', key: 'summaryUpdatedAt', width: 180, render: row => formatDate(row.summaryUpdatedAt || '') },
  { title: '创建时间', key: 'createdAt', width: 180, render: row => formatDate(row.createdAt) },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render(row) {
      const actions: VNode[] = [
        h(NButton, { text: true, type: 'primary', onClick: () => openDetail(row.id) }, { default: () => '查看' }),
      ];
      if (authStore.hasPermission('family-doctor:consultation:delete')) {
        actions.push(h(NButton, { text: true, type: 'error', onClick: () => handleDelete(row) }, {
          default: () => '删除',
        }));
      }
      return h(NSpace, null, { default: () => actions });
    },
  },
];

function formatDate(value: string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    active: '进行中',
    resolved: '已总结',
    stale: '已超时',
    closed: '已关闭',
  };
  return labels[status || 'active'] || status || '进行中';
}

function statusTagType(status?: string) {
  if (status === 'closed') return 'default';
  if (status === 'stale') return 'warning';
  if (status === 'resolved') return 'success';
  return 'info';
}

function summaryText(summary: ConsultationSession['summary']) {
  if (!summary) return '-';
  const parts = [
    summary.chiefComplaint || summary.lastTopic,
    summary.symptoms?.length ? `症状：${summary.symptoms.join('、')}` : '',
    summary.recommendedMedicines?.length ? `推荐：${summary.recommendedMedicines.join('、')}` : '',
    summary.riskFlags?.length ? `风险：${summary.riskFlags.join('、')}` : '',
  ].filter(Boolean);
  return parts.join('；') || '-';
}

async function fetchSessions() {
  loading.value = true;
  try {
    const res = await getAdminConsultations({
      keyword: query.keyword || undefined,
      householdId: query.householdId || undefined,
      userId: query.userId || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    sessions.value = res.items;
    pagination.total = res.total;
  } catch (error: any) {
    message.error(error?.message || '问诊日志加载失败');
  } finally {
    loading.value = false;
  }
}

function openDetail(id: string) {
  router.push(`/family-doctor/consultations/${id}`).catch(() => undefined);
}

function handleSearch() {
  pagination.page = 1;
  fetchSessions();
}

function handleReset() {
  query.keyword = '';
  query.householdId = '';
  query.userId = '';
  pagination.page = 1;
  fetchSessions();
}

function handlePageChange(page: number) {
  pagination.page = page;
  fetchSessions();
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  fetchSessions();
}

function handleDelete(row: ConsultationSession) {
  const title = row.title || row.id;
  dialog.warning({
    title: '删除确认',
    content: `确定删除「${title}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteAdminConsultation(row.id);
        message.success('删除成功');
        await fetchSessions();
      } catch (error: any) {
        message.error(error?.message || '删除失败');
      }
    },
  });
}

onMounted(() => {
  fetchSessions();
});
</script>
