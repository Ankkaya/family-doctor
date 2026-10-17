import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { HttpAgent } from "@ag-ui/client";
import type { AgentSubscriber } from "@ag-ui/client";
import type { AGUIEvent, Message, RunAgentInput } from "@ag-ui/core";
import {
  createApiErrorFromResponse,
  parseJsonResponse,
  toApiError,
} from "@/shared/api/api-error";
import { isTauri } from "@/shared/lib/platform";
import { showErrorToast } from "@/shared/toast/toast-store";

type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

type HttpRequestInit = RequestInit & {
  skipAppAuth?: boolean;
  suppressErrorToast?: boolean;
};

type AuthHeadersProvider = () => Promise<Record<string, string>> | Record<string, string>;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:13001";
let authHeadersProvider: AuthHeadersProvider | undefined;

function resolveUrl(input: string | URL) {
  if (input instanceof URL) {
    return input;
  }

  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  return `${API_BASE_URL.replace(/\/$/, "")}/${input.replace(/^\//, "")}`;
}

function unwrapResponse<T>(data: T | ApiEnvelope<T>) {
  if (
    data &&
    typeof data === "object" &&
    "data" in data &&
    "code" in data
  ) {
    return (data as ApiEnvelope<T>).data;
  }

  return data as T;
}

function mergeHeaders(left?: HeadersInit, right?: HeadersInit) {
  return {
    ...(left ? Object.fromEntries(new Headers(left).entries()) : {}),
    ...(right ? Object.fromEntries(new Headers(right).entries()) : {}),
  };
}

async function request(input: string | URL, init?: HttpRequestInit) {
  const url = resolveUrl(input);
  const authHeaders = init?.skipAppAuth || !authHeadersProvider
    ? {}
    : await authHeadersProvider();
  const requestInit = {
    ...init,
    headers: mergeHeaders(authHeaders, init?.headers),
  };
  delete requestInit.skipAppAuth;
  delete requestInit.suppressErrorToast;

  if (isTauri()) {
    return tauriFetch(url, requestInit);
  }

  return fetch(url, requestInit);
}

async function requestStream(input: string | URL, init?: HttpRequestInit) {
  const url = resolveUrl(input);
  const authHeaders = init?.skipAppAuth || !authHeadersProvider
    ? {}
    : await authHeadersProvider();
  const requestInit = {
    ...init,
    headers: mergeHeaders(authHeaders, init?.headers),
  };
  delete requestInit.skipAppAuth;
  delete requestInit.suppressErrorToast;

  return fetch(url, requestInit);
}

async function requestJson<T>(input: string | URL, init: HttpRequestInit) {
  try {
    const response = await request(input, init);
    if (!response.ok) {
      throw await createApiErrorFromResponse(response);
    }

    const data = await parseJsonResponse<T | ApiEnvelope<T>>(response);
    return unwrapResponse<T>(data);
  } catch (error) {
    const apiError = toApiError(error);
    if (!init.suppressErrorToast) {
      showErrorToast(apiError.message);
    }
    throw apiError;
  }
}

export const httpClient = {
  setAuthHeadersProvider(provider: AuthHeadersProvider) {
    authHeadersProvider = provider;
  },

  async getJson<T>(input: string | URL, init?: HttpRequestInit) {
    return requestJson<T>(input, {
      method: "GET",
      ...init,
    });
  },

  async postJson<T>(input: string | URL, body?: unknown, init?: HttpRequestInit) {
    return requestJson<T>(input, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      ...init,
    });
  },

  async postForm<T>(input: string | URL, body: FormData, init?: HttpRequestInit) {
    return requestJson<T>(input, {
      method: "POST",
      body,
      ...init,
    });
  },

  async patchJson<T>(input: string | URL, body?: unknown, init?: HttpRequestInit) {
    return requestJson<T>(input, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      ...init,
    });
  },

  async deleteJson<T>(input: string | URL, init?: HttpRequestInit) {
    return requestJson<T>(input, {
      method: "DELETE",
      ...init,
    });
  },

  async runAgUiAgent(
    input: RunAgentInput,
    onEvent: (event: AGUIEvent) => void | Promise<void>,
    init?: HttpRequestInit,
  ) {
    const agent = new HttpAgent({
      url: String(resolveUrl("/consultation/ag-ui")),
      threadId: input.threadId,
      initialMessages: input.messages as Message[],
      initialState: input.state,
      fetch: (url, requestInit) => requestStream(url, {
        ...requestInit,
        suppressErrorToast: init?.suppressErrorToast,
      } as HttpRequestInit),
    });
    const subscriber: AgentSubscriber = {
      onEvent: ({ event }) => onEvent(event as AGUIEvent),
    };

    try {
      await agent.runAgent({
        runId: input.runId,
        tools: input.tools,
        context: input.context,
        forwardedProps: input.forwardedProps,
      }, subscriber);
    } catch (error) {
      const apiError = toApiError(error);
      if (!init?.suppressErrorToast) {
        showErrorToast(apiError.message);
      }
      throw apiError;
    }
  },
};
