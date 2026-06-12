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
  preprocess: {
    nodeName: 'preprocess',
    title: '输入预处理',
    description: '对用户原始问题做规则归一化，统一常见症状和时间表达，减少后续节点理解偏差。',
    capabilities: ['规则归一化', '症状别名映射', '时间表达清洗'],
    expectedInput: ['question: 用户原始问题文本'],
    expectedOutput: ['normalizedQuestion: 归一化后的问题文本'],
    promptExpectation: '无 LLM Prompt，纯规则处理。',
  },
  parse: {
    nodeName: 'parse',
    title: '症状结构化',
    description: '调用结构化输出模型，从问题中提取症状、严重程度、持续时间、人群线索和急症信号。',
    capabilities: ['LLM structured output', '症状抽取', '急症初筛'],
    expectedInput: ['question: 归一化问题文本'],
    expectedOutput: ['symptoms', 'severity', 'duration', 'populationHints', 'emergency'],
    promptKey: 'consult.parse.system',
    promptExpectation: 'System Prompt + 用户问题文本。',
  },
  emergency: {
    nodeName: 'emergency',
    title: '急症复核',
    description: '用规则关键词再次检查急症风险，覆盖模型漏判场景。',
    capabilities: ['急症规则', '关键词命中', '安全兜底'],
    expectedInput: ['question: 归一化问题', 'parsedEmergency: parse 节点的急症判断'],
    expectedOutput: ['emergency: 是否急症', 'reasons: 命中原因列表'],
    promptExpectation: '无 LLM Prompt，纯规则处理。',
  },
  special_population: {
    nodeName: 'special_population',
    title: '特殊人群识别',
    description: '结合用户年龄、性别、慢病、过敏、用药史和问题文本，识别儿童、老人、孕哺乳等风险标签。',
    capabilities: ['用户画像规则', '特殊人群标签', '风险补充'],
    expectedInput: ['userProfile: 用户资料', 'populationHints: parse 输出的人群线索', 'question: 问题文本'],
    expectedOutput: ['flags: 特殊人群风险标签列表'],
    promptExpectation: '无 LLM Prompt，纯规则处理。',
  },
  match: {
    nodeName: 'match',
    title: '候选药品集合',
    description: '接收家庭药箱药品全集，形成当前轮次待审查候选集合，不在这里做语义硬过滤。',
    capabilities: ['候选药品透传', '候选追踪', '调试留痕'],
    expectedInput: ['medicines: 家庭药箱药品全集', 'question: 用户问题'],
    expectedOutput: ['candidateMedicines: 当前候选药品列表', 'candidateCount'],
    promptExpectation: '无 LLM Prompt，纯数据整理。',
  },
  review: {
    nodeName: 'review',
    title: '药品适配审查',
    description: '由模型逐个审查候选药品是否适合当前问题，并输出推荐或拒绝原因。',
    capabilities: ['LLM 审查', '逐药判断', '拒绝原因输出', '处方药策略约束'],
    expectedInput: ['question', 'parsedSymptoms', 'userProfile', 'riskFlags', 'candidateMedicines', 'allowRxRecommendation'],
    expectedOutput: ['recommended: 推荐药品', 'rejected: 拒绝药品', 'decisions: 每个候选药的判断结果'],
    promptKey: 'consult.review.system',
    promptExpectation: 'System Prompt + 结构化 JSON 用户 Prompt。',
  },
  safety: {
    nodeName: 'safety',
    title: '安全审核',
    description: '对 review 通过的药品做统一风险审查，补充风险等级和警示语。',
    capabilities: ['风险审核', '警示语生成', '安全等级评估'],
    expectedInput: ['recommends: review 推荐结果', 'flags: 特殊人群标签', 'emergency: 急症状态'],
    expectedOutput: ['riskLevel', 'warnings'],
    promptExpectation: '无 LLM Prompt，规则审核。',
  },
  render: {
    nodeName: 'render',
    title: '最终回复生成',
    description: '根据推荐药品和安全结果组织最终面向用户的回复；急症或无推荐时走固定文案。',
    capabilities: ['LLM 文案生成', '固定文案分支', '最终答复整合'],
    expectedInput: ['parsedSymptoms', 'risked: 推荐药品', 'safetyWarnings', 'emergency'],
    expectedOutput: ['answer', 'recommendCount', 'disclaimer'],
    promptKey: 'consult.render.system',
    promptExpectation: '有推荐时调用 System Prompt + 结构化摘要；无推荐或急症时跳过模型。',
  },
};

const PROMPT_DEFINITIONS: PromptDefinition[] = [
  {
    key: 'consult.parse.system',
    title: '症状结构化 Prompt',
    nodeName: 'parse',
    version: 'v1',
    sourceFile: 'agent/prompts/parse.system.v1.md',
    mode: 'system+user-template',
    variables: ['question'],
    inputContract: ['question: 用户问题文本'],
    outputContract: ['symptoms', 'severity', 'duration', 'populationHints', 'emergency'],
    summary: '把自然语言问题转成结构化症状字段。',
  },
  {
    key: 'consult.review.system',
    title: '药品适配审查 Prompt',
    nodeName: 'review',
    version: 'v1',
    sourceFile: 'agent/prompts/review.system.v1.md',
    mode: 'system+user-template',
    variables: ['question', 'parsedSymptoms', 'userProfile', 'riskFlags', 'allowRxRecommendation', 'candidateMedicines'],
    inputContract: ['question', 'parsedSymptoms', 'userProfile', 'riskFlags', 'allowRxRecommendation', 'candidateMedicines'],
    outputContract: ['items[].medicineId', 'items[].suitable', 'items[].reason', 'items[].rejectReason', 'items[].warnings'],
    summary: '逐个药品输出适配/拒绝判断，形成 review 决策。',
  },
  {
    key: 'consult.render.system',
    title: '最终回复 Prompt',
    nodeName: 'render',
    version: 'v1',
    sourceFile: 'agent/prompts/render.system.v1.md',
    mode: 'system+user-template',
    variables: ['symptoms', 'severity', 'recommendCount', 'safetyWarnings'],
    inputContract: ['symptoms', 'severity', 'recommendCount', 'safetyWarnings'],
    outputContract: ['answer: 中文简短答复'],
    summary: '在已有推荐和安全结果基础上生成最终用户答复。',
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
