import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { onBackButtonPress } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/features/app-shell/AppHeader";
import { BottomNav } from "@/features/app-shell/BottomNav";
import { StatusBar } from "@/features/app-shell/StatusBar";
import { AuthScreen } from "@/features/auth/AuthScreens";
import { ChatScreen } from "@/features/chat/ChatScreen";
import { DashboardHome } from "@/features/dashboard/DashboardHome";
import { AppSettingsScreen } from "@/features/family/AppSettingsScreen";
import { FamilySetupScreen } from "@/features/family/FamilySetupScreen";
import { ProfileCenter } from "@/features/family/ProfileCenter";
import { ProfileSettingsScreen } from "@/features/family/ProfileSettingsScreen";
import { HistoryDateBadge, HistoryDetail, HistoryList, HistoryTitleText } from "@/features/history/HistoryViews";
import { EntryMethods, ImageUpload, ManualEntry, RecognitionConfirm, ScanEntry } from "@/features/intake/EntryMethods";
import { MedicineDetail, MedicineList } from "@/features/medicine/MedicineViews";
import { showInfoToast } from "@/shared/toast/toast-store";
import { isTauri } from "@/shared/lib/platform";
import { useAppStore, type ScreenKey, type TabKey } from "@/stores/useAppStore";

const screenTitleMap: Record<ScreenKey, string> = {
  "dashboard-home": "首页",
  "entry-methods": "药品录入",
  "manual-entry": "药品录入",
  "image-upload": "图片识别",
  "recognition-confirm": "确认药品信息",
  "scan-entry": "扫描条形码",
  "medicine-list": "药品查询",
  "medicine-detail": "药品详情",
  "chat-history": "寻药",
  "history-list": "对话历史",
  "history-detail": "历史详情",
  chat: "新对话",
  profile: "个人中心",
  "profile-settings": "个人信息",
  "app-settings": "系统设置",
};
const PROFILE_PROMPT_DISMISSED_KEY = "profile_prompt_dismissed";

export function HomePage() {
  const activeTab = useAppStore((state) => state.activeTab);
  const currentScreen = useAppStore((state) => state.currentScreen);
  const selectedMedicineId = useAppStore((state) => state.selectedMedicineId);
  const selectedHistoryId = useAppStore((state) => state.selectedHistoryId);
  const searchKeyword = useAppStore((state) => state.searchKeyword);
  const chatInput = useAppStore((state) => state.chatInput);
  const chatMessages = useAppStore((state) => state.chatMessages);
  const medicines = useAppStore((state) => state.medicines);
  const recognizedMedicine = useAppStore((state) => state.recognizedMedicine);
  const historySessions = useAppStore((state) => state.historySessions);
  const appUser = useAppStore((state) => state.appUser);
  const households = useAppStore((state) => state.households);
  const currentHousehold = useAppStore((state) => state.currentHousehold);
  const householdMembers = useAppStore((state) => state.householdMembers);
  const allowRxRecommendation = useAppStore((state) => state.allowRxRecommendation);
  const authChecked = useAppStore((state) => state.authChecked);
  const identityLoading = useAppStore((state) => state.identityLoading);
  const authLoading = useAppStore((state) => state.authLoading);
  const familyLoading = useAppStore((state) => state.familyLoading);
  const chatLoading = useAppStore((state) => state.chatLoading);
  const medicinesLoading = useAppStore((state) => state.medicinesLoading);
  const recognitionLoading = useAppStore((state) => state.recognitionLoading);
  const historyLoading = useAppStore((state) => state.historyLoading);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const navigate = useAppStore((state) => state.navigate);
  const openMedicine = useAppStore((state) => state.openMedicine);
  const openHistory = useAppStore((state) => state.openHistory);
  const setSearchKeyword = useAppStore((state) => state.setSearchKeyword);
  const setChatInput = useAppStore((state) => state.setChatInput);
  const loadMedicines = useAppStore((state) => state.loadMedicines);
  const loadHistory = useAppStore((state) => state.loadHistory);
  const loadMembers = useAppStore((state) => state.loadMembers);
  const recognizeMedicineImages = useAppStore((state) => state.recognizeMedicineImages);
  const clearRecognizedMedicine = useAppStore((state) => state.clearRecognizedMedicine);
  const initializeIdentity = useAppStore((state) => state.initializeIdentity);
  const login = useAppStore((state) => state.login);
  const register = useAppStore((state) => state.register);
  const logout = useAppStore((state) => state.logout);
  const createHousehold = useAppStore((state) => state.createHousehold);
  const joinHousehold = useAppStore((state) => state.joinHousehold);
  const switchHousehold = useAppStore((state) => state.switchHousehold);
  const updateMember = useAppStore((state) => state.updateMember);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const uploadAvatar = useAppStore((state) => state.uploadAvatar);
  const setAllowRxRecommendation = useAppStore((state) => state.setAllowRxRecommendation);
  const saveRecognizedMedicine = useAppStore((state) => state.saveRecognizedMedicine);
  const updateMedicine = useAppStore((state) => state.updateMedicine);
  const deleteMedicine = useAppStore((state) => state.deleteMedicine);
  const sendChat = useAppStore((state) => state.sendChat);
  const newChat = useAppStore((state) => state.newChat);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [skipProfilePromptNextTime, setSkipProfilePromptNextTime] = useState(false);
  const exitPromptDeadlineRef = useRef(0);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    void initializeIdentity();
  }, [initializeIdentity]);

  useEffect(() => {
    if (!currentHousehold) return;

    void loadMedicines();
    void loadHistory();
    void loadMembers();
  }, [currentHousehold, loadHistory, loadMembers, loadMedicines]);

  const selectedMedicine = medicines.find((medicine) => medicine.id === selectedMedicineId) ?? medicines[0] ?? null;
  const selectedHistory = historySessions.find((session) => session.id === selectedHistoryId) ?? null;
  const filteredMedicines = medicines.filter((medicine) =>
    `${medicine.name}${medicine.indication}${medicine.otc}`.toLowerCase().includes(searchKeyword.toLowerCase()),
  );
  const missingProfileFields = getMissingProfileFields(appUser);
  const isTabRoot = currentScreen === tabRootScreen(activeTab);
  const showBottomNav = isTabRoot;
  const requestExitOrPrompt = useCallback(() => {
    const now = Date.now();
    if (now < exitPromptDeadlineRef.current) {
      void exitApplication();
      return;
    }

    exitPromptDeadlineRef.current = now + 1800;
    showInfoToast("再次左划退出应用", 1600);
  }, []);
  const handleBack = useCallback(() => {
    if (isTabRoot) {
      requestExitOrPrompt();
      return;
    }

    exitPromptDeadlineRef.current = 0;
    navigate(previousScreen(currentScreen, activeTab));
  }, [activeTab, currentScreen, isTabRoot, navigate, requestExitOrPrompt]);
  const handleSendChat = () => {
    if (!appUser) return;

    if (missingProfileFields.length > 0 && !isProfilePromptDismissed(appUser.id)) {
      setSkipProfilePromptNextTime(false);
      setShowProfilePrompt(true);
      return;
    }

    void sendChat();
  };
  const continueChatWithoutProfile = () => {
    if (skipProfilePromptNextTime && appUser) {
      dismissProfilePrompt(appUser.id);
    }
    setShowProfilePrompt(false);
    void sendChat();
  };
  const openProfileSettings = () => {
    setShowProfilePrompt(false);
    setActiveTab("profile");
    navigate("profile-settings");
  };
  const closeProfilePrompt = () => {
    if (skipProfilePromptNextTime && appUser) {
      dismissProfilePrompt(appUser.id);
    }
    setShowProfilePrompt(false);
  };

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void onBackButtonPress(() => {
      handleBack();
    }).then((listener) => {
      if (disposed) {
        void listener.unregister();
        return;
      }

      unlisten = () => void listener.unregister();
    }).catch(() => undefined);

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [handleBack]);

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;

    const deltaX = start.x - touch.clientX;
    const deltaY = start.y - touch.clientY;
    const elapsed = Date.now() - start.time;
    if (deltaX > 72 && Math.abs(deltaY) < 48 && elapsed < 650) {
      handleBack();
    }
  };

  if (!authChecked || identityLoading) {
    return <LoadingShell />;
  }

  if (!appUser) {
    return (
      <AuthScreen
        loading={authLoading}
        onLogin={login}
        onRegister={register}
      />
    );
  }

  if (!currentHousehold) {
    return (
      <FamilySetupScreen
        households={households}
        loading={familyLoading}
        onCreate={createHousehold}
        onJoin={joinHousehold}
        onSwitch={switchHousehold}
        onLogout={logout}
      />
    );
  }

  return (
    <main
      className="h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,250,252,0.98))] text-foreground dark:bg-[linear-gradient(180deg,_rgba(2,6,23,0.98),_rgba(15,23,42,0.98))]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,250,252,0.98))] dark:bg-[linear-gradient(180deg,_rgba(2,6,23,0.98),_rgba(15,23,42,0.98))]">
        <StatusBar />
        <AppHeader
          activeTab={activeTab}
          currentScreen={currentScreen}
          title={getHeaderTitle(currentScreen, selectedHistory)}
          onBack={handleBack}
          onNewChat={newChat}
        />
        <div
          className={[
            "scrollbar-none flex-1 overflow-y-auto pt-4",
            currentScreen === "chat" ? "px-0 pb-0" : "px-4 pb-6",
          ].join(" ")}
        >
          {currentScreen === "dashboard-home" && (
            <DashboardHome medicines={medicines} onNavigate={navigate} onTabChange={setActiveTab} />
          )}
          {currentScreen === "entry-methods" && <EntryMethods onNavigate={navigate} />}
          {currentScreen === "manual-entry" && (
            <ManualEntry
              onUploadImage={() => {
                clearRecognizedMedicine();
                navigate("image-upload");
              }}
              onSave={(medicine) => {
                void saveRecognizedMedicine(medicine)
                  .then(() => navigate("medicine-list"))
                  .catch(() => {
                    // Interface errors are surfaced by the global toast.
                  });
              }}
            />
          )}
          {currentScreen === "image-upload" && (
            <ImageUpload
              loading={recognitionLoading}
              onConfirm={async (files) => {
                return recognizeMedicineImages(files);
              }}
              onViewResult={() => navigate("recognition-confirm")}
            />
          )}
          {currentScreen === "recognition-confirm" && (
            <RecognitionConfirm
              medicine={recognizedMedicine ?? null}
              onRetry={() => navigate("image-upload")}
              onSave={(medicine) => {
                void saveRecognizedMedicine(medicine)
                  .then(() => navigate("medicine-list"))
                  .catch(() => {
                    // Interface errors are surfaced by the global toast.
                  });
              }}
            />
          )}
          {currentScreen === "scan-entry" && <ScanEntry onConfirm={() => navigate("recognition-confirm")} />}
          {currentScreen === "medicine-list" && (
            <MedicineList
              medicines={filteredMedicines}
              keyword={searchKeyword}
              loading={medicinesLoading}
              onSearch={setSearchKeyword}
              onOpenMedicine={openMedicine}
            />
          )}
          {currentScreen === "medicine-detail" && (
            <MedicineDetail medicine={selectedMedicine} onUpdate={updateMedicine} onDelete={deleteMedicine} />
          )}
          {currentScreen === "history-list" && (
            <HistoryList sessions={historySessions} loading={historyLoading} onOpenHistory={openHistory} />
          )}
          {currentScreen === "chat-history" && (
            <HistoryList sessions={historySessions} loading={historyLoading} onOpenHistory={openHistory} />
          )}
          {currentScreen === "history-detail" && (
            <HistoryDetail session={selectedHistory} medicines={medicines} onOpenMedicine={openMedicine} />
          )}
          {currentScreen === "chat" && (
            <ChatScreen
              input={chatInput}
              messages={chatMessages}
              medicines={medicines}
              user={appUser}
              isSending={chatLoading}
              onInputChange={setChatInput}
              onSend={handleSendChat}
              onOpenMedicine={openMedicine}
            />
          )}
          {currentScreen === "profile" && (
            <ProfileCenter
              user={appUser}
              currentHousehold={currentHousehold}
              households={households}
              members={householdMembers}
              onSwitchHousehold={switchHousehold}
              onUpdateMember={updateMember}
              onEditProfile={() => navigate("profile-settings")}
              onOpenSettings={() => navigate("app-settings")}
            />
          )}
          {currentScreen === "profile-settings" && (
            <ProfileSettingsScreen
              user={appUser}
              loading={familyLoading}
              onUploadAvatar={uploadAvatar}
              onSave={updateProfile}
              onCancel={() => navigate("profile")}
            />
          )}
          {currentScreen === "app-settings" && (
            <AppSettingsScreen
              allowRxRecommendation={allowRxRecommendation}
              onToggleAllowRx={setAllowRxRecommendation}
              onLogout={logout}
            />
          )}
        </div>
        {showBottomNav ? <BottomNav activeTab={activeTab} onChange={setActiveTab} /> : null}
      </div>
      {showProfilePrompt ? (
        <ProfileCompletenessPrompt
          missingFields={missingProfileFields}
          skipNextTime={skipProfilePromptNextTime}
          onSkipNextTimeChange={setSkipProfilePromptNextTime}
          onComplete={openProfileSettings}
          onContinue={continueChatWithoutProfile}
          onClose={closeProfilePrompt}
        />
      ) : null}
    </main>
  );
}

async function exitApplication() {
  if (isTauri()) {
    await invoke("exit_app").catch(() => {
      showInfoToast("退出应用失败，请使用系统返回键或任务管理器关闭", 1800);
    });
    return;
  }

  window.close();
  window.setTimeout(() => {
    if (!window.closed) {
      showInfoToast("浏览器预览模式无法直接关闭应用", 1800);
    }
  }, 120);
}

function getMissingProfileFields(user?: {
  age?: number | null;
  gender?: string | null;
  allergies?: string | null;
  chronicDiseases?: string | null;
  medicationHistory?: string | null;
}) {
  const missing: string[] = [];

  if (user?.age == null) missing.push("年龄");
  if (!user?.gender || user.gender === "unknown") missing.push("性别");
  if (!hasProfileText(user?.allergies)) missing.push("过敏史");
  if (!hasProfileText(user?.chronicDiseases)) missing.push("基础病");
  if (!hasProfileText(user?.medicationHistory)) missing.push("长期用药");

  return missing;
}

function hasProfileText(value?: string | null) {
  return Boolean(value?.trim());
}

function profilePromptDismissedKey(userId: string) {
  return `${PROFILE_PROMPT_DISMISSED_KEY}:${userId}`;
}

function isProfilePromptDismissed(userId: string) {
  return window.localStorage.getItem(profilePromptDismissedKey(userId)) === "true";
}

function dismissProfilePrompt(userId: string) {
  window.localStorage.setItem(profilePromptDismissedKey(userId), "true");
}

function tabRootScreen(tab: TabKey): ScreenKey {
  if (tab === "chat") return "chat-history";
  if (tab === "profile") return "profile";
  return "dashboard-home";
}

function previousScreen(screen: ScreenKey, tab: TabKey): ScreenKey {
  if (screen === "manual-entry") return tabRootScreen(tab);
  if (screen === "image-upload" || screen === "scan-entry") return "manual-entry";

  if (screen === "recognition-confirm") return "image-upload";
  if (screen === "medicine-detail") return "medicine-list";
  if (screen === "history-detail") return tab === "chat" ? "chat-history" : "history-list";
  if (screen === "chat") return "chat-history";
  if (screen === "profile-settings" || screen === "app-settings") return "profile";

  return tabRootScreen(tab);
}

function getHeaderTitle(screen: ScreenKey, selectedHistory: ReturnType<typeof useAppStore.getState>["historySessions"][number] | null): ReactNode {
  if (screen === "history-detail" && selectedHistory) {
    return (
      <span className="flex min-w-0 max-w-full items-center justify-center gap-2">
        <span className="min-w-0 max-w-[11rem] truncate">
          <HistoryTitleText session={selectedHistory} />
        </span>
        <HistoryDateBadge session={selectedHistory} />
      </span>
    );
  }

  return screenTitleMap[screen];
}

function ProfileCompletenessPrompt({
  missingFields,
  skipNextTime,
  onSkipNextTimeChange,
  onComplete,
  onContinue,
  onClose,
}: {
  missingFields: string[];
  skipNextTime: boolean;
  onSkipNextTimeChange: (checked: boolean) => void;
  onComplete: () => void;
  onContinue: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <section className="w-full max-w-sm rounded-[1.5rem] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.26)] dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-slate-950">补充基础信息</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              完善年龄、性别、过敏史、基础病和长期用药，有助于提高寻药推荐准确性。
            </p>
          </div>
          <Button
            type="button"
            aria-label="关闭"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full text-slate-400 active:bg-slate-100"
            onClick={onClose}
          >
            ×
          </Button>
        </div>
        <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">待补充</p>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-800">{missingFields.join("、")}</p>
        </div>
        <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4 shrink-0 rounded border-slate-300 accent-primary"
            checked={skipNextTime}
            onChange={(event) => onSkipNextTimeChange(event.target.checked)}
          />
          <span>下次不再提醒</span>
        </label>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-2xl border-slate-200 bg-white text-sm font-semibold text-slate-700"
            onClick={onContinue}
          >
            继续提问
          </Button>
          <Button
            type="button"
            className="h-11 rounded-2xl text-sm font-semibold"
            onClick={onComplete}
          >
            去补充
          </Button>
        </div>
      </section>
    </div>
  );
}

function LoadingShell() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-white text-foreground">
      <div className="mx-auto flex h-full w-full max-w-md items-center justify-center overflow-hidden bg-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-emerald-100" />
          <p className="mt-4 text-sm font-medium text-slate-500">加载中</p>
        </div>
      </div>
    </main>
  );
}
