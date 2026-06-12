import { invoke } from "@tauri-apps/api/core";
import { httpClient } from "@/shared/api/http-client";
import { isTauri } from "@/shared/lib/platform";
import { appStore } from "@/shared/storage/app-store";
import type { ChatCard, ChatMessage, HistorySession, Medicine } from "@/shared/mock/app-data";

type BackendOtcType = "OTC" | "RX";

const TOKEN_KEY = "app_access_token";
const REFRESH_TOKEN_KEY = "app_refresh_token";
const HOUSEHOLD_KEY = "current_household_id";

type BackendMedicine = {
  id: string;
  inventoryId?: string;
  medicineId?: string;
  name: string;
  aliases: string[];
  otc: BackendOtcType;
  indication: string;
  contraindication: string | null;
  adverseReaction: string | null;
  dosage: string | null;
  barcode: string | null;
  approvalNumber: string | null;
  quantity?: number;
  expireAt?: string | null;
  source?: string | null;
};

type BackendRecognizedMedicine = {
  name?: string | null;
  aliases?: string[] | null;
  otc?: BackendOtcType | null;
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

export type CabinetMedicineInput = {
  name: string;
  aliases?: string[];
  otc: BackendOtcType;
  indication: string;
  contraindication?: string | null;
  adverseReaction?: string | null;
  dosage?: string | null;
  barcode?: string | null;
  approvalNumber?: string | null;
  quantity?: number;
  expireAt?: string;
  source?: string;
  notes?: string;
};

type BackendConsultationRecommend = {
  medicineId: string;
  name?: string;
  otc?: BackendOtcType;
  indication?: string;
  reason?: string;
  warnings?: string[];
};

type BackendConsultationSession = {
  id: string;
  userId?: string | null;
  householdId?: string | null;
  devUserId?: string | null;
  title: string | null;
  createdAt: string;
  messageCount?: number;
};

type BackendConsultationMessage = {
  id: string;
  sessionId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  recommends: unknown;
  createdAt: string;
};

type BackendConsultationDetail = BackendConsultationSession & {
  messages: BackendConsultationMessage[];
};

type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type AppHousehold = {
  id: string;
  name: string;
  code?: string;
  ownerUserId?: string;
  role?: string;
  memberCount?: number;
  medicineCount?: number;
  sessionCount?: number;
  createdAt?: string;
};

export type AppUser = {
  id: string;
  username?: string | null;
  nickname: string | null;
  avatarUrl?: string | null;
  age?: number | null;
  gender?: "male" | "female" | "other" | "unknown" | string | null;
  allergies?: string | null;
  chronicDiseases?: string | null;
  medicationHistory?: string | null;
  defaultHouseholdId?: string | null;
};

export type AppProfileInput = {
  avatarUrl?: string | null;
  age?: number | null;
  gender?: "male" | "female" | "other" | "unknown" | null;
  allergies?: string | null;
  chronicDiseases?: string | null;
  medicationHistory?: string | null;
};

export type AppHouseholdMember = {
  id: string;
  role: "owner" | "member" | string;
  displayName: string | null;
  joinedAt: string;
  user: {
    id: string;
    username?: string | null;
    nickname: string | null;
    avatarUrl?: string | null;
  };
};

type AppAuthResponse = {
  token: string;
  refreshToken: string;
  user: AppUser;
  defaultHousehold?: AppHousehold;
};

export type AppSessionState = {
  token: string;
  refreshToken: string;
  user: AppUser;
  householdId?: string;
  household?: AppHousehold;
  households: AppHousehold[];
};

export type AskConsultationInput = {
  sessionId?: string;
  question: string;
  allowRxRecommendation?: boolean;
};

export type ConsultationRecommend = {
  medicineId: string;
  name: string;
  otc: BackendOtcType;
  indication: string;
  reason: string;
  warnings: string[];
};

export type AskConsultationResponse = {
  sessionId: string;
  messageId: string;
  answer: string;
  recommends: ConsultationRecommend[];
  disclaimer: string;
};

export type AskConsultationStreamEvent =
  | {
      type: "session";
      sessionId: string;
      messageId: string;
    }
  | {
      type: "status";
      stage: "prepare" | "lookup" | "agent" | "fallback" | "finalize";
      message: string;
    }
  | {
      type: "answer_delta";
      delta: string;
    }
  | {
      type: "complete";
      sessionId: string;
      messageId: string;
      answer: string;
      recommends: ConsultationRecommend[];
      disclaimer: string;
    }
  | {
      type: "error";
      message: string;
    };

export type RecognizedMedicineResult = Medicine & {
  confidence?: number;
  rawText?: string;
  warnings?: string[];
};

let sessionState: AppSessionState | null = null;
let sessionPromise: Promise<AppSessionState | null> | null = null;

async function fetchHouseholdsWithToken(token: string) {
  return httpClient.getJson<AppHousehold[]>("/app/households", {
    skipAppAuth: true,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function persistSession(auth: AppAuthResponse, preferredHouseholdId?: string | null) {
  const households = await fetchHouseholdsWithToken(auth.token).catch(() => []);
  const preferredId = preferredHouseholdId || auth.defaultHousehold?.id || auth.user.defaultHouseholdId;
  const household = households.find((item) => item.id === preferredId) ?? auth.defaultHousehold;

  sessionState = {
    token: auth.token,
    refreshToken: auth.refreshToken,
    user: auth.user,
    householdId: household?.id,
    household,
    households,
  };
  const writes = [
    appStore.set(TOKEN_KEY, auth.token),
    appStore.set(REFRESH_TOKEN_KEY, auth.refreshToken),
  ];
  if (household?.id) {
    writes.push(appStore.set(HOUSEHOLD_KEY, household.id));
  } else {
    writes.push(appStore.remove(HOUSEHOLD_KEY));
  }
  await Promise.all(writes);
  return sessionState;
}

async function loadStoredSession() {
  const [token, refreshToken, householdId] = await Promise.all([
    appStore.get<string>(TOKEN_KEY),
    appStore.get<string>(REFRESH_TOKEN_KEY),
    appStore.get<string>(HOUSEHOLD_KEY),
  ]);

  if (!token || !refreshToken) {
    return null;
  }

  const refreshed = await httpClient.postJson<AppAuthResponse>(
    "/app/auth/refresh",
    { refreshToken },
    { skipAppAuth: true },
  );
  return persistSession(refreshed, householdId);
}

async function ensureSession() {
  if (sessionState) {
    return sessionState;
  }

  if (!sessionPromise) {
    sessionPromise = (async () => {
      const stored = await loadStoredSession().catch(() => null);
      if (stored) {
        return stored;
      }
      return null;
    })().finally(() => {
      sessionPromise = null;
    });
  }

  return sessionPromise;
}

httpClient.setAuthHeadersProvider(async () => {
  const session = await ensureSession();
  if (!session?.token) {
    throw new Error("请先登录");
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.token}`,
  };
  if (session.householdId) {
    headers["X-Household-Id"] = session.householdId;
  }
  return {
    ...headers,
  };
});

function formatDate(value?: string | null) {
  if (!value) {
    return "未记录";
  }

  return value.split("T")[0];
}

function formatTime(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatSessionDate(value?: string | null) {
  if (!value) {
    return "较早";
  }

  const date = new Date(value);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / 86_400_000);

  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} 天前`;

  return formatDate(value);
}

function toAppMedicine(item: BackendMedicine): Medicine {
  const medicineId = item.inventoryId || item.medicineId || item.id;

  return {
    id: medicineId,
    inventoryId: item.inventoryId,
    medicineId,
    name: item.name,
    expiry: formatDate(item.expireAt),
    indication: item.indication,
    contraindications: item.contraindication || "暂无禁忌人群记录",
    adverseReactions: item.adverseReaction || "暂无不良反应记录",
    otc: item.otc === "RX" ? "Rx" : "OTC",
    barcode: item.barcode || "-",
    source: item.source || "未记录",
    quantity: item.quantity,
  };
}

function toRecognizedMedicine(item: BackendRecognizedMedicine): RecognizedMedicineResult {
  return {
    id: `recognized-${Date.now()}`,
    name: item.name?.trim() || "未识别药品名称",
    expiry: formatDate(item.expireAt),
    indication: item.indication?.trim() || "暂无适应症记录",
    contraindications: item.contraindication?.trim() || "暂无禁忌人群记录",
    adverseReactions: item.adverseReaction?.trim() || "暂无不良反应记录",
    otc: item.otc === "RX" ? "Rx" : "OTC",
    barcode: item.barcode?.trim() || "-",
    approvalNumber: item.approvalNumber?.trim() || undefined,
    dosage: item.dosage?.trim() || undefined,
    manufacturer: item.manufacturer?.trim() || undefined,
    source: "图片识别",
    quantity: 1,
    confidence: item.confidence ?? undefined,
    rawText: item.rawText?.trim() || undefined,
    warnings: item.warnings?.filter(Boolean) ?? undefined,
  };
}

function isBackendRecommendList(value: unknown): value is BackendConsultationRecommend[] {
  return Array.isArray(value);
}

function toChatCards(value: unknown): ChatCard[] | undefined {
  if (!isBackendRecommendList(value)) {
    return undefined;
  }

  const cards = value
    .filter((item) => item && typeof item.medicineId === "string")
    .map((item) => ({
      medicineId: item.medicineId,
      name: item.name,
      otc: item.otc === "RX" ? "Rx" as const : "OTC" as const,
      indication: item.indication,
      summary: [
        item.reason,
        ...(item.warnings ?? []).map((warning) => `风险提示：${warning}`),
      ].filter(Boolean).join("；"),
      warnings: item.warnings ?? [],
    }));

  return cards.length > 0 ? cards : undefined;
}

function getMedicineNotice(value: unknown) {
  return Array.isArray(value) && value.length === 0
    ? "未找到与当前描述明确匹配的家庭药箱药品，请结合症状变化及时补充描述或就医咨询。"
    : undefined;
}

function toChatMessage(item: BackendConsultationMessage): ChatMessage {
  return {
    id: item.id,
    role: item.role === "USER" ? "user" : "assistant",
    text: item.content,
    timestamp: formatTime(item.createdAt),
    cards: toChatCards(item.recommends),
    medicineNotice: item.role === "ASSISTANT" ? getMedicineNotice(item.recommends) : undefined,
  };
}

function toHistorySession(item: BackendConsultationSession, messages: ChatMessage[] = []): HistorySession {
  return {
    id: item.id,
    title: item.title || "未命名对话",
    createdAt: item.createdAt,
    date: formatSessionDate(item.createdAt),
    time: formatTime(item.createdAt),
    summary: `${item.messageCount ?? messages.length} 条消息`,
    messages,
  };
}

export const appApi = {
  async restoreSession() {
    return ensureSession();
  },

  async login(input: { username: string; password: string }) {
    const auth = await httpClient.postJson<AppAuthResponse>("/app/auth/login", input, {
      skipAppAuth: true,
    });
    return persistSession(auth);
  },

  async register(input: { username: string; password: string; registrationCode: string }) {
    const auth = await httpClient.postJson<AppAuthResponse>("/app/auth/register", input, {
      skipAppAuth: true,
    });
    return persistSession(auth);
  },

  async updateProfile(input: AppProfileInput) {
    const user = await httpClient.patchJson<AppUser>("/app/auth/profile", input);
    if (sessionState) {
      sessionState = {
        ...sessionState,
        user,
      };
    }
    return user;
  },

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const user = await httpClient.postForm<AppUser>("/app/auth/avatar", formData);
    if (sessionState) {
      sessionState = {
        ...sessionState,
        user,
      };
    }
    return user;
  },

  async logout() {
    sessionState = null;
    await Promise.all([
      appStore.remove(TOKEN_KEY),
      appStore.remove(REFRESH_TOKEN_KEY),
      appStore.remove(HOUSEHOLD_KEY),
    ]);
  },

  async listHouseholds() {
    const households = await httpClient.getJson<AppHousehold[]>("/app/households");
    if (sessionState) {
      sessionState = {
        ...sessionState,
        households,
      };
    }
    return households;
  },

  async switchHousehold(household: AppHousehold) {
    const session = await ensureSession();
    if (!session) {
      throw new Error("请先登录");
    }
    sessionState = {
      ...session,
      householdId: household.id,
      household,
    };
    await appStore.set(HOUSEHOLD_KEY, household.id);
    return sessionState;
  },

  async createHousehold(input: { name: string }) {
    const household = await httpClient.postJson<AppHousehold>("/app/households", input);
    await this.switchHousehold(household);
    return household;
  },

  async joinHousehold(input: { code: string }) {
    const household = await httpClient.postJson<AppHousehold>("/app/households/join", input);
    const normalizedHousehold = {
      ...household,
      id: household.id || (household as AppHousehold & { householdId?: string }).householdId || "",
    };
    await this.switchHousehold(normalizedHousehold);
    return normalizedHousehold;
  },

  async listMembers(householdId: string) {
    return httpClient.getJson<AppHouseholdMember[]>(`/app/households/${householdId}/members`);
  },

  async updateMember(
    householdId: string,
    memberId: string,
    input: { role?: "owner" | "member"; displayName?: string },
  ) {
    return httpClient.patchJson<AppHouseholdMember>(
      `/app/households/${householdId}/members/${memberId}`,
      input,
    );
  },

  async hello() {
    if (!isTauri()) {
      return "Hello from web development mode";
    }

    return invoke<string>("hello_world");
  },

  async health() {
    const response = await httpClient.getJson<{ status: string }>("/health");
    return response.status;
  },

  async ask(input: AskConsultationInput) {
    return httpClient.postJson<AskConsultationResponse>("/consultation/ask", input);
  },

  async askStream(
    input: AskConsultationInput,
    onEvent: (event: AskConsultationStreamEvent) => void | Promise<void>,
  ) {
    return httpClient.postJsonStream<AskConsultationStreamEvent>("/consultation/ask/stream", input, onEvent);
  },

  async recognizeMedicineImages(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    const response = await httpClient.postForm<BackendRecognizedMedicine>("/medicine/recognize-images", formData);
    return toRecognizedMedicine(response);
  },

  async addCabinetMedicine(input: CabinetMedicineInput) {
    const item = await httpClient.postJson<BackendMedicine>("/medicine/cabinet", input);
    return toAppMedicine(item);
  },

  async updateCabinetMedicine(inventoryId: string, input: Partial<CabinetMedicineInput>) {
    const item = await httpClient.patchJson<BackendMedicine>(`/medicine/cabinet/${inventoryId}`, input);
    return toAppMedicine(item);
  },

  async deleteCabinetMedicine(inventoryId: string) {
    return httpClient.deleteJson<{ success: boolean }>(`/medicine/cabinet/${inventoryId}`);
  },

  async listMedicines(params?: { keyword?: string; page?: number; pageSize?: number }) {
    const search = new URLSearchParams();
    if (params?.keyword) search.set("keyword", params.keyword);
    if (params?.page) search.set("page", String(params.page));
    if (params?.pageSize) search.set("pageSize", String(params.pageSize));

    const suffix = search.toString() ? `?${search.toString()}` : "";
    const response = await httpClient.getJson<PageResult<BackendMedicine>>(`/medicine/cabinet${suffix}`);
    return response.items.map(toAppMedicine);
  },

  async listHistory(params?: { keyword?: string; page?: number; pageSize?: number }) {
    const search = new URLSearchParams();
    if (params?.keyword) search.set("keyword", params.keyword);
    if (params?.page) search.set("page", String(params.page));
    if (params?.pageSize) search.set("pageSize", String(params.pageSize));

    const suffix = search.toString() ? `?${search.toString()}` : "";
    const response = await httpClient.getJson<PageResult<BackendConsultationSession>>(
      `/consultation/sessions${suffix}`,
    );
    return response.items.map((item) => toHistorySession(item));
  },

  async getHistory(id: string) {
    const response = await httpClient.getJson<BackendConsultationDetail>(`/consultation/sessions/${id}`);
    const messages = response.messages.map(toChatMessage);
    return toHistorySession(response, messages);
  },
};
