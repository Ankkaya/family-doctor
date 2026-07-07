import api from './request';

export type OtcType = 'OTC' | 'RX';

export interface MedicineCatalogItem {
  id: string;
  name: string;
  aliases: string[];
  otc: OtcType;
  indication: string;
  contraindication: string | null;
  adverseReaction: string | null;
  dosage: string | null;
  barcode: string | null;
  approvalNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineForm {
  name: string;
  aliases: string[];
  otc: OtcType;
  indication: string;
  contraindication?: string | null;
  adverseReaction?: string | null;
  dosage?: string | null;
  barcode?: string | null;
  approvalNumber?: string | null;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminHousehold {
  id: string;
  name: string;
  ownerUserId: string;
  ownerNickname: string | null;
  ownerPhone: string | null;
  memberCount: number;
  medicineCount: number;
  sessionCount: number;
  lastConsultationAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAppUser {
  id: string;
  username: string | null;
  phone: string | null;
  email: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | 'unknown' | string | null;
  allergies: string | null;
  chronicDiseases: string | null;
  medicationHistory: string | null;
  status: 'active' | 'disabled' | string;
  defaultHouseholdId: string | null;
  defaultHouseholdName: string | null;
  defaultHouseholdCode: string | null;
  householdCount: number;
  ownedHouseholdCount: number;
  medicineCount: number;
  sessionCount: number;
  lastConsultationAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppUserHousehold {
  id: string;
  name: string;
  code: string;
  ownerUserId: string;
  role: 'owner' | 'member' | string;
  displayName: string | null;
  joinedAt: string;
  memberCount: number;
  medicineCount: number;
  sessionCount: number;
  createdAt: string;
}

export interface HouseholdMember {
  id: string;
  role: 'owner' | 'member' | string;
  displayName: string | null;
  joinedAt: string;
  user: {
    id: string;
    phone: string | null;
    email: string | null;
    nickname: string | null;
    avatarUrl: string | null;
  };
}

export interface HouseholdMedicineItem {
  inventoryId: string;
  householdId: string;
  householdName: string;
  ownerUserId: string;
  userNickname: string | null;
  userPhone: string | null;
  medicineId: string;
  name: string;
  aliases: string[];
  otc: OtcType;
  indication: string;
  contraindication: string | null;
  adverseReaction: string | null;
  dosage: string | null;
  barcode: string | null;
  approvalNumber: string | null;
  quantity: number;
  expireAt: string | null;
  source: string | null;
  notes: string | null;
  inventoryCreatedAt: string;
  inventoryUpdatedAt: string;
}

export interface ConsultationSession {
  id: string;
  userId: string | null;
  householdId: string | null;
  devUserId: string | null;
  householdName?: string | null;
  userNickname?: string | null;
  userPhone?: string | null;
  title: string | null;
  summary?: ConsultationSessionSummary | null;
  summaryUpdatedAt?: string | null;
  status?: ConsultationSessionStatus;
  createdAt: string;
  messageCount: number;
}

export type ConsultationSessionStatus = 'active' | 'resolved' | 'stale' | 'closed' | string;

export interface ConsultationSessionSummary {
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
  suggestedStatus?: ConsultationSessionStatus;
}

export interface ConsultationHistoryMessage {
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt?: string;
}

export interface ConsultationMessage {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  recommends: unknown;
  createdAt: string;
}

export interface AgentTrace {
  id: string;
  sessionId: string | null;
  nodeName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  llmModel: string | null;
  tokenIn: number | null;
  tokenOut: number | null;
  latencyMs: number;
  error: string | null;
  createdAt: string;
  spec?: ConsultationNodeSpec;
  prompt?: TracePromptRuntime | null;
}

export interface ConsultationNodeSpec {
  nodeName: string;
  title: string;
  description: string;
  capabilities: string[];
  expectedInput: string[];
  expectedOutput: string[];
  promptKey?: string;
  promptExpectation?: string;
}

export interface TracePromptRuntime {
  key: string;
  version: string;
  sourceFile: string;
  expectation: string | null;
  systemPrompt: string | null;
  userPrompt: string | null;
}

export interface ConsultationTurn {
  turnIndex: number;
  startedAt: string;
  completedAt: string | null;
  userMessage: ConsultationMessage | null;
  assistantMessage: ConsultationMessage | null;
  traces: AgentTrace[];
}

export interface ConsultationPromptCatalogItem {
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
  content: string;
}

export interface ConsultationDetail extends ConsultationSession {
  messages: ConsultationMessage[];
  traces: AgentTrace[];
  turns: ConsultationTurn[];
  promptCatalog: ConsultationPromptCatalogItem[];
}

export interface ConsultationDebugRunParams {
  question: string;
  householdId?: string | null;
  userId?: string | null;
  allowRxRecommendation?: boolean;
  historyMessages?: ConsultationHistoryMessage[];
  sessionSummary?: Partial<ConsultationSessionSummary> | null;
  conversationStatus?: ConsultationSessionStatus;
}

export interface ConsultationDebugRunResult {
  debugRunId: string;
  question: string;
  householdId: string | null;
  userId: string | null;
  medicineCount: number;
  userProfile: Record<string, unknown> | null;
  answer: string;
  recommends: unknown[];
  disclaimer: string;
  sessionSummary: ConsultationSessionSummary | null;
  traces: AgentTrace[];
  nodeSpecs: ConsultationNodeSpec[];
  promptCatalog: ConsultationPromptCatalogItem[];
  createdAt: string;
}

export const getAdminMedicines = (params?: { keyword?: string; page?: number; pageSize?: number }) => {
  return api.get<PageResult<MedicineCatalogItem>>('/admin/medicine', { params });
};

export const createAdminMedicine = (data: MedicineForm) => {
  return api.post<MedicineCatalogItem>('/admin/medicine', data);
};

export const updateAdminMedicine = (id: string, data: MedicineForm) => {
  return api.patch<MedicineCatalogItem>(`/admin/medicine/${id}`, data);
};

export const deleteAdminMedicine = (id: string) => {
  return api.delete<MedicineCatalogItem>(`/admin/medicine/${id}`);
};

export const getAdminHouseholds = (params?: { keyword?: string; page?: number; pageSize?: number }) => {
  return api.get<PageResult<AdminHousehold>>('/admin/households', { params });
};

export const getAdminHousehold = (id: string) => {
  return api.get<AdminHousehold>(`/admin/households/${id}`);
};

export const deleteAdminHousehold = (id: string) => {
  return api.delete<{ success: boolean }>(`/admin/households/${id}`);
};

export const getAdminHouseholdMembers = (id: string) => {
  return api.get<HouseholdMember[]>(`/admin/households/${id}/members`);
};

export const getAdminAppUsers = (params?: {
  keyword?: string;
  status?: 'active' | 'disabled';
  page?: number;
  pageSize?: number;
}) => {
  return api.get<PageResult<AdminAppUser>>('/admin/app-users', { params });
};

export const getAdminAppUser = (id: string) => {
  return api.get<AdminAppUser>(`/admin/app-users/${id}`);
};

export const getAdminAppUserHouseholds = (id: string) => {
  return api.get<AppUserHousehold[]>(`/admin/app-users/${id}/households`);
};

export const updateAdminAppUserStatus = (id: string, status: 'active' | 'disabled') => {
  return api.patch<AdminAppUser>(`/admin/app-users/${id}/status`, { status });
};

export const resetAdminAppUserPassword = (id: string, password: string) => {
  return api.patch<{ success: boolean }>(`/admin/app-users/${id}/password`, { password });
};

export const deleteAdminAppUser = (id: string) => {
  return api.delete<{ success: boolean }>(`/admin/app-users/${id}`);
};

export const getAdminHouseholdMedicines = (params?: {
  householdId?: string;
  userId?: string;
  keyword?: string;
  expireStatus?: 'expired' | 'expiring' | 'valid' | 'unknown';
  page?: number;
  pageSize?: number;
}) => {
  return api.get<PageResult<HouseholdMedicineItem>>('/admin/household-medicines', { params });
};

export const deleteAdminHouseholdMedicine = (inventoryId: string) => {
  return api.delete<{ success: boolean }>(`/admin/household-medicines/${inventoryId}`);
};

export const getAdminConsultations = (params?: {
  keyword?: string;
  householdId?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}) => {
  return api.get<PageResult<ConsultationSession>>('/admin/consultations', { params });
};

export const getAdminConsultation = (id: string) => {
  return api.get<ConsultationDetail>(`/admin/consultations/${id}`);
};

export const getAdminConsultationPromptCatalog = () => {
  return api.get<ConsultationPromptCatalogItem[]>('/admin/consultations-debug/prompts');
};

export const runAdminConsultationDebug = (data: ConsultationDebugRunParams) => {
  return api.post<ConsultationDebugRunResult>('/admin/consultations-debug/run', data);
};

export const deleteAdminConsultation = (id: string) => {
  return api.delete<{ success: boolean }>(`/admin/consultations/${id}`);
};
