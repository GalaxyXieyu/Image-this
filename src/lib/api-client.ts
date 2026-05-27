/**
 * Lightweight API client for the new frontend.
 * Wraps fetch with standard error handling and JSON parsing.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || `HTTP ${res.status}`, body.details);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  return handleResponse<T>(res);
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  return handleResponse<T>(res);
}
