const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown[];

  constructor(status: number, code: string, message: string, details: unknown[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

const getCookie = (name: string): string | null => {
  const encoded = `${name}=`;
  const found = document.cookie.split("; ").find((item) => item.startsWith(encoded));
  return found ? decodeURIComponent(found.slice(encoded.length)) : null;
};

const isMutating = (method: string): boolean => !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (isMutating(method)) {
    const csrf = getCookie("buildhire_csrf");
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      throw new ApiError(response.status, "INVALID_RESPONSE", "The server returned an invalid response.");
    }
  }

  if (!response.ok) {
    const failure = payload as ApiFailure | null;
    throw new ApiError(
      response.status,
      failure?.success === false ? failure.error.code : "HTTP_ERROR",
      failure?.success === false ? failure.error.message : "The request could not be completed.",
      failure?.success === false ? failure.error.details ?? [] : [],
    );
  }

  if (!payload || typeof payload !== "object" || !("success" in payload) || payload.success !== true) {
    throw new ApiError(response.status, "INVALID_RESPONSE", "The server returned an unexpected response.");
  }

  return (payload as { success: true; data: T }).data;
};

export { API_BASE_URL };