export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`/api/v1${path}`, {
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const body = await response.json().catch(() => null) as
    | { success?: boolean; data?: T; error?: { code?: string; message?: string } }
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'REQUEST_FAILED',
      body?.error?.message ?? `Request failed with status ${response.status}.`,
    );
  }

  return (body?.data ?? body) as T;
};
