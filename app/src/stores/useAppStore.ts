import { create } from "zustand";
import { appApi } from "@/shared/api/app-api";
import type {
  AppHousehold,
  AppHouseholdMember,
  AppProfileInput,
  AppUser,
  AskConsultationStreamEvent,
  CabinetMedicineInput,
  RecognizedMedicineResult,
} from "@/shared/api/app-api";
import { appStore } from "@/shared/storage/app-store";
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
  chatError?: string;
  medicinesLoading: boolean;
  recognitionLoading: boolean;
  recognitionError?: string;
  historyLoading: boolean;
  historyError?: string;
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
  clearRecognizedMedicine: () => void;
  loadHistory: () => Promise<void>;
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
  medicinesLoading: false,
  recognitionLoading: false,
  historyLoading: false,
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
    });

    try {
      const detail = await appApi.getHistory(historyId);
      set({
        historySessions: get().historySessions.map((session) =>
          session.id === historyId ? detail : session,
        ),
      });
    } catch (error) {
      set({
        historyError: error instanceof Error ? error.message : "对话详情暂不可用",
      });
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
    } catch (error) {
      set({
        authChecked: true,
        appUser: undefined,
        households: [],
        currentHousehold: undefined,
        identityError: error instanceof Error ? error.message : "身份初始化失败",
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
    } catch (error) {
      set({ authError: error instanceof Error ? error.message : "登录失败" });
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
    } catch (error) {
      set({ authError: error instanceof Error ? error.message : "注册失败" });
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
    } catch (error) {
      set({ familyError: error instanceof Error ? error.message : "创建家庭失败" });
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
    } catch (error) {
      set({ familyError: error instanceof Error ? error.message : "加入家庭失败" });
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
      set({ familyError: error instanceof Error ? error.message : "个人信息保存失败" });
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
      set({ familyError: error instanceof Error ? error.message : "头像上传失败" });
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
    } catch (error) {
      set({
        medicines: [],
        selectedMedicineId: "",
        chatError: error instanceof Error ? error.message : "家庭药箱暂不可用",
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
        recognitionError: error instanceof Error ? error.message : "图片识别失败",
      });
      throw error;
    } finally {
      set({ recognitionLoading: false });
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
    } catch (error) {
      set({
        historySessions: [],
        selectedHistoryId: "",
        historyError: error instanceof Error ? error.message : "对话历史暂不可用",
      });
    } finally {
      set({ historyLoading: false });
    }
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

    try {
      let resolvedSessionId = get().activeSessionId;
      let resolvedMessageId = placeholderId;

      await appApi.askStream({
        sessionId: get().activeSessionId,
        question: input,
        allowRxRecommendation: get().allowRxRecommendation,
      }, (event: AskConsultationStreamEvent) => {
        if (event.type === "session") {
          resolvedSessionId = event.sessionId;
          resolvedMessageId = event.messageId;
          return;
        }

        if (event.type === "status") {
          set({
            activeSessionId: resolvedSessionId,
            chatMessages: updateStreamingAssistant(get().chatMessages, placeholderId, (message) => ({
              ...message,
              statusText: event.message,
            })),
          });
          return;
        }

        if (event.type === "answer_delta") {
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

        if (event.type === "complete") {
          resolvedSessionId = event.sessionId;
          resolvedMessageId = event.messageId;
          set({
            activeSessionId: event.sessionId,
            chatMessages: updateStreamingAssistant(get().chatMessages, placeholderId, (message) => ({
              ...message,
              id: event.messageId,
              text: event.answer,
              disclaimer: event.disclaimer,
              cards: toChatCardsFromRecommends(event.recommends),
              statusText: undefined,
              timestamp: formatCurrentTime(),
            })),
          });
          return;
        }

        if (event.type === "error") {
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
    } catch (error) {
      set({
        chatError: error instanceof Error ? error.message : "问诊服务暂不可用",
        chatMessages: updateStreamingAssistant(get().chatMessages, placeholderId, (message) => ({
          ...message,
          statusText: undefined,
        })),
      });
    } finally {
      set({ chatLoading: false });
    }
  },
  newChat: () =>
    set({
      activeTab: "chat",
      currentScreen: "chat",
      chatMessages: [],
      chatInput: "",
      activeSessionId: undefined,
      chatError: undefined,
    }),
}));
