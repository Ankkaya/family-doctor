type ErrorPayload = {
  code?: number;
  message?: unknown;
  error?: unknown;
  data?: unknown;
};

type ApiErrorOptions = {
  status?: number;
  code?: number;
  data?: unknown;
  cause?: unknown;
};

const networkErrorPatterns = [
  "failed to fetch",
  "load failed",
  "networkerror",
  "network request failed",
  "error sending request",
];

export class ApiError extends Error {
  status?: number;
  code?: number;
  data?: unknown;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.data = options.data;

    if (options.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

function normalizeMessage(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeMessage(item))
      .filter(Boolean)
      .join("；") || undefined;
  }

  return undefined;
}

function fallbackMessage(status?: number) {
  if (status === 401) return "登录已失效，请重新登录";
  if (status === 403) return "没有权限执行该操作";
  if (status === 404) return "请求的资源不存在";
  if (status === 408) return "请求超时，请稍后重试";
  if (status && status >= 500) return "服务暂不可用，请稍后重试";
  if (status) return `请求失败（${status}）`;
  return "网络连接失败，请检查服务是否可用";
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  return value !== null && typeof value === "object";
}

function messageFromPayload(payload: unknown) {
  if (!isErrorPayload(payload)) {
    return normalizeMessage(payload);
  }

  return normalizeMessage(payload.message) || normalizeMessage(payload.error);
}

async function readResponseBody(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function createApiErrorFromResponse(response: Response) {
  const payload = await readResponseBody(response);
  const message = messageFromPayload(payload) || fallbackMessage(response.status);
  const code = isErrorPayload(payload) && typeof payload.code === "number"
    ? payload.code
    : response.status;
  const data = isErrorPayload(payload) ? payload.data : undefined;

  return new ApiError(message, {
    status: response.status,
    code,
    data,
  });
}

function isLowLevelNetworkError(message: string) {
  const normalized = message.toLowerCase();
  return networkErrorPatterns.some((pattern) => normalized.includes(pattern));
}

export function toApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiError("请求已取消", { cause: error });
  }

  if (error instanceof Error && error.message && !isLowLevelNetworkError(error.message)) {
    return new ApiError(error.message, { cause: error });
  }

  return new ApiError(fallbackMessage(), { cause: error });
}

export async function parseJsonResponse<T>(response: Response) {
  const body = await readResponseBody(response);
  return body as T;
}
