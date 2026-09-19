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

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api/v1').replace(/\/+$/, '');

const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  return apiBaseUrl + normalizedPath;
};

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
  const headers = new Headers(options.headers);
  if (options.body !== undefined && options.body !== null && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: 'include',
    headers,
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
  const response = await fetch(apiUrl(path), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.blob();
};
