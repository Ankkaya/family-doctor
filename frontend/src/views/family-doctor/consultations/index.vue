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
            <n-button tertiary @click="openPromptCatalog">Prompt 管理</n-button>
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
      title="问诊调试详情"
      preset="card"
      style="width: min(1320px, 96vw)"
    >
      <n-spin :show="detailLoading">
        <div v-if="detail" class="detail-layout">
          <section class="summary-grid">
            <div class="summary-card">
              <p class="summary-label">家庭</p>
              <p class="summary-value">{{ detail.householdName || detail.householdId || '-' }}</p>
            </div>
            <div class="summary-card">
              <p class="summary-label">发起用户</p>
              <p class="summary-value">{{ detail.userNickname || detail.userPhone || detail.userId || detail.devUserId || '-' }}</p>
            </div>
            <div class="summary-card">
              <p class="summary-label">轮次数</p>
              <p class="summary-value">{{ detail.turns.length }}</p>
            </div>
            <div class="summary-card">
              <p class="summary-label">节点数</p>
              <p class="summary-value">{{ detail.traces.length }}</p>
            </div>
          </section>

          <n-tabs type="line" animated>
            <n-tab-pane name="turns" tab="轮次 Trace">
              <div class="turn-list">
                <n-card
                  v-for="turn in detail.turns"
                  :key="turn.turnIndex"
                  size="small"
                  class="turn-card"
                  :title="`第 ${turn.turnIndex} 轮`"
                >
                  <div class="turn-head">
                    <div class="turn-question">
                      <p class="trace-label">用户问题</p>
                      <p class="turn-question-text">{{ turn.userMessage?.content || '-' }}</p>
                      <span class="turn-time">{{ formatDate(turn.startedAt) }}</span>
                    </div>
                    <div class="turn-result">
                      <p class="trace-label">最终答复</p>
                      <p class="turn-answer-text">{{ turn.assistantMessage?.content || '本轮暂无助手回复' }}</p>
                    </div>
                  </div>

                  <div v-if="turn.assistantMessage?.recommends" class="recommend-block">
                    <p class="trace-label">最终推荐结果</p>
                    <pre class="json-box">{{ formatJson(turn.assistantMessage.recommends) }}</pre>
                  </div>

                  <n-empty v-if="turn.traces.length === 0" description="本轮暂无 Trace 记录" size="small" />

                  <div v-else class="trace-card-list">
                    <n-card
                      v-for="trace in turn.traces"
                      :key="trace.id"
                      size="small"
                      class="trace-card"
                    >
                      <div class="trace-card-header">
                        <div>
                          <div class="trace-title-row">
                            <h4 class="trace-title">{{ trace.spec?.title || trace.nodeName }}</h4>
                            <n-tag size="small" round>{{ trace.nodeName }}</n-tag>
                            <n-tag v-if="trace.llmModel" size="small" type="success" round>{{ trace.llmModel }}</n-tag>
                          </div>
                          <p class="trace-description">{{ trace.spec?.description || '暂无节点说明。' }}</p>
                        </div>
                        <div class="trace-metrics">
                          <span>{{ trace.latencyMs }}ms</span>
                          <span>{{ formatDate(trace.createdAt) }}</span>
                        </div>
                      </div>

                      <div class="capability-list">
                        <n-tag
                          v-for="capability in trace.spec?.capabilities || []"
                          :key="capability"
                          size="small"
                          type="info"
                          round
                        >
                          {{ capability }}
                        </n-tag>
                      </div>

                      <div class="trace-contract-grid">
                        <div class="contract-card">
                          <p class="trace-label">期望输入</p>
                          <ul class="contract-list">
                            <li v-for="item in trace.spec?.expectedInput || []" :key="item">{{ item }}</li>
                          </ul>
                        </div>
                        <div class="contract-card">
                          <p class="trace-label">期望输出</p>
                          <ul class="contract-list">
                            <li v-for="item in trace.spec?.expectedOutput || []" :key="item">{{ item }}</li>
                          </ul>
                        </div>
                      </div>

                      <div v-if="trace.prompt" class="prompt-brief">
                        <div class="prompt-brief-head">
                          <p class="trace-label">Prompt</p>
                          <span class="prompt-key">{{ trace.prompt.key }} · {{ trace.prompt.version }}</span>
                        </div>
                        <p class="prompt-note">{{ trace.prompt.expectation || '当前节点使用 Prompt。' }}</p>
                      </div>

                      <n-collapse>
                        <n-collapse-item title="查看运行时输入 / 输出" :name="`${trace.id}-runtime`">
                          <div class="trace-grid">
                            <div>
                              <p class="trace-label">实际输入</p>
                              <pre class="json-box">{{ formatJson(stripPromptFields(trace.input)) }}</pre>
                            </div>
                            <div>
                              <p class="trace-label">实际输出</p>
                              <pre class="json-box">{{ formatJson(trace.output) }}</pre>
                            </div>
                          </div>
                        </n-collapse-item>
                        <n-collapse-item
                          v-if="trace.prompt?.systemPrompt || trace.prompt?.userPrompt"
                          title="查看 Prompt 内容"
                          :name="`${trace.id}-prompt`"
                        >
                          <div class="trace-grid">
                            <div v-if="trace.prompt?.systemPrompt">
                              <p class="trace-label">System Prompt</p>
                              <pre class="json-box">{{ trace.prompt.systemPrompt }}</pre>
                            </div>
                            <div v-if="trace.prompt?.userPrompt">
                              <p class="trace-label">User Prompt</p>
                              <pre class="json-box">{{ trace.prompt.userPrompt }}</pre>
                            </div>
                          </div>
                        </n-collapse-item>
                      </n-collapse>

                      <n-alert v-if="trace.error" type="error" class="mt-3">
                        {{ trace.error }}
                      </n-alert>
                    </n-card>
                  </div>
                </n-card>
              </div>
            </n-tab-pane>

            <n-tab-pane name="messages" tab="原始消息">
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
            </n-tab-pane>
          </n-tabs>
        </div>
      </n-spin>
    </n-modal>

    <n-modal
      v-model:show="promptVisible"
      title="Prompt 管理"
      preset="card"
      style="width: min(1180px, 94vw)"
    >
      <n-spin :show="promptLoading">
        <div class="prompt-layout">
          <n-empty v-if="!promptCatalog.length" description="暂无 Prompt 目录" size="small" />
          <n-card
            v-for="prompt in promptCatalog"
            :key="prompt.key"
            size="small"
            class="prompt-card"
            :title="prompt.title"
          >
            <div class="prompt-meta-grid">
              <div>
                <p class="trace-label">节点</p>
                <p>{{ prompt.nodeName }}</p>
              </div>
              <div>
                <p class="trace-label">版本</p>
                <p>{{ prompt.version }}</p>
              </div>
              <div>
                <p class="trace-label">来源文件</p>
                <p>{{ prompt.sourceFile }}</p>
              </div>
              <div>
                <p class="trace-label">模式</p>
                <p>{{ prompt.mode }}</p>
              </div>
            </div>

            <p class="prompt-summary">{{ prompt.summary }}</p>

            <div class="trace-contract-grid">
              <div class="contract-card">
                <p class="trace-label">运行时变量</p>
                <ul class="contract-list">
                  <li v-for="variable in prompt.variables" :key="variable">{{ variable }}</li>
                </ul>
              </div>
              <div class="contract-card">
                <p class="trace-label">输入契约</p>
                <ul class="contract-list">
                  <li v-for="item in prompt.inputContract" :key="item">{{ item }}</li>
                </ul>
              </div>
              <div class="contract-card">
                <p class="trace-label">输出契约</p>
                <ul class="contract-list">
                  <li v-for="item in prompt.outputContract" :key="item">{{ item }}</li>
                </ul>
              </div>
            </div>

            <p class="trace-label">Prompt 内容</p>
            <pre class="json-box">{{ prompt.content }}</pre>
          </n-card>
        </div>
      </n-spin>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, type VNode } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NSpace, useDialog, useMessage } from 'naive-ui';
import dayjs from 'dayjs';
import PagePagination from '@/components/common/PagePagination.vue';
import PageSearchCard from '@/components/common/PageSearchCard.vue';
import PageTableCard from '@/components/common/PageTableCard.vue';
import QueryForm from '@/components/common/QueryForm.vue';
import { useAuthStore } from '@/store';
import {
  deleteAdminConsultation,
  getAdminConsultation,
  getAdminConsultationPromptCatalog,
  getAdminConsultations,
  type ConsultationDetail,
  type ConsultationPromptCatalogItem,
  type ConsultationSession,
} from '@/api/family-doctor';

const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const loading = ref(false);
const detailLoading = ref(false);
const detailVisible = ref(false);
const promptVisible = ref(false);
const promptLoading = ref(false);
const sessions = ref<ConsultationSession[]>([]);
const detail = ref<ConsultationDetail | null>(null);
const promptCatalog = ref<ConsultationPromptCatalogItem[]>([]);

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

const activePromptCatalog = computed(() => detail.value?.promptCatalog?.length ? detail.value.promptCatalog : promptCatalog.value);

function formatDate(value: string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function stripPromptFields(input: Record<string, unknown>) {
  const { systemPrompt, userPrompt, promptKey, promptVersion, ...rest } = input || {};
  return rest;
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
    if (!promptCatalog.value.length && detail.value.promptCatalog?.length) {
      promptCatalog.value = detail.value.promptCatalog;
    }
  } catch (error: any) {
    message.error(error?.message || '问诊详情加载失败');
  } finally {
    detailLoading.value = false;
  }
}

async function openPromptCatalog() {
  promptVisible.value = true;
  if (activePromptCatalog.value.length) {
    promptCatalog.value = activePromptCatalog.value;
    return;
  }

  promptLoading.value = true;
  try {
    promptCatalog.value = await getAdminConsultationPromptCatalog();
  } catch (error: any) {
    message.error(error?.message || 'Prompt 目录加载失败');
  } finally {
    promptLoading.value = false;
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
  gap: 18px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 14px;
  background: var(--n-color);
}

.summary-label {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.summary-value {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.turn-list,
.prompt-layout,
.trace-card-list,
.message-list {
  display: grid;
  gap: 12px;
}

.turn-card,
.trace-card,
.prompt-card {
  border-radius: 10px;
}

.turn-head {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.turn-question,
.turn-result,
.contract-card {
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 14px;
  background: rgba(148, 163, 184, 0.08);
}

.turn-question-text,
.turn-answer-text,
.trace-description,
.prompt-summary {
  margin: 0;
  line-height: 1.7;
}

.turn-time,
.prompt-key {
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.recommend-block {
  margin-bottom: 14px;
}

.trace-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.trace-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.trace-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.trace-description {
  color: var(--n-text-color-2);
}

.trace-metrics {
  display: grid;
  gap: 6px;
  font-size: 12px;
  text-align: right;
  color: var(--n-text-color-3);
}

.capability-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.trace-contract-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.contract-list {
  margin: 0;
  padding-left: 18px;
  line-height: 1.7;
  color: var(--n-text-color-2);
}

.prompt-brief {
  margin-bottom: 12px;
  border-radius: 10px;
  padding: 12px 14px;
  background: rgba(59, 130, 246, 0.08);
}

.prompt-brief-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.prompt-note {
  margin: 6px 0 0;
  color: var(--n-text-color-2);
  line-height: 1.6;
}

.trace-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.message-item {
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
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
  max-height: 320px;
  overflow: auto;
  border-radius: 10px;
  margin: 8px 0 0;
  padding: 10px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  background: rgba(100, 116, 139, 0.1);
}

.trace-label {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.prompt-meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

@media (max-width: 1024px) {
  .summary-grid,
  .turn-head,
  .trace-contract-grid,
  .trace-grid,
  .prompt-meta-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
