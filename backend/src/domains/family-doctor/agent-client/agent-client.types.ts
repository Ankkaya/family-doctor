import type { AGUIEvent, RunAgentInput } from '@ag-ui/core';

export type AgentMedicineBrief = {
  id: string;
  name: string;
  otc: 'OTC' | 'RX';
  indication: string;
  contraindication?: string | null;
  adverseReaction?: string | null;
  dosage?: string | null;
  searchScore?: number;
  searchSource?: string;
  reference?: { source: 'household_cabinet'; inventoryId: string; label: string; matchType: 'exact' | 'semantic' | 'inventory' };
  quantity?: number;
  expireAt?: string | null;
};

export type AgentUserProfile = {
  age?: number | null;
  gender?: string | null;
  allergies?: string | null;
  chronicDiseases?: string | null;
  medicationHistory?: string | null;
};

export type AgentHistoryMessage = {
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
};

export type AgentSessionSummary = {
  chiefComplaint?: string | null;
  symptoms: string[];
  duration?: string | null;
  riskFlags: string[];
  mentionedMedicines: string[];
  rejectedMedicines: string[];
  recommendedMedicines: string[];
  temporaryUserFacts: string[];
  unresolvedQuestions: string[];
  lastTopic?: string | null;
  suggestedStatus?: 'active' | 'resolved' | 'stale' | 'closed';
};

export type AgentRecommend = {
  medicineId: string;
  name: string;
  otc: 'OTC' | 'RX';
  indication: string;
  reason: string;
  warnings: string[];
  reference?: AgentMedicineBrief['reference'];
};

export type AgentTraceStep = {
  nodeName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  llmModel?: string | null;
  tokenIn?: number | null;
  tokenOut?: number | null;
  latencyMs: number;
  error?: string | null;
};

export type AgentConsultOutput = {
  answer: string;
  recommends: AgentRecommend[];
  disclaimer: string;
  sessionSummary?: AgentSessionSummary | null;
  traces: AgentTraceStep[];
};

export type AgentAgUiRunInput = RunAgentInput;

export type AgentAgUiEvent = AGUIEvent;

export type AgentRecognizeMedicineImageInput = {
  images: Array<{
    filename: string;
    mimeType: string;
    dataBase64: string;
  }>;
};

export type AgentRecognizeMedicineImageOutput = {
  name?: string | null;
  aliases?: string[] | null;
  otc?: 'OTC' | 'RX' | null;
  indication?: string | null;
  contraindication?: string | null;
  adverseReaction?: string | null;
  dosage?: string | null;
  barcode?: string | null;
  approvalNumber?: string | null;
  manufacturer?: string | null;
  expireAt?: string | null;
  confidence?: number | null;
  rawText?: string | null;
  warnings?: string[] | null;
};
