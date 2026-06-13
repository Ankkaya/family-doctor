<template>
  <div class="page-container consultation-detail-page">
    <PageTableCard>
      <n-spin :show="loading">
        <div v-if="detail" class="detail-layout">
          <section class="session-strip">
            <div class="session-strip__main">
              <h2 class="session-strip__title">{{ detail.title || '问诊详情' }}</h2>
              <div class="session-strip__meta">
                <span class="session-meta-pill">家庭：{{ detail.householdName || detail.householdId || '-' }}</span>
                <span class="session-meta-pill">用户：{{ detail.userNickname || detail.userPhone || detail.userId || detail.devUserId || '-' }}</span>
                <span class="session-meta-pill">创建时间：{{ formatDate(detail.createdAt) }}</span>
                <span class="session-meta-pill">轮次：{{ detail.turns.length }}</span>
                <span class="session-meta-pill">节点：{{ detail.traces.length }}</span>
                <span class="session-meta-pill">当前：{{ selectedTurn ? `第 ${selectedTurn.turnIndex} 轮` : '-' }}</span>
              </div>
            </div>
            <div class="session-strip__actions">
              <n-button @click="goBack">返回列表</n-button>
            </div>
          </section>

          <div class="detail-content-grid">
            <section class="conversation-panel">
              <div class="section-header">
                <div>
                  <h3 class="section-title">对话记录</h3>
                  <p class="section-description">选择一条助手回复，右侧展示这一轮完整链路。</p>
                </div>
              </div>

              <div class="message-list">
                <div
                  v-for="item in detail.messages"
                  :key="item.id"
                  class="message-row"
                  :class="messageItemClass(item)"
                >
                  <div class="message-time">{{ formatDate(item.createdAt) }}</div>
                  <div
                    class="message-item"
                    @click="item.role === 'ASSISTANT' ? handleMessageClick(item.id) : undefined"
                  >
                    <div class="message-meta">
                      <n-tag size="small" :type="item.role === 'USER' ? 'info' : 'success'">
                        {{ item.role === 'USER' ? '用户' : '助手' }}
                      </n-tag>
                    </div>
                    <p class="message-content">{{ item.content }}</p>
                  </div>
                </div>
              </div>
            </section>

            <section class="trace-panel">
              <div class="section-header">
                <div>
                  <h3 class="section-title">{{ selectedTurn ? `第 ${selectedTurn.turnIndex} 轮链路` : '调用链路' }}</h3>
                  <p class="section-description">
                    右侧按时间线展示从用户输入到最终返回结果的整个 Agent 过程，并附上每个节点的 Prompt 模板与实际输入输出。
                  </p>
                </div>
              </div>

              <n-empty v-if="!selectedTurn" description="当前没有可展示的调用过程" size="small" />

              <template v-else>
                <n-timeline size="large" class="trace-timeline">
                  <n-timeline-item type="info" title="用户输入" content="" class="trace-timeline-item">
                    <div class="timeline-card timeline-card--entry">
                      <div class="timeline-card__header">
                        <div>
                          <h4 class="trace-title">用户输入</h4>
                          <p class="trace-description">本轮用户原始问题，作为整个调用链路的起点。</p>
                        </div>
                        <div class="trace-metrics">
                          <span>{{ formatDate(selectedTurn.startedAt) }}</span>
                        </div>
                      </div>
                      <p class="turn-text">{{ selectedTurn.userMessage?.content || '-' }}</p>
                    </div>
                  </n-timeline-item>

                  <n-timeline-item
                    v-if="selectedTurn.traces.length === 0"
                    type="warning"
                    title="未记录节点 Trace"
                    content=""
                    class="trace-timeline-item"
                  >
                    <div class="timeline-card timeline-card--empty">
                      <p class="trace-description">
                        这一轮没有保存节点执行记录。通常表示这条数据生成时还没有接入 Trace、调用在落库前中断，或这是一条旧历史数据。
                      </p>
                    </div>
                  </n-timeline-item>

                  <n-timeline-item
                    v-for="trace in selectedTurn.traces"
                    :key="trace.id"
                    :type="trace.error ? 'error' : 'success'"
                    :title="trace.spec?.title || trace.nodeName"
                    content=""
                    class="trace-timeline-item"
                  >
                    <n-card size="small" class="timeline-card trace-card">
                      <div class="trace-card-header">
                        <div>
                          <div class="trace-title-row">
                            <h4 class="trace-title">{{ trace.spec?.title || trace.nodeName }}</h4>
                            <n-tag size="small" round>{{ trace.nodeName }}</n-tag>
                            <n-tag v-if="trace.llmModel" size="small" type="success" round>{{ trace.llmModel }}</n-tag>
                            <n-tag v-if="trace.error" size="small" type="error" round>error</n-tag>
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

                      <div v-if="trace.prompt || findPromptTemplate(trace.nodeName)" class="prompt-block">
                        <div class="prompt-block-head">
                          <div>
                            <p class="trace-label">Prompt 模板</p>
                            <p class="prompt-meta">
                              {{ trace.prompt?.key || findPromptTemplate(trace.nodeName)?.key || '-' }}
                              ·
                              {{ trace.prompt?.version || findPromptTemplate(trace.nodeName)?.version || '-' }}
                            </p>
                          </div>
                          <span class="prompt-file">
                            {{ trace.prompt?.sourceFile || findPromptTemplate(trace.nodeName)?.sourceFile || '-' }}
                          </span>
                        </div>

                        <p class="prompt-note">
                          {{ trace.prompt?.expectation || trace.spec?.promptExpectation || findPromptTemplate(trace.nodeName)?.summary || '当前节点无独立 Prompt。' }}
                        </p>

                        <div v-if="findPromptTemplate(trace.nodeName)" class="trace-contract-grid trace-contract-grid--triple">
                          <div class="contract-card">
                            <p class="trace-label">变量</p>
                            <ul class="contract-list">
                              <li v-for="item in findPromptTemplate(trace.nodeName)?.variables || []" :key="item">{{ item }}</li>
                            </ul>
                          </div>
                          <div class="contract-card">
                            <p class="trace-label">输入契约</p>
                            <ul class="contract-list">
                              <li v-for="item in findPromptTemplate(trace.nodeName)?.inputContract || []" :key="item">{{ item }}</li>
                            </ul>
                          </div>
                          <div class="contract-card">
                            <p class="trace-label">输出契约</p>
                            <ul class="contract-list">
                              <li v-for="item in findPromptTemplate(trace.nodeName)?.outputContract || []" :key="item">{{ item }}</li>
                            </ul>
                          </div>
                        </div>

                        <n-collapse>
                          <n-collapse-item
                            v-if="findPromptTemplate(trace.nodeName)?.content"
                            title="查看 Prompt 模板内容"
                            :name="`${trace.id}-template`"
                          >
                            <pre class="json-box">{{ findPromptTemplate(trace.nodeName)?.content }}</pre>
                          </n-collapse-item>
                          <n-collapse-item
                            v-if="trace.prompt?.systemPrompt || trace.prompt?.userPrompt"
                            title="查看本次实际 Prompt"
                            :name="`${trace.id}-runtime-prompt`"
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
                      </div>

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

                      <n-alert v-if="trace.error" type="error" class="mt-3">
                        {{ trace.error }}
                      </n-alert>
                    </n-card>
                  </n-timeline-item>

                  <n-timeline-item type="success" title="最终回复" content="" class="trace-timeline-item">
                    <div class="timeline-card timeline-card--result">
                      <div class="timeline-card__header">
                        <div>
                          <h4 class="trace-title">最终回复</h4>
                          <p class="trace-description">本轮返回给用户的最终消息结果。</p>
                        </div>
                        <div class="trace-metrics">
                          <span>{{ selectedTurn.completedAt ? formatDate(selectedTurn.completedAt) : '-' }}</span>
                        </div>
                      </div>
                      <p class="turn-text">{{ selectedTurn.assistantMessage?.content || '本轮暂无助手回复' }}</p>
                      <div v-if="selectedTurn.assistantMessage?.recommends" class="recommend-block">
                        <p class="trace-label">最终推荐结果</p>
                        <pre class="json-box">{{ formatJson(selectedTurn.assistantMessage.recommends) }}</pre>
                      </div>
                    </div>
                  </n-timeline-item>
                </n-timeline>
              </template>
            </section>
          </div>
        </div>
      </n-spin>
    </PageTableCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import dayjs from 'dayjs';
import PageTableCard from '@/components/common/PageTableCard.vue';
import {
  getAdminConsultation,
  type ConsultationDetail,
  type ConsultationMessage,
  type ConsultationPromptCatalogItem,
  type ConsultationTurn,
} from '@/api/family-doctor';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const loading = ref(false);
const detail = ref<ConsultationDetail | null>(null);
const selectedAssistantMessageId = ref<string | null>(null);

const selectedTurn = computed<ConsultationTurn | null>(() => {
  if (!detail.value?.turns?.length) {
    return null;
  }

  if (selectedAssistantMessageId.value) {
    return detail.value.turns.find(
      item => item.assistantMessage?.id === selectedAssistantMessageId.value,
    ) ?? null;
  }

  return detail.value.turns[detail.value.turns.length - 1] ?? null;
});

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

function findTurnByAssistantId(messageId: string) {
  return detail.value?.turns.find(item => item.assistantMessage?.id === messageId) ?? null;
}

function findPromptTemplate(nodeName: string): ConsultationPromptCatalogItem | null {
  return detail.value?.promptCatalog.find(item => item.nodeName === nodeName) ?? null;
}

function handleMessageClick(messageId: string) {
  const turn = findTurnByAssistantId(messageId);
  if (!turn?.assistantMessage?.id) {
    return;
  }
  selectedAssistantMessageId.value = turn.assistantMessage.id;
}

function messageItemClass(item: ConsultationMessage) {
  const turn = item.role === 'ASSISTANT' ? findTurnByAssistantId(item.id) : null;
  return {
    'message-row--user': item.role === 'USER',
    'message-row--assistant': item.role === 'ASSISTANT',
    'message-row--selectable': Boolean(turn),
    'message-row--active': selectedAssistantMessageId.value && item.id === selectedAssistantMessageId.value,
  };
}

async function fetchDetail() {
  const id = String(route.params.id || '');
  if (!id) {
    message.error('问诊会话 ID 无效');
    return;
  }

  loading.value = true;
  try {
    detail.value = await getAdminConsultation(id);
    const lastTurn = detail.value.turns[detail.value.turns.length - 1];
    selectedAssistantMessageId.value = lastTurn?.assistantMessage?.id ?? null;
  } catch (error: any) {
    message.error(error?.message || '问诊详情加载失败');
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push('/family-doctor/consultations').catch(() => undefined);
}

onMounted(() => {
  fetchDetail();
});
</script>

<style scoped>
.consultation-detail-page {
  min-height: 100%;
  --fd-detail-surface: rgba(255, 255, 255, 0.94);
  --fd-detail-surface-soft: rgba(248, 250, 252, 0.88);
  --fd-detail-surface-blue: rgba(239, 246, 255, 0.86);
  --fd-detail-surface-green: rgba(236, 253, 245, 0.86);
  --fd-detail-surface-warning: rgba(255, 251, 235, 0.88);
  --fd-detail-border: rgba(148, 163, 184, 0.22);
  --fd-detail-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
  --fd-detail-json: rgba(241, 245, 249, 0.94);
}

:global(html.dark .consultation-detail-page),
:global(.dark .consultation-detail-page) {
  --fd-detail-surface: rgba(15, 23, 42, 0.92);
  --fd-detail-surface-soft: rgba(30, 41, 59, 0.78);
  --fd-detail-surface-blue: rgba(30, 41, 59, 0.92);
  --fd-detail-surface-green: rgba(20, 83, 45, 0.28);
  --fd-detail-surface-warning: rgba(120, 53, 15, 0.24);
  --fd-detail-border: rgba(148, 163, 184, 0.16);
  --fd-detail-shadow: 0 12px 30px rgba(2, 6, 23, 0.28);
  --fd-detail-json: rgba(2, 6, 23, 0.5);
}

.consultation-detail-page :deep(.n-card.bg-container) {
  overflow: hidden;
}

.consultation-detail-page :deep(.n-card__content),
.consultation-detail-page :deep(.n-timeline),
.consultation-detail-page :deep(.n-timeline-item),
.consultation-detail-page :deep(.n-timeline-item-content),
.consultation-detail-page :deep(.n-timeline-item-content__content) {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.detail-layout {
  display: grid;
  gap: 12px;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.session-strip,
.conversation-panel,
.trace-panel,
.timeline-card,
.contract-card {
  min-width: 0;
  max-width: 100%;
  border: 1px solid var(--fd-detail-border);
  border-radius: 12px;
  background: var(--fd-detail-surface);
  box-shadow: var(--fd-detail-shadow);
  color: rgb(var(--base-text-color));
  box-sizing: border-box;
}

.session-strip {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
}

.session-strip__main {
  min-width: 0;
}

.session-strip__title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}

.session-strip__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.session-meta-pill {
  border: 1px solid var(--fd-detail-border);
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--n-text-color-2);
  background: var(--fd-detail-surface-soft);
  max-width: 100%;
  overflow-wrap: anywhere;
}

.session-strip__actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

.summary-label {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.detail-content-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.85fr) minmax(0, 1.35fr);
  gap: 16px;
  align-items: start;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.conversation-panel,
.trace-panel {
  padding: 16px;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.section-header {
  margin-bottom: 12px;
}

.section-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
}

.section-description {
  margin: 0;
  color: var(--n-text-color-2);
  line-height: 1.6;
}

.message-list,
.trace-card-list {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.message-row {
  display: grid;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
}

.message-row--user {
  justify-items: start;
}

.message-row--assistant {
  justify-items: end;
}

.message-item {
  display: inline-grid;
  border: 1px solid var(--fd-detail-border);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--fd-detail-surface-soft);
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  min-width: 30%;
  width: fit-content;
  max-width: 65%;
  box-sizing: border-box;
}

.message-item :deep(pre) {
  margin-top: 8px;
}

.message-row--user .message-item {
  border-color: rgba(148, 163, 184, 0.42);
}

.message-row--assistant .message-item {
  border-color: rgba(16, 185, 129, 0.24);
}

.message-row--user .message-item {
  cursor: default;
}

.message-row--selectable .message-item {
  cursor: pointer;
}

.message-row--selectable .message-item:hover {
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.message-row--active .message-item {
  border-color: var(--n-primary-color);
  background: rgba(59, 130, 246, 0.1);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.08);
}

.message-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.message-row--assistant .message-meta {
  justify-content: flex-end;
}

.message-row--assistant .message-content {
  text-align: left;
}

.message-content,
.turn-text,
.trace-description,
.prompt-note {
  margin: 0;
  line-height: 1.7;
  overflow-wrap: anywhere;
  word-break: break-word;
  min-width: 0;
}

.message-time,
.turn-time,
.prompt-meta,
.prompt-file {
  display: inline-block;
  font-size: 12px;
  color: var(--n-text-color-3);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.message-row--assistant .message-time {
  text-align: right;
}

.trace-timeline {
  --n-line-color: rgba(148, 163, 184, 0.28);
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.trace-timeline-item :deep(.n-timeline-item-content) {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.trace-timeline-item :deep(.n-timeline-item-content__title),
.trace-timeline-item :deep(.n-timeline-item-content__content) {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
  box-sizing: border-box;
}

.trace-timeline-item :deep(.n-timeline-item-timeline__circle) {
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.9);
}

.timeline-card {
  padding: 12px 14px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.timeline-card--entry {
  background: var(--fd-detail-surface-blue);
}

.timeline-card--result {
  background: var(--fd-detail-surface-green);
}

.timeline-card--empty {
  background: var(--fd-detail-surface-warning);
}

.timeline-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  min-width: 0;
}

.timeline-card__header > div:first-child {
  min-width: 0;
}

.recommend-block,
.prompt-block {
  margin-top: 12px;
}

.trace-card {
  border-radius: 12px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.trace-card :deep(.n-card-header),
.trace-card :deep(.n-card__content) {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.trace-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  min-width: 0;
}

.trace-card-header > div:first-child {
  min-width: 0;
}

.trace-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  min-width: 0;
}

.trace-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.trace-metrics {
  display: grid;
  gap: 6px;
  flex: 0 1 min(180px, 38%);
  min-width: 0;
  max-width: min(180px, 38%);
  font-size: 12px;
  text-align: right;
  color: var(--n-text-color-3);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.trace-metrics span {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.capability-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.trace-contract-grid,
.trace-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.trace-contract-grid > *,
.trace-grid > * {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.trace-contract-grid {
  margin-bottom: 12px;
}

.trace-contract-grid--triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.contract-list {
  margin: 0;
  padding-left: 18px;
  line-height: 1.7;
  color: var(--n-text-color-2);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.prompt-block {
  border-radius: 10px;
  padding: 12px 14px;
  background: var(--fd-detail-surface-blue);
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.prompt-block-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  max-width: 100%;
}

.json-box {
  max-height: 340px;
  overflow: auto;
  max-width: 100%;
  border-radius: 10px;
  margin: 8px 0 0;
  padding: 10px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  background: var(--fd-detail-json);
  box-sizing: border-box;
}

/* These selectors are intentionally fully global: scoped dark selectors can miss
   Naive UI internals and leave the page with light cards in dark mode. */
:global(html.dark .consultation-detail-page),
:global(.dark .consultation-detail-page) {
  --fd-detail-surface: rgba(15, 23, 42, 0.96);
  --fd-detail-surface-soft: rgba(30, 41, 59, 0.9);
  --fd-detail-surface-blue: rgba(30, 41, 59, 0.94);
  --fd-detail-surface-green: rgba(20, 83, 45, 0.36);
  --fd-detail-surface-warning: rgba(120, 53, 15, 0.34);
  --fd-detail-border: rgba(148, 163, 184, 0.22);
  --fd-detail-shadow: 0 12px 30px rgba(2, 6, 23, 0.32);
  --fd-detail-json: rgba(2, 6, 23, 0.72);
}

:global(html.dark .consultation-detail-page .session-strip),
:global(html.dark .consultation-detail-page .conversation-panel),
:global(html.dark .consultation-detail-page .trace-panel),
:global(html.dark .consultation-detail-page .timeline-card),
:global(html.dark .consultation-detail-page .contract-card),
:global(html.dark .consultation-detail-page .message-item),
:global(.dark .consultation-detail-page .session-strip),
:global(.dark .consultation-detail-page .conversation-panel),
:global(.dark .consultation-detail-page .trace-panel),
:global(.dark .consultation-detail-page .timeline-card),
:global(.dark .consultation-detail-page .contract-card),
:global(.dark .consultation-detail-page .message-item) {
  border-color: var(--fd-detail-border);
  background: var(--fd-detail-surface);
  color: rgb(var(--base-text-color));
  box-shadow: var(--fd-detail-shadow);
}

:global(html.dark .consultation-detail-page .message-item),
:global(.dark .consultation-detail-page .message-item) {
  background: var(--fd-detail-surface-soft);
}

:global(html.dark .consultation-detail-page .message-row--user .message-item),
:global(.dark .consultation-detail-page .message-row--user .message-item) {
  border-color: rgba(148, 163, 184, 0.34);
}

:global(html.dark .consultation-detail-page .message-row--assistant .message-item),
:global(.dark .consultation-detail-page .message-row--assistant .message-item) {
  border-color: rgba(16, 185, 129, 0.28);
}

:global(html.dark .consultation-detail-page .message-row--active .message-item),
:global(.dark .consultation-detail-page .message-row--active .message-item) {
  border-color: var(--n-primary-color);
  background: rgba(37, 99, 235, 0.22);
}

:global(html.dark .consultation-detail-page .timeline-card--entry),
:global(.dark .consultation-detail-page .timeline-card--entry) {
  background: var(--fd-detail-surface-blue);
}

:global(html.dark .consultation-detail-page .timeline-card--result),
:global(.dark .consultation-detail-page .timeline-card--result) {
  background: var(--fd-detail-surface-green);
}

:global(html.dark .consultation-detail-page .timeline-card--empty),
:global(.dark .consultation-detail-page .timeline-card--empty) {
  background: var(--fd-detail-surface-warning);
}

:global(html.dark .consultation-detail-page .prompt-block),
:global(.dark .consultation-detail-page .prompt-block) {
  background: var(--fd-detail-surface-soft);
}

:global(html.dark .consultation-detail-page .json-box),
:global(.dark .consultation-detail-page .json-box) {
  background: var(--fd-detail-json);
}

:global(html.dark .consultation-detail-page .session-meta-pill),
:global(.dark .consultation-detail-page .session-meta-pill) {
  border-color: var(--fd-detail-border);
  background: var(--fd-detail-surface-soft);
}

:global(html.dark .consultation-detail-page .trace-timeline),
:global(.dark .consultation-detail-page .trace-timeline) {
  --n-line-color: rgba(148, 163, 184, 0.18);
}

:global(html.dark .consultation-detail-page .trace-timeline-item .n-timeline-item-timeline__circle),
:global(.dark .consultation-detail-page .trace-timeline-item .n-timeline-item-timeline__circle) {
  box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.7);
}

:global(html.dark .consultation-detail-page .n-card.timeline-card),
:global(.dark .consultation-detail-page .n-card.timeline-card) {
  background-color: var(--fd-detail-surface);
  color: rgb(var(--base-text-color));
}

.trace-label {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

@media (max-width: 1200px) {
  .detail-content-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 1024px) {
  .session-strip,
  .trace-contract-grid,
  .trace-grid,
  .trace-contract-grid--triple {
    grid-template-columns: minmax(0, 1fr);
  }

  .session-strip {
    display: grid;
  }

  .trace-timeline-item :deep(.n-timeline-item-content) {
    min-width: 0;
  }
}
</style>
