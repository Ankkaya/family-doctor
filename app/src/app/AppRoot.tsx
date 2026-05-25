import { AppProviders } from "@/app/providers/AppProviders";
import { HomePage } from "@/pages/home/HomePage";
import { ToastHost } from "@/shared/toast/ToastHost";

export function AppRoot() {
  return (
    <AppProviders>
      <HomePage />
      <ToastHost />
    </AppProviders>
  );
}
