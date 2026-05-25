import { Stronghold } from "@tauri-apps/plugin-stronghold";
import { isTauri } from "@/shared/lib/platform";

const SNAPSHOT_PATH = "stronghold/app.stronghold";
const CLIENT_NAME = "family-doctor";

export async function loadStronghold(password: string) {
  if (!isTauri()) {
    throw new Error("Stronghold is only available inside Tauri runtime");
  }

  return Stronghold.load(SNAPSHOT_PATH, password);
}

export async function saveSecret(
  password: string,
  key: string,
  value: string,
) {
  const stronghold = await loadStronghold(password);
  const client = await stronghold.loadClient(CLIENT_NAME).catch(() => {
    return stronghold.createClient(CLIENT_NAME);
  });
  const store = client.getStore();

  await store.insert(key, Array.from(new TextEncoder().encode(value)));
  await stronghold.save();
}
