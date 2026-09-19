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

const parseError = async (response: Response): Promise<ApiError> => {
  const body = await response.json().catch(() => null) as
    | { error?: { code?: string; message?: string } }
    | null;

  return new ApiError(
    response.status,
    body?.error?.code ?? 'REQUEST_FAILED',
    body?.error?.message ?? `Request failed with status ${response.status}.`,
  );
};

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

  if (!response.ok) {
    throw await parseError(response);
  }

  const body = await response.json().catch(() => null) as
    | { success?: boolean; data?: T }
    | null;

  return (body?.data ?? body) as T;
};

export const apiDownload = async (path: string): Promise<Blob> => {
  const response = await fetch(`/api/v1${path}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.blob();
};
