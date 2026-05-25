import { TabBar, type TabBarItem } from "@/components/ui/tab-bar";
import { ChatIcon, DashboardIcon, UserIcon } from "@/features/shared-ui/icons";
import type { TabKey } from "@/stores/useAppStore";

const items: TabBarItem<TabKey>[] = [
  {
    key: "dashboard",
    label: "控制台",
    sublabel: "录药 / 看药 / 历史",
    icon: <DashboardIcon />,
  },
  {
    key: "chat",
    label: "寻药",
    sublabel: "聊天 / 推荐",
    icon: <ChatIcon />,
  },
  {
    key: "profile",
    label: "我的",
    sublabel: "家庭 / 成员",
    icon: <UserIcon />,
  },
];

export function BottomNav({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  return <TabBar items={items} value={activeTab} onChange={onChange} />;
}
