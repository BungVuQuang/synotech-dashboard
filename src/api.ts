export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'synotech_dashboard_token';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null, remember = false): void {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  if (!token) return;
  (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof body === 'object' && body ? body.message || body.error : String(body || response.statusText);
    throw new ApiError(message, response.status, typeof body === 'object' ? body.error : undefined);
  }
  return body as T;
}

export async function download(path: string, filename: string): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new ApiError('Không thể tải báo cáo.', response.status);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}


export async function uploadAsset(file: File, clientId: string, assetType: 'logo'|'favicon'|'background'): Promise<{success:boolean;url:string;key:string}> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  form.append('client_id', clientId);
  form.append('asset_type', assetType);
  const response = await fetch(`${API_BASE}/v1/admin/assets`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form
  });
  const body = await response.json().catch(()=>({}));
  if (!response.ok) throw new ApiError(body?.message || 'Không thể tải ảnh lên.', response.status, body?.error);
  return body;
}
