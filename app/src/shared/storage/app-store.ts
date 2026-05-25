import { load } from "@tauri-apps/plugin-store";
import { isTauri } from "@/shared/lib/platform";

const STORE_PATH = "store/app-settings.json";

type Primitive = string | number | boolean | null;

async function getStore() {
  return load(STORE_PATH);
}

export const appStore = {
  async get<T extends Primitive>(key: string) {
    if (isTauri()) {
      const store = await getStore();
      return store.get<T>(key);
    }

    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  },

  async set<T extends Primitive>(key: string, value: T) {
    if (isTauri()) {
      const store = await getStore();
      await store.set(key, value);
      await store.save();
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  },

  async remove(key: string) {
    if (isTauri()) {
      const store = await getStore();
      await store.delete(key);
      await store.save();
      return;
    }

    window.localStorage.removeItem(key);
  },
};
