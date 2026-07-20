const configuredApiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim();
export const API_BASE = configuredApiBase.replace(/\/$/, '');

if (!API_BASE && import.meta.env.PROD) {
  throw new Error('Dashboard chưa được cấu hình VITE_API_BASE_URL. Hãy deploy bằng Synotech CLI production.');
}
const TOKEN_KEY = 'synotech_dashboard_token';

export function repairVietnameseText(value: unknown): string {
  let text = String(value ?? '');
  if (!text) return text;

  // Repair common UTF-8 -> Windows-1252 mojibake. Run at most twice because
  // some legacy API strings were encoded twice before reaching the browser.
  const cp1252Reverse: Record<string, number> = {
    '€':0x80,'‚':0x82,'ƒ':0x83,'„':0x84,'…':0x85,'†':0x86,'‡':0x87,'ˆ':0x88,'‰':0x89,
    'Š':0x8A,'‹':0x8B,'Œ':0x8C,'Ž':0x8E,'‘':0x91,'’':0x92,'“':0x93,'”':0x94,
    '•':0x95,'–':0x96,'—':0x97,'˜':0x98,'™':0x99,'š':0x9A,'›':0x9B,'œ':0x9C,'ž':0x9E,'Ÿ':0x9F,
  };
  const badness = (input: string) => (input.match(/Ã|Â|Ä|Æ|áº|á»|â€|�/g) || []).length;
  const decodeOnce = (input: string): string | null => {
    const bytes: number[] = [];
    for (const ch of input) {
      const code = ch.codePointAt(0)!;
      if (code <= 0xFF) bytes.push(code);
      else if (cp1252Reverse[ch] !== undefined) bytes.push(cp1252Reverse[ch]);
      else return null;
    }
    try { return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)); }
    catch { return null; }
  };
  for (let i = 0; i < 2; i += 1) {
    const candidate = decodeOnce(text);
    if (!candidate || badness(candidate) >= badness(text)) break;
    text = candidate;
  }
  return text
    .replace(/�/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}


export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}


function mutationMessage(path: string, method: string, body: any): string {
  const rules: Array<[RegExp,string]> = [
    [/\/auth\/login$/, 'Đăng nhập thành công.'], [/\/auth\/logout$/, 'Đăng xuất thành công.'],
    [/\/assets/, 'Tải ảnh lên thành công.'], [/\/knowledge\/sync|\/kb\/sync/, 'Đồng bộ Kho tri thức thành công.'],
    [/\/knowledge-api-secret\/test/, 'Kiểm tra kết nối Kho tri thức thành công.'], [/\/knowledge-api-secret/, 'Lưu cấu hình Kho tri thức thành công.'],
    [/\/documents\/.*\/status/, 'Cập nhật trạng thái tài liệu thành công.'], [/\/documents\/.*\/metadata/, 'Lưu thông tin tài liệu thành công.'],
    [/\/documents\//, method==='DELETE'?'Xóa tài liệu thành công.':'Cập nhật tài liệu thành công.'],
    [/\/ai-governance/, 'Lưu cấu hình chi phí AI thành công.'], [/\/chatbot-theme/, 'Lưu nhận diện và giao diện chatbot thành công.'],
    [/\/contact-handoff/, 'Lưu thông tin tư vấn trực tiếp thành công.'], [/\/chat-surface/, 'Lưu hình thức triển khai chatbot thành công.'],
    [/\/notifications\/mark-all/, 'Đã đánh dấu tất cả thông báo là đã đọc.'], [/\/notifications\//, 'Cập nhật thông báo thành công.'],
    [/\/feedback\//, 'Cập nhật phản hồi thành công.'], [/\/clients$/, method==='POST'?'Tạo khách hàng thành công.':'Cập nhật khách hàng thành công.'],
    [/\/password/, 'Đổi mật khẩu thành công.'], [/\/lead|\/student-profile/, 'Lưu thông tin tư vấn trực tiếp thành công.']
  ];
  for (const [pattern,message] of rules) if(pattern.test(path)) return message;
  if (method === 'DELETE') return 'Xóa thành công.';
  if (body && typeof body === 'object' && typeof body.message === 'string' && body.message.trim()) {
    const repaired = repairVietnameseText(body.message.trim());
    if (repaired && !/Ã|Â|Ä|Æ|áº|á»|�/.test(repaired)) return repaired;
  }
  return 'Thao tác hoàn tất.';
}
function emitToast(message: string, kind: 'success'|'error'|'info' = 'success'): void {
  message = repairVietnameseText(message);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('synotech:toast', { detail: { message, kind } }));
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
    let message = repairVietnameseText(typeof body === 'object' && body ? body.message || body.error : String(body || response.statusText));
    if (!message || /Ã|Â|Ä|Æ|áº|á»|�/.test(message)) {
      message = response.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : response.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.'
        : response.status === 404 ? 'Không tìm thấy dữ liệu yêu cầu.'
        : response.status >= 500 ? 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'
        : 'Không thể hoàn tất thao tác. Vui lòng kiểm tra lại dữ liệu.';
    }
    if ((options.method || 'GET').toUpperCase() !== 'GET') emitToast(message, 'error');
    throw new ApiError(message, response.status, typeof body === 'object' ? body.error : undefined);
  }
  const method=(options.method || 'GET').toUpperCase();
  if (!['GET','HEAD','OPTIONS'].includes(method)) emitToast(mutationMessage(path,method,body),'success');
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
  if (!response.ok) { let message=repairVietnameseText(body?.message || 'Không thể tải ảnh lên.'); if (/Ã|Â|Ä|Æ|áº|á»|�/.test(message)) message='Không thể tải ảnh lên.'; emitToast(message,'error'); throw new ApiError(message, response.status, body?.error); }
  emitToast('Tải ảnh lên thành công.','success');
  return body;
}
