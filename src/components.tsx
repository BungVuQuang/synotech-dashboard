import { ReactNode, useEffect, useMemo, useState } from 'react';
import { X, Search, ChevronRight, Inbox, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <div className="page-header">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>;
}

export function MetricCard({ label, value, hint, tone = 'blue' }: { label: string; value: string | number; hint?: string; tone?: 'blue'|'green'|'orange'|'red'|'purple' }) {
  return <div className={`metric-card metric-${tone}`}>
    <span className="metric-label">{label}</span>
    <strong>{value}</strong>
    {hint && <small>{hint}</small>}
  </div>;
}

export function StatusBadge({ value }: { value?: string | null }) {
  const normalized = (value || 'unknown').toLowerCase();
  return <span className={`status-badge status-${normalized.replace(/_/g, '-')}`}>{labelStatus(normalized)}</span>;
}

function labelStatus(value: string) {
  const map: Record<string,string> = {
    active:'Hoạt động', trial:'Dùng thử', grace_period:'Gia hạn', suspended:'Tạm dừng', terminated:'Kết thúc',
    new:'Mới', triaged:'Đã phân loại', in_progress:'Đang xử lý', waiting_client:'Chờ khách hàng', resolved:'Đã xử lý',
    rejected:'Từ chối', closed:'Đã đóng', reopened:'Mở lại', cancelled:'Đã hủy',
    success:'Thành công', failed:'Thất bại', pending:'Đang chờ', synced:'Đã đồng bộ', out_of_sync:'Lệch dữ liệu',
    valid:'Hợp lệ', missing_metadata:'Thiếu metadata', invalid_metadata:'Metadata sai', enabled:'Đang bật', disabled:'Đã tắt', archived:'Lưu trữ',
    open:'Đang mở', completed:'Hoàn tất', no_source:'Thiếu nguồn', error:'Lỗi', partial:'Một phần'
  };
  return map[value] || value.replace(/_/g, ' ');
}

export function Toolbar({ search, onSearch, children }: { search?: string; onSearch?: (v:string)=>void; children?: ReactNode }) {
  return <div className="toolbar">
    {onSearch && <label className="search-box"><Search size={17}/><input value={search || ''} onChange={e=>onSearch(e.target.value)} placeholder="Tìm kiếm..." /></label>}
    <div className="toolbar-actions">{children}</div>
  </div>;
}

export function DataTable<T>({ columns, rows, keyOf, onRowClick, empty = 'Chưa có dữ liệu.' }: {
  columns: Array<{ key:string; title:string; render:(row:T)=>ReactNode; width?:string }>;
  rows: T[]; keyOf:(row:T)=>string; onRowClick?:(row:T)=>void; empty?:string;
}) {
  if (!rows.length) return <EmptyState title={empty}/>;
  return <div className="table-shell"><table className="data-table"><thead><tr>{columns.map(c=><th key={c.key} style={{width:c.width}}>{c.title}</th>)}</tr></thead>
    <tbody>{rows.map(row=><tr key={keyOf(row)} onClick={()=>onRowClick?.(row)} className={onRowClick?'clickable':''}>{columns.map(c=><td key={c.key}>{c.render(row)}</td>)}</tr>)}</tbody></table></div>;
}

export function EmptyState({ title, description }: { title:string; description?:string }) {
  return <div className="empty-state"><Inbox size={34}/><strong>{title}</strong>{description && <p>{description}</p>}</div>;
}

export function LoadingState({ label='Đang tải dữ liệu...' }: { label?:string }) {
  return <div className="loading-state"><Loader2 className="spin" size={20}/>{label}</div>;
}

export function ErrorState({ message, retry }: { message:string; retry?:()=>void }) {
  return <div className="error-state"><AlertTriangle size={24}/><div><strong>Không thể tải dữ liệu</strong><p>{message}</p>{retry && <button className="btn btn-secondary" onClick={retry}>Thử lại</button>}</div></div>;
}

export function Drawer({ open, title, onClose, children, footer }: { open:boolean; title:string; onClose:()=>void; children:ReactNode; footer?:ReactNode }) {
  useEffect(()=>{ if(!open) return; const h=(e:KeyboardEvent)=>{if(e.key==='Escape') onClose();}; window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h); },[open,onClose]);
  if(!open) return null;
  return <div className="drawer-layer" onMouseDown={e=>{if(e.target===e.currentTarget) onClose();}}><aside className="drawer"><header><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={19}/></button></header><div className="drawer-body">{children}</div>{footer && <footer>{footer}</footer>}</aside></div>;
}

export function Modal({ open, title, onClose, children, actions }: { open:boolean; title:string; onClose:()=>void; children:ReactNode; actions?:ReactNode }) {
  if(!open) return null;
  return <div className="modal-layer" onMouseDown={e=>{if(e.target===e.currentTarget) onClose();}}><div className="modal"><header><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={19}/></button></header><div className="modal-body">{children}</div>{actions && <footer>{actions}</footer>}</div></div>;
}

export function Tabs({ items, active, onChange }: { items:Array<{key:string;label:string;count?:number}>; active:string; onChange:(key:string)=>void }) {
  return <div className="tabs">{items.map(item=><button key={item.key} onClick={()=>onChange(item.key)} className={active===item.key?'active':''}>{item.label}{item.count!==undefined && <span>{item.count}</span>}</button>)}</div>;
}

export function MiniBarChart({ data }: { data:Array<{label:string;value:number}> }) {
  const max = Math.max(1,...data.map(d=>d.value));
  return <div className="mini-chart">{data.map(d=><div className="mini-chart-row" key={d.label}><span>{d.label}</span><div><i style={{width:`${Math.max(3,d.value/max*100)}%`}}/></div><b>{d.value}</b></div>)}</div>;
}

export function Timeline({ events }: { events:Array<{id?:string;event_type?:string;created_at?:string;actor_name?:string;from_value?:string;to_value?:string}> }) {
  return <div className="timeline">{events.map((e,i)=><div className="timeline-item" key={e.id || i}><span className="timeline-dot"><CheckCircle2 size={14}/></span><div><strong>{eventLabel(e.event_type || '')}</strong><p>{e.actor_name || 'Hệ thống'} · {formatDate(e.created_at)}</p>{e.to_value && <small>{e.from_value ? `${e.from_value} → ` : ''}{e.to_value}</small>}</div></div>)}</div>;
}

function eventLabel(value:string){ const map:Record<string,string>={created:'Đã tạo ticket',assigned:'Đã phân công',status_changed:'Đã đổi trạng thái',priority_changed:'Đã đổi mức độ',comment_added:'Đã thêm bình luận',resolution_updated:'Đã cập nhật kết quả',reopened:'Đã mở lại',cancelled:'Đã hủy'}; return map[value]||value; }

export function formatDate(value?: string | null) {
  if(!value) return '—';
  const date = new Date(value.includes('Z') || value.includes('+') ? value : `${value.replace(' ','T')}Z`);
  if(Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short'}).format(date);
}

export function shortText(value?: string | null, max=80) { if(!value) return '—'; return value.length>max?`${value.slice(0,max)}…`:value; }

export function Select({ value, onChange, children }: { value:string; onChange:(v:string)=>void; children:ReactNode }) {
  return <select value={value} onChange={e=>onChange(e.target.value)}>{children}</select>;
}

export function SectionCard({ title, description, children, action }: { title:string; description?:string; children:ReactNode; action?:ReactNode }) {
  return <section className="section-card"><header><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header><div className="section-content">{children}</div></section>;
}
