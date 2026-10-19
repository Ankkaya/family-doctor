import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

type PromptDefinition = {
  key: string;
  title: string;
  nodeName: string;
  version: string;
  sourceFile: string;
  mode: 'system' | 'system+user-template';
  variables: string[];
  inputContract: string[];
  outputContract: string[];
  summary: string;
};

export type ConsultationNodeSpec = {
  nodeName: string;
  title: string;
  description: string;
  capabilities: string[];
  expectedInput: string[];
  expectedOutput: string[];
  promptKey?: string;
  promptExpectation?: string;
};

export type ConsultationPromptCatalogItem = PromptDefinition & {
  content: string;
};

const NODE_SPECS: Record<string, ConsultationNodeSpec> = {
  intent_router: {
    nodeName: 'intent_router',
    title: '意图路由',
    description: '仅结合系统提示词、历史对话和本轮问题，选择 general 通用引导或 medicine 药品场景。',
    capabilities: ['意图分类', '上下文理解', '入口引导'],
    expectedInput: ['systemPrompt', 'historyMessages', 'question'],
    expectedOutput: ['profile: general | medicine', 'content: 消解指代和省略信息后的问题，1–2000 字符'],
  },
  general_reply: {
    nodeName: 'general_reply', title: '通用模型回复',
    description: '根据历史、原话和消解结果，一次调用模型生成完整交流/功能引导回答，不做二次分流。',
    capabilities: ['一次性模型回复', '上下文理解', '功能引导'],
    expectedInput: ['originalQuestion', 'resolvedQuestion', 'historyMessages'],
    expectedOutput: ['answer: 完整回答正文'],
    promptKey: 'consult.general.system', promptExpectation: '一次非流式文本生成，通过一个 AG-UI 内容事件返回全文；不调用业务工具。',
  },
  medicine: {
    nodeName: 'medicine', title: '药品主模型与原生工具循环',
    description: 'LangChain create_agent 注册药品查询工具，主模型直接判断如何查询；不再规划三类任务。内置 ModelCallLimitMiddleware 限制本轮主模型最多两次。',
    capabilities: ['原生工具调用', '主模型最多两次', '真实失败原因', '来源引用'],
    expectedInput: ['originalQuestion', 'resolvedQuestion', 'historyMessages', 'userProfile', 'sessionSummary'],
    expectedOutput: ['answer', 'mainModelCalls', 'lookupResults', 'modelReturns', 'evaluations', 'references'],
    promptKey: 'consult.medicine.system', promptExpectation: 'medicine.system.v2.md；工具后的续答也计入两次，不再单独调用 render 模型。',
  },
  medicine_lookup: {
    nodeName: 'medicine_lookup', title: '药品查询工具',
    description: '原生注册 search_household_cabinet；权限凭证由服务端闭包注入，模型不可指定家庭。返回 found/no_match/error 和具体原因。',
    capabilities: ['药名/别名精确匹配', '症状向量查询', '权限和字段过滤'],
    expectedInput: ['mode: name | symptom | inventory', 'names', 'symptoms'],
    expectedOutput: ['status', 'reasonCode', 'reason', 'items', 'answer', 'retrievalRounds'],
    promptExpectation: '调用后端检索，再在工具内部调用辅助模型评估和重写；最多两轮检索。',
  },
  retrieval_evaluation: {
    nodeName: 'retrieval_evaluation', title: '检索切题评估与重写',
    description: '药品查询工具内部执行评估；切题返回回答及引用；不切题则重写参数并直接重查一次，不回到主模型，无评估中间件。',
    capabilities: ['切题评估', '最多两次辅助调用', '真实引用与按需重写'],
    expectedInput: ['originalQuestion', 'resolvedQuestion', 'query', 'lookupResults', 'retrievalRound', 'canRewrite', 'context'],
    expectedOutput: ['relevant', 'reason', 'answer', 'reference_ids', 'question', 'query'],
    promptKey: 'consult.medicine_rewrite.system', promptExpectation: '独立辅助模型调用，单独追踪，不计入主模型两次预算。',
  },
};

const PROMPT_DEFINITIONS: PromptDefinition[] = [
  {
    key: 'consult.general.system', title: 'general 分支主提示词', nodeName: 'general_reply', version: 'v2',
    sourceFile: 'agent/prompts/general.system.v2.md', mode: 'system+user-template',
    variables: ['originalQuestion', 'resolvedQuestion', 'historyMessages'], inputContract: ['originalQuestion', 'resolvedQuestion', 'historyMessages'],
    outputContract: ['answer: 完整回答正文'], summary: '自然交流与功能引导；只生成正文，不输出 action、不做二次路由。',
  },
  {
    key: 'consult.medicine.system', title: 'medicine 主模型提示词', nodeName: 'medicine', version: 'v2',
    sourceFile: 'agent/prompts/medicine.system.v2.md', mode: 'system+user-template',
    variables: ['originalQuestion', 'resolvedQuestion', 'historyMessages', 'userProfile', 'sessionSummary'],
    inputContract: ['原话、消解后的问题、历史和相关背景；工具结果通过 ToolMessage 传入'],
    outputContract: ['原生工具调用或回答正文'], summary: '直接依据症状/药名查询并说明失败原因；无任务规划，主模型最多两次。',
  },
  {
    key: 'consult.medicine_rewrite.system', title: '切题评估与重写提示词', nodeName: 'retrieval_evaluation', version: 'v1',
    sourceFile: 'agent/prompts/medicine_rewrite.system.v1.md', mode: 'system+user-template',
    variables: ['originalQuestion', 'resolvedQuestion', 'query', 'lookupResults', 'retrievalRound', 'canRewrite', 'context'],
    inputContract: ['原问题、上下文、查询参数、本轮检索结果、工具内部轮数与是否可重写'], outputContract: ['relevant', 'reason', 'answer', 'reference_ids', 'question', 'query'],
    summary: '工具内部每轮评估是否回应原问题；切题返回正文与引用，否则重写参数直接检索；每次工具最多两次评估及一次重写。',
  },
];

function resolveWorkspaceRoot() {
  let current = process.cwd();

  for (let depth = 0; depth < 4; depth += 1) {
    if (existsSync(path.join(current, 'agent')) && existsSync(path.join(current, 'backend'))) {
      return current;
    }
    current = path.resolve(current, '..');
  }

  return path.resolve(process.cwd(), '..');
}

function readPromptContent(sourceFile: string) {
  const fullPath = path.join(resolveWorkspaceRoot(), sourceFile);
  return readFileSync(fullPath, 'utf-8').trim();
}

export function getConsultationNodeSpec(nodeName: string): ConsultationNodeSpec {
  return NODE_SPECS[nodeName] ?? {
    nodeName,
    title: nodeName,
    description: '未登记的节点，建议补充节点说明。',
    capabilities: [],
    expectedInput: [],
    expectedOutput: [],
    promptExpectation: '暂无节点说明。',
  };
}

export function getConsultationPromptCatalog(): ConsultationPromptCatalogItem[] {
  return PROMPT_DEFINITIONS.map((definition) => ({
    ...definition,
    content: readPromptContent(definition.sourceFile),
  }));
}

export function getConsultationPromptByNode(nodeName: string) {
  return getConsultationPromptCatalog().find((item) => item.nodeName === nodeName) ?? null;
}
