import { appDataDir, join } from "@tauri-apps/api/path";
import { Stronghold } from "@tauri-apps/plugin-stronghold";
import { isTauri } from "@/shared/lib/platform";

const SNAPSHOT_NAME = "family-doctor.stronghold";
const CLIENT_NAME = "family-doctor";

let vaultPassword: string | undefined;
let strongholdPromise: Promise<Stronghold> | undefined;

export async function configureSecureVault(username: string, password: string) {
  const material = new TextEncoder().encode(`family-doctor:${username.trim().toLowerCase()}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", material);
  vaultPassword = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  strongholdPromise = undefined;
}

export function lockSecureVault() {
  vaultPassword = undefined;
  strongholdPromise = undefined;
}

async function loadStronghold() {
  if (!isTauri()) {
    throw new Error("Stronghold is only available inside Tauri runtime");
  }
  if (!vaultPassword) {
    throw new Error("安全存储尚未解锁，请重新登录");
  }
  if (!strongholdPromise) {
    strongholdPromise = join(await appDataDir(), SNAPSHOT_NAME)
      .then((snapshotPath) => Stronghold.load(snapshotPath, vaultPassword!));
  }
  return strongholdPromise;
}

async function getSecretStore() {
  const stronghold = await loadStronghold();
  const client = await stronghold.loadClient(CLIENT_NAME).catch(() => stronghold.createClient(CLIENT_NAME));
  return { stronghold, store: client.getStore() };
}

export async function writeSecrets(values: Record<string, string>) {
  const { stronghold, store } = await getSecretStore();
  for (const [key, value] of Object.entries(values)) {
    await store.insert(key, Array.from(new TextEncoder().encode(value)));
  }
  await stronghold.save();
}

export async function readSecret(key: string) {
  const { store } = await getSecretStore();
  const value = await store.get(key);
  return value ? new TextDecoder().decode(value) : null;
}

export async function removeSecrets(keys: string[]) {
  const { stronghold, store } = await getSecretStore();
  for (const key of keys) {
    await store.remove(key);
  }
  await stronghold.save();
}
