import { useEffect, useState } from "react";
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
import { HistoryDetail, HistoryList } from "@/features/history/HistoryViews";
import { EntryMethods, ImageUpload, ManualEntry, RecognitionConfirm, ScanEntry } from "@/features/intake/EntryMethods";
import { MedicineDetail, MedicineList } from "@/features/medicine/MedicineViews";
import { useAppStore, type ScreenKey } from "@/stores/useAppStore";

const screenTitleMap: Record<ScreenKey, string> = {
  "dashboard-home": "控制台",
  "entry-methods": "药品录入",
  "manual-entry": "手动录入",
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

export function HomePage() {
  const activeTab = useAppStore((state) => state.activeTab);
  const currentScreen = useAppStore((state) => state.currentScreen);
  const selectedMedicineId = useAppStore((state) => state.selectedMedicineId);
  const selectedHistoryId = useAppStore((state) => state.selectedHistoryId);
  const searchKeyword = useAppStore((state) => state.searchKeyword);
  const chatInput = useAppStore((state) => state.chatInput);
  const chatMessages = useAppStore((state) => state.chatMessages);
  const medicines = useAppStore((state) => state.medicines);
  const historySessions = useAppStore((state) => state.historySessions);
  const appUser = useAppStore((state) => state.appUser);
  const households = useAppStore((state) => state.households);
  const currentHousehold = useAppStore((state) => state.currentHousehold);
  const householdMembers = useAppStore((state) => state.householdMembers);
  const allowRxRecommendation = useAppStore((state) => state.allowRxRecommendation);
  const authChecked = useAppStore((state) => state.authChecked);
  const identityLoading = useAppStore((state) => state.identityLoading);
  const authLoading = useAppStore((state) => state.authLoading);
  const authError = useAppStore((state) => state.authError);
  const familyLoading = useAppStore((state) => state.familyLoading);
  const familyError = useAppStore((state) => state.familyError);
  const chatLoading = useAppStore((state) => state.chatLoading);
  const chatError = useAppStore((state) => state.chatError);
  const medicinesLoading = useAppStore((state) => state.medicinesLoading);
  const historyLoading = useAppStore((state) => state.historyLoading);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const navigate = useAppStore((state) => state.navigate);
  const backToDashboard = useAppStore((state) => state.backToDashboard);
  const openMedicine = useAppStore((state) => state.openMedicine);
  const openHistory = useAppStore((state) => state.openHistory);
  const setSearchKeyword = useAppStore((state) => state.setSearchKeyword);
  const setChatInput = useAppStore((state) => state.setChatInput);
  const loadMedicines = useAppStore((state) => state.loadMedicines);
  const loadHistory = useAppStore((state) => state.loadHistory);
  const loadMembers = useAppStore((state) => state.loadMembers);
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
  const showBottomNav = currentScreen !== "chat";
  const handleBack = () => {
    if (activeTab === "chat") {
      navigate("chat-history");
      return;
    }

    backToDashboard();
  };
  const handleSendChat = () => {
    if (missingProfileFields.length > 0) {
      setShowProfilePrompt(true);
      return;
    }

    void sendChat();
  };
  const continueChatWithoutProfile = () => {
    setShowProfilePrompt(false);
    void sendChat();
  };
  const openProfileSettings = () => {
    setShowProfilePrompt(false);
    setActiveTab("profile");
    navigate("profile-settings");
  };

  if (!authChecked || identityLoading) {
    return <LoadingShell />;
  }

  if (!appUser) {
    return (
      <AuthScreen
        loading={authLoading}
        error={authError}
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
        error={familyError}
        onCreate={createHousehold}
        onJoin={joinHousehold}
        onSwitch={switchHousehold}
        onLogout={logout}
      />
    );
  }

  return (
    <main className="h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.16),_transparent_28%),linear-gradient(180deg,_#eef8f4_0%,_#f8fafc_34%,_#f8fafc_100%)] px-3 py-4 text-foreground">
      <div className="mx-auto flex h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[2.15rem] border border-white/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,250,252,0.98))] shadow-[0_28px_100px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/70">
        <StatusBar />
        <AppHeader
          activeTab={activeTab}
          currentScreen={currentScreen}
          title={screenTitleMap[currentScreen]}
          onBack={handleBack}
          onNewChat={newChat}
        />
        <div className="scrollbar-none flex-1 overflow-y-auto px-4 pb-6 pt-4">
          {currentScreen === "dashboard-home" && (
            <DashboardHome medicines={medicines} onNavigate={navigate} onTabChange={setActiveTab} />
          )}
          {currentScreen === "entry-methods" && <EntryMethods onNavigate={navigate} />}
          {currentScreen === "manual-entry" && (
            <ManualEntry
              onScanBarcode={() => navigate("scan-entry")}
              onSave={(medicine) => {
                void saveRecognizedMedicine(medicine).finally(() => navigate("medicine-list"));
              }}
            />
          )}
          {currentScreen === "image-upload" && <ImageUpload onConfirm={() => navigate("recognition-confirm")} />}
          {currentScreen === "recognition-confirm" && (
            <RecognitionConfirm
              onSave={(medicine) => {
                void saveRecognizedMedicine(medicine).finally(() => navigate("medicine-list"));
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
              error={chatError}
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
              error={familyError}
              onUploadAvatar={uploadAvatar}
              onSave={updateProfile}
              onCancel={() => navigate("profile")}
            />
          )}
          {currentScreen === "app-settings" && (
            <AppSettingsScreen
              allowRxRecommendation={allowRxRecommendation}
              onToggleAllowRx={setAllowRxRecommendation}
              onBack={() => navigate("profile")}
              onLogout={logout}
            />
          )}
        </div>
        {showBottomNav ? <BottomNav activeTab={activeTab} onChange={setActiveTab} /> : null}
      </div>
      {showProfilePrompt ? (
        <ProfileCompletenessPrompt
          missingFields={missingProfileFields}
          onComplete={openProfileSettings}
          onContinue={continueChatWithoutProfile}
          onClose={() => setShowProfilePrompt(false)}
        />
      ) : null}
    </main>
  );
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

function ProfileCompletenessPrompt({
  missingFields,
  onComplete,
  onContinue,
  onClose,
}: {
  missingFields: string[];
  onComplete: () => void;
  onContinue: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <section className="w-full max-w-sm rounded-[1.5rem] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.26)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-slate-950">补充基础信息</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              完善年龄、性别、过敏史、基础病和长期用药，有助于提高寻药推荐准确性。
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 active:bg-slate-100"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">待补充</p>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-800">{missingFields.join("、")}</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="h-11 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
            onClick={onContinue}
          >
            继续提问
          </button>
          <button
            type="button"
            className="h-11 rounded-2xl bg-slate-950 text-sm font-semibold text-white"
            onClick={onComplete}
          >
            去补充
          </button>
        </div>
      </section>
    </div>
  );
}

function LoadingShell() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,_#eef8f4_0%,_#f8fafc_48%,_#ffffff_100%)] px-3 py-4 text-foreground">
      <div className="mx-auto flex h-[calc(100dvh-2rem)] w-full max-w-md items-center justify-center overflow-hidden rounded-[2.15rem] border border-white/70 bg-white shadow-[0_28px_100px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/70">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-emerald-100" />
          <p className="mt-4 text-sm font-medium text-slate-500">加载中</p>
        </div>
      </div>
    </main>
  );
}
