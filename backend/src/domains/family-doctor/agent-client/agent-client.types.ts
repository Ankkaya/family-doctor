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
};

export type AgentUserProfile = {
  age?: number | null;
  gender?: string | null;
  allergies?: string | null;
  chronicDiseases?: string | null;
  medicationHistory?: string | null;
};

export type AgentRecommend = {
  medicineId: string;
  name: string;
  otc: 'OTC' | 'RX';
  indication: string;
  reason: string;
  warnings: string[];
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

export type AgentConsultInput = {
  sessionId: string;
  question: string;
  medicines: AgentMedicineBrief[];
  userProfile?: AgentUserProfile | null;
  allowRxRecommendation?: boolean;
};

export type AgentConsultOutput = {
  answer: string;
  recommends: AgentRecommend[];
  disclaimer: string;
  traces: AgentTraceStep[];
};

export type AgentConsultStreamEvent =
  | {
      type: 'status';
      stage?: string;
      message: string;
    }
  | {
      type: 'answer_delta';
      delta: string;
    }
  | ({
      type: 'complete';
    } & AgentConsultOutput);

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
