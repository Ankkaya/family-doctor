<template>
  <div class="page-container agent-debug-page">
    <PageTableCard>
      <div class="debug-shell">
        <section class="debug-header">
          <div>
            <h2 class="page-title">Agent 调试</h2>
            <p class="page-description">输入一次问诊文本，按节点查看完整链路、实际输入输出和 Prompt 内容。</p>
          </div>
          <n-space>
            <n-button tertiary @click="goConsultations">问诊日志</n-button>
            <n-button tertiary @click="clearDebug">清空</n-button>
            <n-button type="primary" :loading="running" @click="runDebug">执行调试</n-button>
          </n-space>
        </section>

        <section class="debug-input-panel">
          <div class="question-field">
            <n-input
              v-model:value="form.question"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 5 }"
              placeholder="例如：我口腔溃疡两天了，家里有什么药可以用？"
            />
          </div>
          <div class="debug-controls">
            <n-select
              v-model:value="form.householdId"
              clearable
              filterable
              :loading="loadingOptions"
              :options="householdOptions"
              placeholder="选择家庭药箱"
            />
            <n-select
              v-model:value="form.userId"
              clearable
              filterable
              :loading="loadingOptions"
              :options="userOptions"
              placeholder="选择用户画像"
            />
            <div class="switch-row">
              <span>允许 RX 推荐</span>
              <n-switch v-model:value="form.allowRxRecommendation" />
            </div>
          </div>
          <div class="memory-debug-controls">
            <n-select
              v-model:value="form.conversationStatus"
              :options="conversationStatusOptions"
              placeholder="会话状态"
            />
            <n-input
              v-model:value="form.historyMessagesJson"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 7 }"
              placeholder='历史消息 JSON，例如 [{"role":"USER","content":"我头痛"}]'
            />
            <n-input
              v-model:value="form.sessionSummaryJson"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 7 }"
              placeholder='会话摘要 JSON，例如 {"symptoms":["头痛"],"recommendedMedicines":["布洛芬"]}'
            />
          </div>
        </section>

        <section class="flow-canvas">
          <div class="flow-track">
            <template v-for="(node, index) in flowNodes" :key="node.key">
              <button
                class="flow-node"
                :class="[
                  `flow-node--${nodeStatus(node.key)}`,
                  { 'flow-node--selected': selectedNodeKey === node.key }
                ]"
                type="button"
                @click="selectNode(node.key)"
              >
                <span class="flow-node__status"></span>
                <span class="flow-node__title">{{ node.title }}</span>
                <span class="flow-node__desc">{{ node.description }}</span>
              </button>
              <span v-if="index < flowNodes.length - 1" class="flow-arrow">→</span>
            </template>
          </div>
        </section>

        <section class="detail-panel">
          <div class="detail-panel__header">
            <div>
              <h3 class="section-title">{{ selectedNodeTitle }}</h3>
              <p class="section-description">{{ selectedNodeDescription }}</p>
            </div>
            <n-space size="small">
              <n-tag v-if="selectedTrace?.llmModel" size="small" type="success" round>{{ selectedTrace.llmModel }}</n-tag>
              <n-tag v-if="selectedTrace" size="small" round>{{ selectedTrace.latencyMs }}ms</n-tag>
              <n-tag v-if="selectedTrace?.error" size="small" type="error" round>error</n-tag>
              <n-tag v-if="result" size="small" type="info" round>药品 {{ result.medicineCount }}</n-tag>
            </n-space>
          </div>

          <n-tabs type="line" animated>
            <n-tab-pane name="overview" tab="概览">
              <div class="overview-grid">
                <div class="info-block">
                  <p class="trace-label">节点能力</p>
                  <div v-if="selectedCapabilities.length" class="tag-list">
                    <n-tag v-for="item in selectedCapabilities" :key="item" size="small" type="info" round>
                      {{ item }}
                    </n-tag>
                  </div>
                  <p v-else class="muted-text">当前节点没有登记能力标签。</p>
                </div>
                <div class="info-block">
                  <p class="trace-label">期望输入</p>
                  <ul v-if="selectedExpectedInput.length" class="contract-list">
                    <li v-for="item in selectedExpectedInput" :key="item">{{ item }}</li>
                  </ul>
                  <p v-else class="muted-text">暂无输入契约。</p>
                </div>
                <div class="info-block">
                  <p class="trace-label">期望输出</p>
                  <ul v-if="selectedExpectedOutput.length" class="contract-list">
                    <li v-for="item in selectedExpectedOutput" :key="item">{{ item }}</li>
                  </ul>
                  <p v-else class="muted-text">暂无输出契约。</p>
                </div>
              </div>

              <div v-if="isUserNode" class="runtime-card">
                <p class="trace-label">用户输入</p>
                <pre class="json-box">{{ form.question || '-' }}</pre>
              </div>

              <div v-else-if="isFinalNode" class="runtime-card runtime-card--result">
                <p class="trace-label">最终回复</p>
                <p class="answer-text">{{ result?.answer || '执行后展示最终回复。' }}</p>
                <p v-if="result?.disclaimer" class="muted-text">{{ result.disclaimer }}</p>
                <div v-if="result?.sessionSummary" class="runtime-card">
                  <p class="trace-label">更新后的会话摘要</p>
                  <pre class="json-box">{{ formatJson(result.sessionSummary) }}</pre>
                </div>
              </div>

              <n-alert v-else-if="result && !selectedTrace" type="warning" :bordered="false">
                本次调试没有返回该节点 Trace，可能是前置节点提前结束，或该节点在当前分支被跳过。
              </n-alert>
            </n-tab-pane>

            <n-tab-pane name="input" tab="输入">
              <pre class="json-box">{{ formatJson(selectedInput) }}</pre>
            </n-tab-pane>

            <n-tab-pane name="output" tab="输出">
              <pre class="json-box">{{ formatJson(selectedOutput) }}</pre>
            </n-tab-pane>

            <n-tab-pane name="prompt" tab="Prompt">
              <div v-if="selectedPrompt || selectedPromptTemplate" class="prompt-grid">
                <div class="info-block">
                  <p class="trace-label">Prompt 信息</p>
                  <p class="prompt-meta">
                    {{ selectedPrompt?.key || selectedPromptTemplate?.key || '-' }}
                    ·
                    {{ selectedPrompt?.version || selectedPromptTemplate?.version || '-' }}
                  </p>
                  <p class="muted-text">
                    {{ selectedPrompt?.expectation || selectedSpec?.promptExpectation || selectedPromptTemplate?.summary || '-' }}
                  </p>
                </div>
                <div class="info-block">
                  <p class="trace-label">来源文件</p>
                  <p>{{ selectedPrompt?.sourceFile || selectedPromptTemplate?.sourceFile || '-' }}</p>
                </div>
                <div v-if="selectedPromptTemplate" class="info-block">
                  <p class="trace-label">模板变量</p>
                  <div class="tag-list">
                    <n-tag v-for="item in selectedPromptTemplate.variables" :key="item" size="small" round>
                      {{ item }}
                    </n-tag>
                  </div>
                </div>
              </div>

              <n-empty
                v-if="!selectedPrompt && !selectedPromptTemplate"
                description="当前节点没有 LLM Prompt"
                size="small"
              />

              <div v-if="selectedPromptTemplate?.content" class="runtime-card">
                <p class="trace-label">Prompt 模板内容</p>
                <pre class="json-box">{{ selectedPromptTemplate.content }}</pre>
              </div>

              <div v-if="selectedPrompt?.systemPrompt || selectedPrompt?.userPrompt" class="prompt-runtime-grid">
                <div v-if="selectedPrompt?.systemPrompt" class="runtime-card">
                  <p class="trace-label">本次 System Prompt</p>
                  <pre class="json-box">{{ selectedPrompt.systemPrompt }}</pre>
                </div>
                <div v-if="selectedPrompt?.userPrompt" class="runtime-card">
                  <p class="trace-label">本次 User Prompt</p>
                  <pre class="json-box">{{ selectedPrompt.userPrompt }}</pre>
                </div>
              </div>
            </n-tab-pane>
          </n-tabs>
        </section>
      </div>
    </PageTableCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import PageTableCard from '@/components/common/PageTableCard.vue';
import {
  getAdminAppUsers,
  getAdminHouseholds,
  runAdminConsultationDebug,
  type AgentTrace,
  type ConsultationDebugRunResult,
  type ConsultationHistoryMessage,
  type ConsultationNodeSpec,
  type ConsultationPromptCatalogItem,
  type ConsultationSessionSummary,
} from '@/api/family-doctor';

type FlowNode = {
  key: string;
  title: string;
  description: string;
};

const router = useRouter();
const message = useMessage();

const DEFAULT_AGENT_NODES: FlowNode[] = [
  { key: 'preprocess', title: '输入预处理', description: '格式规范' },
  { key: 'parse', title: '症状结构化', description: 'LLM 抽取' },
  { key: 'emergency', title: '急症复核', description: '规则兜底' },
  { key: 'special_population', title: '特殊人群', description: '画像识别' },
  { key: 'match', title: '候选药品', description: '全集透传' },
  { key: 'review', title: '适配审查', description: '逐药判断' },
  { key: 'safety', title: '安全审核', description: '风险提示' },
  { key: 'render', title: '回复生成', description: '最终文案' },
  { key: 'summarize', title: '摘要更新', description: 'Memory' },
];

const form = reactive({
  question: '',
  householdId: null as string | null,
  userId: null as string | null,
  allowRxRecommendation: false,
  conversationStatus: 'active',
  historyMessagesJson: '',
  sessionSummaryJson: '',
});

const conversationStatusOptions = [
  { label: '进行中 active', value: 'active' },
  { label: '已总结 resolved', value: 'resolved' },
  { label: '已超时 stale', value: 'stale' },
  { label: '已关闭 closed', value: 'closed' },
];

const loadingOptions = ref(false);
const running = ref(false);
const households = ref<Array<{ id: string; name: string; medicineCount: number; ownerNickname: string | null; ownerPhone: string | null }>>([]);
const users = ref<Array<{ id: string; nickname: string | null; phone: string | null; username: string | null; age: number | null }>>([]);
const result = ref<ConsultationDebugRunResult | null>(null);
const selectedNodeKey = ref('user_input');
const activeNodeKey = ref<string | null>(null);
const completedNodeKeys = ref<Set<string>>(new Set());
let playbackTimer: number | null = null;

const householdOptions = computed(() => households.value.map(item => ({
  label: `${item.name} · ${item.medicineCount} 个药品 · ${item.ownerNickname || item.ownerPhone || '未命名用户'}`,
  value: item.id,
})));

const userOptions = computed(() => users.value.map(item => ({
  label: `${item.nickname || item.phone || item.username || item.id}${item.age ? ` · ${item.age}岁` : ''}`,
  value: item.id,
})));

const nodeSpecMap = computed(() => {
  const map = new Map<string, ConsultationNodeSpec>();
  result.value?.nodeSpecs.forEach(item => map.set(item.nodeName, item));
  result.value?.traces.forEach((trace) => {
    if (trace.spec) {
      map.set(trace.nodeName, trace.spec);
    }
  });
  return map;
});

const promptTemplateMap = computed(() => {
  const map = new Map<string, ConsultationPromptCatalogItem>();
  result.value?.promptCatalog.forEach(item => map.set(item.nodeName, item));
  return map;
});

const traceMap = computed(() => {
  const map = new Map<string, AgentTrace>();
  result.value?.traces.forEach(item => map.set(item.nodeName, item));
  return map;
});

const flowNodes = computed<FlowNode[]>(() => [
  { key: 'user_input', title: '用户输入', description: '调试起点' },
  ...DEFAULT_AGENT_NODES.map(node => ({
    ...node,
    title: nodeSpecMap.value.get(node.key)?.title || node.title,
    description: shortText(nodeSpecMap.value.get(node.key)?.description || node.description, 12),
  })),
  { key: 'final', title: '最终回复', description: '用户可见结果' },
]);

const selectedTrace = computed(() => traceMap.value.get(selectedNodeKey.value) || null);
const selectedSpec = computed(() => selectedTrace.value?.spec || nodeSpecMap.value.get(selectedNodeKey.value) || null);
const selectedPrompt = computed(() => selectedTrace.value?.prompt || null);
const selectedPromptTemplate = computed(() => promptTemplateMap.value.get(selectedNodeKey.value) || null);
const selectedFlowNode = computed(() => flowNodes.value.find(item => item.key === selectedNodeKey.value));
const isUserNode = computed(() => selectedNodeKey.value === 'user_input');
const isFinalNode = computed(() => selectedNodeKey.value === 'final');

const selectedNodeTitle = computed(() => selectedSpec.value?.title || selectedFlowNode.value?.title || selectedNodeKey.value);
const selectedNodeDescription = computed(() => {
  if (isUserNode.value) return '调试输入会作为整个 Agent 链路的起点。';
  if (isFinalNode.value) return 'Agent 返回给用户的最终消息和推荐药品。';
  return selectedSpec.value?.description || '选择节点后查看配置、实际输入输出和 Prompt。';
});
const selectedCapabilities = computed(() => selectedSpec.value?.capabilities || []);
const selectedExpectedInput = computed(() => selectedSpec.value?.expectedInput || []);
const selectedExpectedOutput = computed(() => selectedSpec.value?.expectedOutput || []);
const selectedInput = computed(() => {
  if (isUserNode.value) {
    return {
      question: form.question,
      householdId: form.householdId,
      userId: form.userId,
      allowRxRecommendation: form.allowRxRecommendation,
      conversationStatus: form.conversationStatus,
      historyMessages: parseJsonPreview(form.historyMessagesJson, []),
      sessionSummary: parseJsonPreview(form.sessionSummaryJson, null),
    };
  }
  if (isFinalNode.value) {
    return {
      traces: result.value?.traces.map(item => item.nodeName) || [],
    };
  }
  return stripPromptFields(selectedTrace.value?.input || {});
});
const selectedOutput = computed(() => {
  if (isFinalNode.value) {
    return {
      answer: result.value?.answer || null,
      recommends: result.value?.recommends || [],
      disclaimer: result.value?.disclaimer || null,
    };
  }
  return stripPromptFields(selectedTrace.value?.output || {});
});

async function fetchOptions() {
  loadingOptions.value = true;
  try {
    const [householdRes, userRes] = await Promise.all([
      getAdminHouseholds({ page: 1, pageSize: 100 }),
      getAdminAppUsers({ page: 1, pageSize: 100 }),
    ]);
    households.value = householdRes.items;
    users.value = userRes.items;
  } catch (error: any) {
    message.error(error?.message || '调试选项加载失败');
  } finally {
    loadingOptions.value = false;
  }
}

async function runDebug() {
  const question = form.question.trim();
  if (question.length < 2) {
    message.warning('请输入至少 2 个字符的问题');
    return;
  }

  clearPlayback();
  running.value = true;
  result.value = null;
  selectedNodeKey.value = 'user_input';
  completedNodeKeys.value = new Set();
  startPlayback();

  try {
    const data = await runAdminConsultationDebug({
      question,
      householdId: form.householdId,
      userId: form.userId,
      allowRxRecommendation: form.allowRxRecommendation,
      conversationStatus: form.conversationStatus,
      historyMessages: parseHistoryMessages(),
      sessionSummary: parseSessionSummary(),
    });
    result.value = data;
    completedNodeKeys.value = new Set(flowNodes.value.map(item => item.key));
    selectedNodeKey.value = data.traces[0]?.nodeName || 'final';
    message.success('Agent 调试完成');
  } catch (error: any) {
    message.error(error?.message || 'Agent 调试失败');
  } finally {
    running.value = false;
    activeNodeKey.value = null;
    clearPlayback();
  }
}

function startPlayback() {
  const keys = flowNodes.value.map(item => item.key);
  let index = 0;
  activeNodeKey.value = keys[index];
  playbackTimer = window.setInterval(() => {
    const completed = new Set(completedNodeKeys.value);
    completed.add(keys[index]);
    completedNodeKeys.value = completed;
    index = Math.min(index + 1, keys.length - 1);
    activeNodeKey.value = keys[index];
  }, 850);
}

function clearPlayback() {
  if (playbackTimer) {
    window.clearInterval(playbackTimer);
    playbackTimer = null;
  }
}

function clearDebug() {
  clearPlayback();
  running.value = false;
  activeNodeKey.value = null;
  completedNodeKeys.value = new Set();
  result.value = null;
  selectedNodeKey.value = 'user_input';
  form.question = '';
  form.historyMessagesJson = '';
  form.sessionSummaryJson = '';
  form.conversationStatus = 'active';
}

function nodeStatus(key: string) {
  if (activeNodeKey.value === key) return 'running';
  if (traceMap.value.get(key)?.error) return 'error';
  if (completedNodeKeys.value.has(key) || traceMap.value.has(key)) return 'done';
  if (result.value && !['user_input', 'final'].includes(key) && !traceMap.value.has(key)) return 'skipped';
  return 'pending';
}

function selectNode(key: string) {
  selectedNodeKey.value = key;
}

function goConsultations() {
  router.push('/family-doctor/consultations').catch(() => undefined);
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function stripPromptFields(value: Record<string, unknown>) {
  const cloned = { ...value };
  delete cloned.systemPrompt;
  delete cloned.userPrompt;
  delete cloned.promptKey;
  delete cloned.promptVersion;
  return cloned;
}

function parseHistoryMessages(): ConsultationHistoryMessage[] {
  const raw = form.historyMessagesJson.trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('历史消息必须是数组 JSON');
  }
  return parsed;
}

function parseSessionSummary(): Partial<ConsultationSessionSummary> | null {
  const raw = form.sessionSummaryJson.trim();
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('会话摘要必须是对象 JSON');
  }
  return parsed;
}

function parseJsonPreview(value: string, fallback: unknown) {
  const raw = value.trim();
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return 'JSON 格式错误';
  }
}

function shortText(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

onMounted(() => {
  fetchOptions();
});

onBeforeUnmount(() => {
  clearPlayback();
});
</script>

<style scoped>
.agent-debug-page {
  color: var(--n-text-color);
}

.agent-debug-page :deep(.n-card.bg-container) {
  background: var(--n-color);
}

.debug-shell {
  display: grid;
  gap: 16px;
}

.debug-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 4px;
}

.page-title,
.section-title {
  margin: 0;
  font-weight: 600;
  color: var(--n-text-color);
}

.page-title {
  margin-bottom: 6px;
  font-size: 20px;
}

.section-title {
  margin-bottom: 4px;
  font-size: 16px;
}

.page-description,
.section-description,
.muted-text {
  margin: 0;
  color: var(--n-text-color-2);
  line-height: 1.6;
}

.debug-input-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px 360px;
  gap: 14px;
  border: 1px solid var(--n-border-color);
  border-radius: 12px;
  padding: 14px;
  background: var(--n-color-embedded);
}

.question-field,
.debug-controls {
  min-width: 0;
}

.debug-controls {
  display: grid;
  gap: 10px;
  align-content: start;
}

.memory-debug-controls {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 0 12px;
  color: var(--n-text-color-2);
  background: var(--n-color);
}

.flow-canvas {
  overflow-x: auto;
  border: 1px solid var(--n-border-color);
  border-radius: 14px;
  padding: 18px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--n-primary-color) 6%, transparent), transparent 34%),
    var(--n-color-embedded);
}

.flow-track {
  display: flex;
  align-items: center;
  min-width: max-content;
}

.flow-node {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas:
    "status title"
    "status desc";
  column-gap: 8px;
  min-width: 132px;
  border: 1px solid var(--n-border-color);
  border-radius: 12px;
  padding: 12px;
  text-align: left;
  color: var(--n-text-color);
  background: var(--n-color);
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease, background 0.18s ease;
}

.flow-node:hover,
.flow-node--selected {
  border-color: var(--n-primary-color);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--n-primary-color) 14%, transparent);
}

.flow-node--running {
  transform: translateY(-2px);
  border-color: var(--n-primary-color);
  background: color-mix(in srgb, var(--n-primary-color) 12%, var(--n-color));
}

.flow-node--done .flow-node__status {
  background: #18a058;
}

.flow-node--running .flow-node__status {
  background: var(--n-primary-color);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--n-primary-color) 18%, transparent);
}

.flow-node--error .flow-node__status {
  background: var(--n-error-color);
}

.flow-node--skipped {
  opacity: 0.62;
}

.flow-node__status {
  grid-area: status;
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 999px;
  background: var(--n-border-color);
}

.flow-node__title {
  grid-area: title;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-node__desc {
  grid-area: desc;
  overflow: hidden;
  margin-top: 4px;
  color: var(--n-text-color-3);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-arrow {
  padding: 0 10px;
  color: var(--n-text-color-3);
  font-size: 18px;
}

.detail-panel {
  min-width: 0;
  border: 1px solid var(--n-border-color);
  border-radius: 14px;
  padding: 16px;
  background: var(--n-color);
}

.detail-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.overview-grid,
.prompt-grid,
.prompt-runtime-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.prompt-runtime-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.info-block,
.runtime-card {
  min-width: 0;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 12px;
  background: var(--n-color-embedded);
}

.runtime-card {
  margin-top: 12px;
}

.runtime-card--result {
  border-color: color-mix(in srgb, var(--n-success-color) 34%, var(--n-border-color));
  background: color-mix(in srgb, var(--n-success-color) 8%, var(--n-color));
}

.trace-label {
  margin: 0 0 8px;
  color: var(--n-text-color-3);
  font-size: 12px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.contract-list {
  margin: 0;
  padding-left: 18px;
  color: var(--n-text-color-2);
  line-height: 1.7;
}

.json-box {
  max-height: 360px;
  margin: 0;
  overflow: auto;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 12px;
  color: var(--n-text-color);
  background: var(--n-code-color, var(--n-color-embedded));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.answer-text {
  margin: 0 0 10px;
  color: var(--n-text-color);
  line-height: 1.7;
}

.prompt-meta {
  margin: 0 0 8px;
  color: var(--n-text-color);
  font-weight: 600;
}

@media (max-width: 1180px) {
  .debug-input-panel {
    grid-template-columns: 1fr;
  }

  .overview-grid,
  .prompt-grid,
  .prompt-runtime-grid {
    grid-template-columns: 1fr;
  }
}
</style>
