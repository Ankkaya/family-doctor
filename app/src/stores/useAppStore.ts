import { create } from "zustand";
import { EventType } from "@ag-ui/core";
import { appApi } from "@/shared/api/app-api";
import { ApiError } from "@/shared/api/api-error";
import type {
  AppHousehold,
  AppHouseholdMember,
  AppCronJob,
  AppProfileInput,
  AppUser,
  AgUiEvent,
  CabinetMedicineInput,
  RecognizedMedicineResult,
  SpeechTranscriptionResult,
} from "@/shared/api/app-api";
import { enqueueBase64Audio, resetAudioQueue } from "@/shared/lib/audio-player";
import { appStore } from "@/shared/storage/app-store";
import { showErrorToast } from "@/shared/toast/toast-store";
import {
  type ChatMessage,
  type HistorySession,
  type Medicine,
  medicines as demoMedicines,
} from "@/shared/mock/app-data";

export type TabKey = "dashboard" | "chat" | "profile";

export type ScreenKey =
  | "dashboard-home"
  | "entry-methods"
  | "manual-entry"
  | "image-upload"
  | "recognition-confirm"
  | "scan-entry"
  | "medicine-list"
  | "medicine-detail"
  | "chat-history"
  | "history-list"
  | "history-detail"
  | "chat"
  | "profile"
  | "reminders"
  | "profile-settings"
  | "app-settings";

type AuthInput = {
  username: string;
  password: string;
  registrationCode?: string;
};

type AppState = {
  activeTab: TabKey;
  currentScreen: ScreenKey;
  selectedMedicineId: string;
  selectedHistoryId: string;
  searchKeyword: string;
  chatInput: string;
  chatMessages: ChatMessage[];
  medicines: Medicine[];
  recognizedMedicine?: RecognizedMedicineResult | null;
  historySessions: HistorySession[];
  reminderJobs: AppCronJob[];
  activeSessionId?: string;
  appUser?: AppUser;
  households: AppHousehold[];
  currentHousehold?: AppHousehold;
  householdMembers: AppHouseholdMember[];
  allowRxRecommendation: boolean;
  authChecked: boolean;
  identityLoading: boolean;
  identityError?: string;
  authLoading: boolean;
  authError?: string;
  familyLoading: boolean;
  familyError?: string;
  chatLoading: boolean;
  voiceTranscribing: boolean;
  chatError?: string;
  medicinesLoading: boolean;
  recognitionLoading: boolean;
  recognitionError?: string;
  historyLoading: boolean;
  historyError?: string;
  remindersLoading: boolean;
  remindersError?: string;
  setActiveTab: (tab: TabKey) => void;
  navigate: (screen: ScreenKey) => void;
  backToDashboard: () => void;
  openMedicine: (medicineId: string) => void;
  openHistory: (historyId: string) => Promise<void>;
  setSearchKeyword: (keyword: string) => void;
  setChatInput: (value: string) => void;
  initializeIdentity: () => Promise<void>;
  login: (input: AuthInput) => Promise<void>;
  register: (input: AuthInput) => Promise<void>;
  logout: () => Promise<void>;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (code: string) => Promise<void>;
  switchHousehold: (householdId: string) => Promise<void>;
  loadMembers: () => Promise<void>;
  updateMember: (memberId: string, input: { role?: "owner" | "member"; displayName?: string }) => Promise<void>;
  updateProfile: (input: AppProfileInput) => Promise<void>;
  uploadAvatar: (file: File) => Promise<AppUser>;
  setAllowRxRecommendation: (value: boolean) => Promise<void>;
  loadMedicines: () => Promise<void>;
  recognizeMedicineImages: (files: File[]) => Promise<RecognizedMedicineResult>;
  transcribeChatAudio: (file: File) => Promise<SpeechTranscriptionResult>;
  clearRecognizedMedicine: () => void;
  loadHistory: () => Promise<void>;
  loadReminders: () => Promise<void>;
  updateReminderStatus: (jobId: string, status: "enabled" | "disabled") => Promise<void>;
  deleteReminder: (jobId: string) => Promise<void>;
  saveRecognizedMedicine: (medicine?: Medicine) => Promise<void>;
  updateMedicine: (medicineId: string, medicine: Medicine) => Promise<void>;
  deleteMedicine: (medicineId: string) => Promise<void>;
  sendChat: () => Promise<void>;
  newChat: () => void;
};

const emptyRuntimeState = {
  selectedMedicineId: "",
  selectedHistoryId: "",
  searchKeyword: "",
  chatInput: "",
  chatMessages: [] as ChatMessage[],
  medicines: [] as Medicine[],
  recognizedMedicine: null as RecognizedMedicineResult | null,
  historySessions: [] as HistorySession[],
  reminderJobs: [] as AppCronJob[],
  activeSessionId: undefined,
};

const ALLOW_RX_RECOMMENDATION_KEY = "allow_rx_recommendation";

function tabToScreen(tab: TabKey): ScreenKey {
  if (tab === "chat") return "chat-history";
  if (tab === "profile") return "profile";
  return "dashboard-home";
}

function formatApiDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function formatCurrentTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function toChatCardsFromRecommends(
  recommends: Array<{
    medicineId: string;
    name: string;
    otc: "OTC" | "RX";
    indication: string;
    reason: string;
    warnings: string[];
  }>,
) {
  const cards = recommends.map((recommend) => ({
    medicineId: recommend.medicineId,
    name: recommend.name,
    otc: recommend.otc === "RX" ? "Rx" as const : "OTC" as const,
    indication: recommend.indication,
    summary: [
      recommend.reason,
      ...recommend.warnings.map((warning) => `风险提示：${warning}`),
    ].join("；"),
    warnings: recommend.warnings,
  }));

  return cards.length > 0 ? cards : undefined;
}

function getMedicineNoticeFromRecommends(
  recommends: Array<{ medicineId: string }>,
) {
  return recommends.length === 0 ? "未找到与当前描述明确匹配的家庭药箱药品，请结合症状变化及时补充描述或就医咨询。" : undefined;
}

function createRunId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `run-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function agUiStepText(stepName: string) {
  const labels: Record<string, string> = {
    prepare: "正在准备问诊",
    lookup: "正在整理家庭药箱信息",
    agent: "正在生成用药建议",
    fallback: "正在整理问诊结果",
    finalize: "正在保存问诊记录",
  };

  return labels[stepName] ?? `正在执行 ${stepName}`;
}

function readAgUiDelta(event: AgUiEvent, path: string) {
  if (event.type !== EventType.STATE_DELTA) {
    return undefined;
  }

  return event.delta.find((item) => item.path === path)?.value;
}

function isRecommendList(value: unknown): value is Array<{
  medicineId: string;
  name: string;
  otc: "OTC" | "RX";
  indication: string;
  reason: string;
  warnings: string[];
}> {
  return Array.isArray(value) && value.every((item) => (
    item
    && typeof item === "object"
    && typeof (item as { medicineId?: unknown }).medicineId === "string"
  ));
}

function isAudioChunkCustomEvent(event: AgUiEvent): event is AgUiEvent & {
  type: EventType.CUSTOM;
  value: {
    type: "audio_chunk";
    audioBase64: string;
    codec: "mp3" | "wav";
  };
} {
  if (event.type !== EventType.CUSTOM || event.name !== "consultation.audio_chunk") {
    return false;
  }

  const value = event.value as { type?: unknown; audioBase64?: unknown; codec?: unknown };
  return value?.type === "audio_chunk"
    && typeof value.audioBase64 === "string"
    && (value.codec === "mp3" || value.codec === "wav");
}

function getAgUiStatusMessage(event: AgUiEvent) {
  if (event.type !== EventType.CUSTOM || event.name !== "consultation.status") {
    return undefined;
  }

  const value = event.value as { message?: unknown };
  return typeof value.message === "string" ? value.message : undefined;
}

function updateStreamingAssistant(
  messages: ChatMessage[],
  placeholderId: string,
  updater: (message: ChatMessage) => ChatMessage,
) {
  return messages.map((message) => (
    message.id === placeholderId ? updater(message) : message
  ));
}

function toCabinetMedicineInput(medicine: Medicine): CabinetMedicineInput {
  return {
    name: medicine.name,
    aliases: [],
    otc: medicine.otc === "Rx" ? "RX" : "OTC",
    indication: medicine.indication,
    contraindication: medicine.contraindications,
    adverseReaction: medicine.adverseReactions,
    dosage: medicine.dosage,
    barcode: medicine.barcode === "-" ? undefined : medicine.barcode,
    approvalNumber: medicine.approvalNumber,
    quantity: medicine.quantity ?? 1,
    expireAt: formatApiDate(medicine.expiry),
    source: medicine.source,
  };
}

function findInventoryId(medicines: Medicine[], medicineId: string) {
  const medicine = medicines.find((item) => item.id === medicineId || item.inventoryId === medicineId);
  return medicine?.inventoryId || medicine?.id || medicineId;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: "dashboard",
  currentScreen: "dashboard-home",
  ...emptyRuntimeState,
  appUser: undefined,
  households: [],
  currentHousehold: undefined,
  householdMembers: [],
  allowRxRecommendation: false,
  authChecked: false,
  identityLoading: false,
  authLoading: false,
  familyLoading: false,
  chatLoading: false,
  voiceTranscribing: false,
  medicinesLoading: false,
  recognitionLoading: false,
  historyLoading: false,
  remindersLoading: false,
  setActiveTab: (tab) =>
    set({
      activeTab: tab,
      currentScreen: tabToScreen(tab),
    }),
  navigate: (screen) => set({ currentScreen: screen }),
  backToDashboard: () => set({ activeTab: "dashboard", currentScreen: "dashboard-home" }),
  openMedicine: (medicineId) =>
    set({
      selectedMedicineId: medicineId,
      currentScreen: "medicine-detail",
      activeTab: "dashboard",
    }),
  openHistory: async (historyId) => {
    set({
      selectedHistoryId: historyId,
      currentScreen: "history-detail",
      activeTab: get().activeTab === "chat" ? "chat" : "dashboard",
      historyError: undefined,
      remindersError: undefined,
    });

    try {
      const detail = await appApi.getHistory(historyId);
      set({
        historySessions: get().historySessions.map((session) =>
          session.id === historyId ? detail : session,
        ),
      });
    } catch {
      set({ historyError: undefined });
    }
  },
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  setChatInput: (value) => set({ chatInput: value }),
  initializeIdentity: async () => {
    if (get().identityLoading) return;

    set({ identityLoading: true, identityError: undefined });
    try {
      const [session, allowRxRecommendation] = await Promise.all([
        appApi.restoreSession(),
        appStore.get<boolean>(ALLOW_RX_RECOMMENDATION_KEY),
      ]);
      set({
        authChecked: true,
        appUser: session?.user,
        households: session?.households ?? [],
        currentHousehold: session?.household,
        allowRxRecommendation: allowRxRecommendation === true,
      });
    } catch {
      set({
        authChecked: true,
        appUser: undefined,
        households: [],
        currentHousehold: undefined,
        identityError: undefined,
      });
    } finally {
      set({ identityLoading: false });
    }
  },
  login: async (input) => {
    if (get().authLoading) return;

    set({ authLoading: true, authError: undefined });
    try {
      const session = await appApi.login({
        username: input.username,
        password: input.password,
      });
      set({
        appUser: session.user,
        households: session.households,
        currentHousehold: session.household,
        authChecked: true,
        ...emptyRuntimeState,
      });
    } catch {
      set({ authError: undefined });
    } finally {
      set({ authLoading: false });
    }
  },
  register: async (input) => {
    if (get().authLoading) return;

    set({ authLoading: true, authError: undefined });
    try {
      const session = await appApi.register({
        username: input.username,
        password: input.password,
        registrationCode: input.registrationCode ?? "",
      });
      set({
        appUser: session.user,
        households: session.households,
        currentHousehold: session.household,
        authChecked: true,
        ...emptyRuntimeState,
      });
    } catch {
      set({ authError: undefined });
    } finally {
      set({ authLoading: false });
    }
  },
  logout: async () => {
    await appApi.logout();
    set({
      activeTab: "dashboard",
      currentScreen: "dashboard-home",
      appUser: undefined,
      households: [],
      currentHousehold: undefined,
      householdMembers: [],
      recognitionError: undefined,
      authChecked: true,
      identityError: undefined,
      authError: undefined,
      familyError: undefined,
      chatError: undefined,
      historyError: undefined,
      ...emptyRuntimeState,
    });
  },
  createHousehold: async (name) => {
    if (get().familyLoading) return;

    set({ familyLoading: true, familyError: undefined });
    try {
      const household = await appApi.createHousehold({ name });
      const households = await appApi.listHouseholds();
      set({
        households,
        currentHousehold: households.find((item) => item.id === household.id) ?? household,
        recognitionError: undefined,
        activeTab: "dashboard",
        currentScreen: "dashboard-home",
        ...emptyRuntimeState,
      });
    } catch {
      set({ familyError: undefined });
    } finally {
      set({ familyLoading: false });
    }
  },
  joinHousehold: async (code) => {
    if (get().familyLoading) return;

    set({ familyLoading: true, familyError: undefined });
    try {
      const household = await appApi.joinHousehold({ code });
      const households = await appApi.listHouseholds();
      set({
        households,
        currentHousehold: households.find((item) => item.id === household.id) ?? household,
        recognitionError: undefined,
        activeTab: "dashboard",
        currentScreen: "dashboard-home",
        ...emptyRuntimeState,
      });
    } catch {
      set({ familyError: undefined });
    } finally {
      set({ familyLoading: false });
    }
  },
  switchHousehold: async (householdId) => {
    const household = get().households.find((item) => item.id === householdId);
    if (!household) return;

    await appApi.switchHousehold(household);
    set({
      currentHousehold: household,
      activeTab: "dashboard",
      currentScreen: "dashboard-home",
      householdMembers: [],
      recognitionError: undefined,
      ...emptyRuntimeState,
    });
    void get().loadMedicines();
    void get().loadHistory();
    void get().loadMembers();
    void get().loadReminders();
  },
  loadMembers: async () => {
    const householdId = get().currentHousehold?.id;
    if (!householdId) {
      set({ householdMembers: [] });
      return;
    }

    try {
      const members = await appApi.listMembers(householdId);
      set({ householdMembers: members });
    } catch {
      set({ householdMembers: [] });
    }
  },
  updateMember: async (memberId, input) => {
    const householdId = get().currentHousehold?.id;
    if (!householdId) return;

    await appApi.updateMember(householdId, memberId, input);
    await get().loadMembers();
    const households = await appApi.listHouseholds();
    set({
      households,
      currentHousehold: households.find((item) => item.id === householdId) ?? get().currentHousehold,
    });
  },
  updateProfile: async (input) => {
    if (get().familyLoading) return;

    set({ familyLoading: true, familyError: undefined });
    try {
      const appUser = await appApi.updateProfile(input);
      set({
        appUser,
        currentScreen: "profile",
        activeTab: "profile",
      });
    } catch (error) {
      set({ familyError: undefined });
      throw error;
    } finally {
      set({ familyLoading: false });
    }
  },
  uploadAvatar: async (file) => {
    if (get().familyLoading) {
      const appUser = get().appUser;
      if (!appUser) {
        throw new Error("请先登录");
      }
      return appUser;
    }

    set({ familyLoading: true, familyError: undefined });
    try {
      const appUser = await appApi.uploadAvatar(file);
      set({ appUser });
      return appUser;
    } catch (error) {
      set({ familyError: undefined });
      throw error;
    } finally {
      set({ familyLoading: false });
    }
  },
  setAllowRxRecommendation: async (value) => {
    await appStore.set(ALLOW_RX_RECOMMENDATION_KEY, value);
    set({ allowRxRecommendation: value });
  },
  loadMedicines: async () => {
    if (get().medicinesLoading || !get().currentHousehold) return;

    set({ medicinesLoading: true });
    try {
      const remoteMedicines = await appApi.listMedicines({ page: 1, pageSize: 100 });
      const selectedMedicineId = remoteMedicines.some((item) => item.id === get().selectedMedicineId)
        ? get().selectedMedicineId
        : remoteMedicines[0]?.id ?? "";

      set({
        medicines: remoteMedicines,
        selectedMedicineId,
      });
    } catch {
      set({
        medicines: [],
        selectedMedicineId: "",
        chatError: undefined,
      });
    } finally {
      set({ medicinesLoading: false });
    }
  },
  recognizeMedicineImages: async (files) => {
    if (get().recognitionLoading) {
      const recognizedMedicine = get().recognizedMedicine;
      if (!recognizedMedicine) {
        throw new Error("正在识别图片，请稍候");
      }
      return recognizedMedicine;
    }

    set({ recognitionLoading: true, recognitionError: undefined });
    try {
      const recognizedMedicine = await appApi.recognizeMedicineImages(files);
      set({
        recognizedMedicine,
      });
      return recognizedMedicine;
    } catch (error) {
      set({
        recognizedMedicine: null,
        recognitionError: undefined,
      });
      throw error;
    } finally {
      set({ recognitionLoading: false });
    }
  },
  transcribeChatAudio: async (file) => {
    if (get().voiceTranscribing) {
      throw new Error("正在识别上一段录音，请稍候");
    }

    set({ voiceTranscribing: true, chatError: undefined });
    try {
      const result = await appApi.transcribeAudio(file);
      set({ chatInput: result.text, activeTab: "chat", currentScreen: "chat" });
      return result;
    } finally {
      set({ voiceTranscribing: false });
    }
  },
  clearRecognizedMedicine: () => set({
    recognizedMedicine: null,
    recognitionError: undefined,
  }),
  loadHistory: async () => {
    if (get().historyLoading || !get().currentHousehold) return;

    set({ historyLoading: true, historyError: undefined });
    try {
      const remoteHistory = await appApi.listHistory({ page: 1, pageSize: 100 });
      set({
        historySessions: remoteHistory,
        selectedHistoryId: remoteHistory.some((item) => item.id === get().selectedHistoryId)
          ? get().selectedHistoryId
          : remoteHistory[0]?.id ?? "",
      });
    } catch {
      set({
        historySessions: [],
        selectedHistoryId: "",
        historyError: undefined,
      });
    } finally {
      set({ historyLoading: false });
    }
  },
  loadReminders: async () => {
    if (get().remindersLoading || !get().currentHousehold) return;

    set({ remindersLoading: true, remindersError: undefined });
    try {
      const reminderJobs = await appApi.listCronJobs({ page: 1, pageSize: 100 });
      set({ reminderJobs });
    } catch {
      set({
        reminderJobs: [],
        remindersError: undefined,
      });
    } finally {
      set({ remindersLoading: false });
    }
  },
  updateReminderStatus: async (jobId, status) => {
    const updated = await appApi.updateCronJobStatus(jobId, status);
    set({
      reminderJobs: get().reminderJobs.map((job) => (job.id === jobId ? updated : job)),
    });
    await get().loadReminders();
  },
  deleteReminder: async (jobId) => {
    await appApi.deleteCronJob(jobId);
    set({
      reminderJobs: get().reminderJobs.filter((job) => job.id !== jobId),
    });
    await get().loadReminders();
  },
  saveRecognizedMedicine: async (medicine) => {
    const recognizedMedicine = medicine ?? get().recognizedMedicine ?? {
      ...demoMedicines[1],
      source: "图片识别",
      quantity: 1,
    };

    await appApi.addCabinetMedicine({
      ...toCabinetMedicineInput(recognizedMedicine),
      source: recognizedMedicine.source === "图片识别" ? "image" : "manual",
      notes: "App 用户自行维护录入",
    });
    set({
      recognizedMedicine: null,
      recognitionError: undefined,
    });
    await get().loadMedicines();
  },
  updateMedicine: async (medicineId, medicine) => {
    const inventoryId = findInventoryId(get().medicines, medicineId);
    const updated = await appApi.updateCabinetMedicine(inventoryId, toCabinetMedicineInput(medicine));
    set({
      medicines: get().medicines.map((item) => (item.id === medicineId ? updated : item)),
      selectedMedicineId: updated.id,
    });
    await get().loadMedicines();
  },
  deleteMedicine: async (medicineId) => {
    const inventoryId = findInventoryId(get().medicines, medicineId);
    await appApi.deleteCabinetMedicine(inventoryId);
    const remaining = get().medicines.filter((item) => item.id !== medicineId && item.inventoryId !== medicineId);
    set({
      medicines: remaining,
      selectedMedicineId: remaining[0]?.id ?? "",
      currentScreen: "medicine-list",
    });
    await get().loadMedicines();
  },
  sendChat: async () => {
    if (get().chatLoading || !get().currentHousehold) return;

    const input = get().chatInput.trim();
    if (!input) return;

    const nextMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: input,
      timestamp: formatCurrentTime(),
    };
    const placeholderId = `assistant-stream-${Date.now()}`;
    const assistantPlaceholder: ChatMessage = {
      id: placeholderId,
      role: "assistant",
      text: "",
      statusText: "正在准备问诊",
      timestamp: "刚刚",
    };
    const nextMessages = [...get().chatMessages, nextMessage, assistantPlaceholder];

    set({
      chatMessages: nextMessages,
      chatInput: "",
      activeTab: "chat",
      currentScreen: "chat",
      chatLoading: true,
      chatError: undefined,
    });
    resetAudioQueue();

    try {
      let resolvedSessionId = get().activeSessionId;
      let resolvedMessageId = placeholderId;

      const runId = createRunId();

      await appApi.askAgUiStream({
        threadId: get().activeSessionId || `pending-${runId}`,
        runId,
        messages: [
          {
            id: nextMessage.id,
            role: "user",
            content: input,
          },
        ],
        tools: [],
        context: [],
        state: {
          sessionId: get().activeSessionId,
          allowRxRecommendation: get().allowRxRecommendation,
          audio: {
            enabled: true,
            codec: "mp3",
          },
        },
        forwardedProps: {
          sessionId: get().activeSessionId,
          question: input,
          allowRxRecommendation: get().allowRxRecommendation,
          audio: {
            enabled: true,
            codec: "mp3",
          },
        },
      }, (event: AgUiEvent) => {
        if (event.type === EventType.RUN_STARTED) {
          resolvedSessionId = event.threadId;
          set({ activeSessionId: event.threadId });
          return;
        }

        if (event.type === EventType.STEP_STARTED) {
          set({
            activeSessionId: resolvedSessionId,
            chatMessages: updateStreamingAssistant(get().chatMessages, placeholderId, (message) => ({
              ...message,
              statusText: agUiStepText(event.stepName),
            })),
          });
          return;
        }

        const statusMessage = getAgUiStatusMessage(event);
        if (statusMessage) {
          set({
            activeSessionId: resolvedSessionId,
            chatMessages: updateStreamingAssistant(get().chatMessages, placeholderId, (message) => ({
              ...message,
              statusText: statusMessage,
            })),
          });
          return;
        }

        if (event.type === EventType.TEXT_MESSAGE_START) {
          resolvedMessageId = event.messageId;
          return;
        }

        if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
          resolvedMessageId = event.messageId;
          set({
            activeSessionId: resolvedSessionId,
            chatMessages: updateStreamingAssistant(get().chatMessages, placeholderId, (message) => ({
              ...message,
              text: `${message.text}${event.delta}`,
              statusText: "正在生成回复",
            })),
          });
          return;
        }

        if (event.type === EventType.STATE_DELTA) {
          const sessionId = readAgUiDelta(event, "/sessionId");
          const messageId = readAgUiDelta(event, "/messageId");
          const answer = readAgUiDelta(event, "/answer");
          const disclaimer = readAgUiDelta(event, "/disclaimer");
          const recommends = readAgUiDelta(event, "/recommends");

          if (typeof sessionId === "string") {
            resolvedSessionId = sessionId;
          }
          if (typeof messageId === "string") {
            resolvedMessageId = messageId;
          }

          if (typeof answer === "string" || typeof disclaimer === "string" || isRecommendList(recommends)) {
            set({
              activeSessionId: resolvedSessionId,
              chatMessages: updateStreamingAssistant(get().chatMessages, placeholderId, (message) => ({
                ...message,
                id: typeof messageId === "string" ? messageId : message.id,
                text: typeof answer === "string" ? answer : message.text,
                disclaimer: typeof disclaimer === "string" ? disclaimer : message.disclaimer,
                cards: isRecommendList(recommends) ? toChatCardsFromRecommends(recommends) : message.cards,
                medicineNotice: isRecommendList(recommends)
                  ? getMedicineNoticeFromRecommends(recommends)
                  : message.medicineNotice,
                statusText: undefined,
                timestamp: formatCurrentTime(),
              })),
            });
          } else if (typeof sessionId === "string") {
            set({ activeSessionId: sessionId });
          }
          return;
        }

        if (event.type === EventType.RUN_FINISHED) {
          const result = event.result ?? {};
          const sessionId = result.sessionId;
          const messageId = result.messageId;
          const answer = result.answer;
          const disclaimer = result.disclaimer;
          const recommends = result.recommends;

          if (typeof sessionId === "string") {
            resolvedSessionId = sessionId;
          }
          if (typeof messageId === "string") {
            resolvedMessageId = messageId;
          }

          set({
            activeSessionId: resolvedSessionId,
            chatMessages: updateStreamingAssistant(get().chatMessages, placeholderId, (message) => ({
              ...message,
              id: typeof messageId === "string" ? messageId : resolvedMessageId,
              text: typeof answer === "string" ? answer : message.text,
              disclaimer: typeof disclaimer === "string" ? disclaimer : message.disclaimer,
              cards: isRecommendList(recommends) ? toChatCardsFromRecommends(recommends) : message.cards,
              medicineNotice: isRecommendList(recommends)
                ? getMedicineNoticeFromRecommends(recommends)
                : message.medicineNotice,
              statusText: undefined,
              timestamp: formatCurrentTime(),
            })),
          });
          return;
        }

        if (isAudioChunkCustomEvent(event)) {
          enqueueBase64Audio(event.value.audioBase64, event.value.codec);
          return;
        }

        if (event.type === EventType.RUN_ERROR) {
          throw new Error(event.message);
        }
      });

      set({
        activeSessionId: resolvedSessionId,
        chatMessages: updateStreamingAssistant(get().chatMessages, placeholderId, (message) => ({
          ...message,
          id: resolvedMessageId,
          statusText: undefined,
        })),
      });
      void get().loadHistory();
      void get().loadReminders();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showErrorToast(error instanceof Error ? error.message : "问诊服务暂不可用");
      }
      set({
        chatError: undefined,
        chatMessages: updateStreamingAssistant(get().chatMessages, placeholderId, (message) => ({
          ...message,
          statusText: undefined,
        })),
      });
    } finally {
      set({ chatLoading: false });
    }
  },
  newChat: () => {
    const sessionId = get().activeSessionId;
    if (sessionId) {
      void appApi.closeHistory(sessionId).catch(() => undefined);
    }

    set({
      activeTab: "chat",
      currentScreen: "chat",
      chatMessages: [],
      chatInput: "",
      activeSessionId: undefined,
      chatError: undefined,
    });
  },
}));
