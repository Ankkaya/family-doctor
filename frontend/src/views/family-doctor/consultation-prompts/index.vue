<template>
  <div class="page-container">
    <PageSearchCard>
      <QueryForm :model="query" @search="handleSearch">
        <n-form-item label="关键词">
          <n-input
            v-model:value="query.keyword"
            clearable
            placeholder="Prompt 标题 / 节点 / 文件名"
          />
        </n-form-item>
        <n-form-item label="节点">
          <n-select
            v-model:value="query.nodeName"
            clearable
            :options="nodeOptions"
            placeholder="全部节点"
          />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" @click="handleSearch">搜索</n-button>
            <n-button @click="handleReset">重置</n-button>
            <n-button tertiary @click="goBack">返回问诊日志</n-button>
          </n-space>
        </n-form-item>
      </QueryForm>
    </PageSearchCard>

    <PageTableCard>
      <div class="prompt-page-header">
        <div>
          <h2 class="page-title">Prompt 管理</h2>
          <p class="page-description">查看问诊链路中各节点的 Prompt 定义、输入输出契约和当前版本。</p>
        </div>
        <div class="summary-pill">
          共 {{ filteredPrompts.length }} 条
        </div>
      </div>

      <n-spin :show="loading">
        <n-empty v-if="!filteredPrompts.length" description="暂无 Prompt 目录" size="small" />
        <div v-else class="prompt-layout">
          <n-card
            v-for="prompt in filteredPrompts"
            :key="prompt.key"
            size="small"
            class="prompt-card"
            :title="prompt.title"
          >
            <template #header-extra>
              <n-space size="small">
                <n-tag size="small" round>{{ prompt.nodeName }}</n-tag>
                <n-tag size="small" type="success" round>{{ prompt.version }}</n-tag>
              </n-space>
            </template>

            <div class="prompt-meta-grid">
              <div>
                <p class="trace-label">来源文件</p>
                <p>{{ prompt.sourceFile }}</p>
              </div>
              <div>
                <p class="trace-label">模式</p>
                <p>{{ prompt.mode }}</p>
              </div>
              <div>
                <p class="trace-label">变量数</p>
                <p>{{ prompt.variables.length }}</p>
              </div>
              <div>
                <p class="trace-label">输出字段</p>
                <p>{{ prompt.outputContract.length }}</p>
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
    </PageTableCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import PageSearchCard from '@/components/common/PageSearchCard.vue';
import PageTableCard from '@/components/common/PageTableCard.vue';
import QueryForm from '@/components/common/QueryForm.vue';
import {
  getAdminConsultationPromptCatalog,
  type ConsultationPromptCatalogItem,
} from '@/api/family-doctor';

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const promptCatalog = ref<ConsultationPromptCatalogItem[]>([]);

const query = reactive({
  keyword: '',
  nodeName: null as string | null,
});

const nodeOptions = computed(() => (
  Array.from(new Set(promptCatalog.value.map(item => item.nodeName)))
    .map(nodeName => ({
      label: nodeName,
      value: nodeName,
    }))
));

const filteredPrompts = computed(() => {
  const keyword = query.keyword.trim().toLowerCase();

  return promptCatalog.value.filter((item) => {
    const matchNode = !query.nodeName || item.nodeName === query.nodeName;
    const matchKeyword = !keyword || [
      item.title,
      item.nodeName,
      item.key,
      item.sourceFile,
      item.summary,
    ].some(field => field.toLowerCase().includes(keyword));

    return matchNode && matchKeyword;
  });
});

async function fetchPromptCatalog() {
  loading.value = true;
  try {
    promptCatalog.value = await getAdminConsultationPromptCatalog();
  } catch (error: any) {
    message.error(error?.message || 'Prompt 目录加载失败');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  return undefined;
}

function handleReset() {
  query.keyword = '';
  query.nodeName = null;
}

function goBack() {
  router.push('/family-doctor/consultations').catch(() => undefined);
}

onMounted(() => {
  fetchPromptCatalog();
});
</script>

<style scoped>
.prompt-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.page-title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
}

.page-description {
  margin: 0;
  color: var(--n-text-color-2);
  line-height: 1.6;
}

.summary-pill {
  flex: 0 0 auto;
  border: 1px solid var(--n-border-color);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--n-text-color-2);
  background: var(--n-color);
}

.prompt-layout {
  display: grid;
  gap: 12px;
}

.prompt-card {
  border-radius: 10px;
}

.prompt-meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.prompt-summary {
  margin: 0 0 12px;
  line-height: 1.7;
}

.trace-contract-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.contract-card {
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 14px;
  background: rgba(148, 163, 184, 0.08);
}

.contract-list {
  margin: 0;
  padding-left: 18px;
  line-height: 1.7;
  color: var(--n-text-color-2);
}

.trace-label {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.json-box {
  max-height: 360px;
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

@media (max-width: 1024px) {
  .prompt-page-header,
  .prompt-meta-grid,
  .trace-contract-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .prompt-page-header {
    display: grid;
  }
}
</style>
