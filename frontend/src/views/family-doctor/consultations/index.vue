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

    <n-modal
      v-model:show="detailVisible"
      title="问诊详情"
      preset="card"
      style="width: min(980px, 94vw)"
    >
      <n-spin :show="detailLoading">
        <div v-if="detail" class="detail-layout">
          <section>
            <h3 class="detail-title">归属信息</h3>
            <div class="owner-grid">
              <div>
                <p class="trace-label">家庭</p>
                <p>{{ detail.householdName || detail.householdId || '-' }}</p>
              </div>
              <div>
                <p class="trace-label">发起用户</p>
                <p>{{ detail.userNickname || detail.userPhone || detail.userId || detail.devUserId || '-' }}</p>
              </div>
            </div>
          </section>

          <section>
            <h3 class="detail-title">对话消息</h3>
            <div class="message-list">
              <div
                v-for="item in detail.messages"
                :key="item.id"
                class="message-item"
                :class="item.role === 'USER' ? 'message-item--user' : 'message-item--assistant'"
              >
                <div class="message-meta">
                  <n-tag size="small" :type="item.role === 'USER' ? 'info' : 'success'">
                    {{ item.role === 'USER' ? '用户' : '助手' }}
                  </n-tag>
                  <span>{{ formatDate(item.createdAt) }}</span>
                </div>
                <p>{{ item.content }}</p>
                <pre v-if="item.recommends" class="json-box">{{ formatJson(item.recommends) }}</pre>
              </div>
            </div>
          </section>

          <section>
            <h3 class="detail-title">Agent Trace</h3>
            <n-collapse accordion>
              <n-collapse-item
                v-for="trace in detail.traces"
                :key="trace.id"
                :title="`${trace.nodeName} · ${trace.latencyMs}ms`"
                :name="trace.id"
              >
                <div class="trace-grid">
                  <div>
                    <p class="trace-label">Input</p>
                    <pre class="json-box">{{ formatJson(trace.input) }}</pre>
                  </div>
                  <div>
                    <p class="trace-label">Output</p>
                    <pre class="json-box">{{ formatJson(trace.output) }}</pre>
                  </div>
                </div>
                <n-alert v-if="trace.error" type="error" class="mt-3">
                  {{ trace.error }}
                </n-alert>
              </n-collapse-item>
            </n-collapse>
          </section>
        </div>
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
  deleteAdminConsultation,
  getAdminConsultation,
  getAdminConsultations,
  type ConsultationDetail,
  type ConsultationSession,
} from '@/api/family-doctor';

const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const loading = ref(false);
const detailLoading = ref(false);
const detailVisible = ref(false);
const sessions = ref<ConsultationSession[]>([]);
const detail = ref<ConsultationDetail | null>(null);

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
  { title: '会话 ID', key: 'id', minWidth: 220, ellipsis: { tooltip: true } },
  { title: '消息数', key: 'messageCount', width: 90, align: 'center' },
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

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
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

async function openDetail(id: string) {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    detail.value = await getAdminConsultation(id);
  } catch (error: any) {
    message.error(error?.message || '问诊详情加载失败');
  } finally {
    detailLoading.value = false;
  }
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
        if (detail.value?.id === row.id) {
          detailVisible.value = false;
          detail.value = null;
        }
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

<style scoped>
.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
}

.detail-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
}

.message-list {
  display: grid;
  gap: 10px;
}

.message-item {
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 12px;
  background: var(--n-color);
}

.message-item--user {
  border-color: rgba(32, 128, 240, 0.22);
}

.message-item--assistant {
  border-color: rgba(24, 160, 88, 0.22);
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.json-box {
  max-height: 260px;
  overflow: auto;
  border-radius: 8px;
  margin: 8px 0 0;
  padding: 10px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  background: rgba(100, 116, 139, 0.1);
}

.trace-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.owner-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 12px;
}

.trace-label {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

@media (max-width: 768px) {
  .trace-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
