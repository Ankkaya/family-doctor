import { isTauri } from "@/shared/lib/platform";
import {
  configureSecureVault,
  lockSecureVault,
  readSecret,
  removeSecrets,
  writeSecrets,
} from "@/shared/security/secure-vault";

const ACCESS_TOKEN_KEY = "app_access_token";
const REFRESH_TOKEN_KEY = "app_refresh_token";

export const authTokenStore = {
  async unlock(username: string, password: string) {
    if (isTauri()) {
      await configureSecureVault(username, password);
    }
  },

  async get() {
    if (isTauri()) {
      try {
        const [token, refreshToken] = await Promise.all([
          readSecret(ACCESS_TOKEN_KEY),
          readSecret(REFRESH_TOKEN_KEY),
        ]);
        return token && refreshToken ? { token, refreshToken } : null;
      } catch {
        return null;
      }
    }

    const token = window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
    return token && refreshToken ? { token, refreshToken } : null;
  },

  async set(token: string, refreshToken: string) {
    if (isTauri()) {
      await writeSecrets({
        [ACCESS_TOKEN_KEY]: token,
        [REFRESH_TOKEN_KEY]: refreshToken,
      });
      return;
    }

    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  async clear() {
    if (isTauri()) {
      try {
        await removeSecrets([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
      } finally {
        lockSecureVault();
      }
      return;
    }

    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
