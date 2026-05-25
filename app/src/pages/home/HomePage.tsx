import { useEffect } from "react";
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
  "history-list": "对话历史",
  "history-detail": "历史详情",
  chat: "寻药",
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
          onBack={backToDashboard}
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
              onSend={sendChat}
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
        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      </div>
    </main>
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
