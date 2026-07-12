import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MessagesSquare, TicketCheck, Users, FileBarChart, Bell, UserCircle,
  Building2, Bot, Database, ChartNoAxesCombined, ShieldCheck, Settings, ScrollText, CalendarRange, RadioTower,
  Search, LogOut, PanelLeftClose, PanelLeftOpen, ChevronDown
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth';
import { api } from './api';
import type { Client, NotificationItem } from './types';

const clientMenu = [
  ['/client/overview','Tổng quan',LayoutDashboard],
  ['/client/conversations','Hội thoại',MessagesSquare],
  ['/client/channels','Kênh trò chuyện',RadioTower],
  ['/client/tickets','Phản hồi & Yêu cầu',TicketCheck],
  ['/client/leads','Khách hàng tiềm năng',Users],
  ['/client/reports','Báo cáo',FileBarChart],
  ['/client/notifications','Thông báo',Bell],
  ['/client/account','Tài khoản',UserCircle]
] as const;

const superMenu = [
  ['/admin/overview','Tổng quan hệ thống',LayoutDashboard],
  ['/admin/clients','Khách hàng',Building2],
  ['/admin/chatbot','Vận hành Chatbot',Bot],
  ['/admin/channels','Kênh tích hợp',RadioTower],
  ['/admin/admission','Dữ liệu tuyển sinh',CalendarRange],
  ['/admin/knowledge','Knowledge Base',Database],
  ['/admin/conversations','Hội thoại',MessagesSquare],
  ['/admin/tickets','Tickets',TicketCheck],
  ['/admin/analytics','Analytics',ChartNoAxesCombined],
  ['/admin/users','Người dùng',Users],
  ['/admin/audit','Audit Log',ScrollText],
  ['/admin/settings','Cấu hình hệ thống',Settings]
] as const;

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed,setCollapsed] = useState(false);
  const [clients,setClients] = useState<Client[]>([]);
  const [clientId,setClientId] = useState<string>(()=>sessionStorage.getItem('synotech_selected_client') || user?.client_id || 'cyp');
  const [notifications,setNotifications] = useState<NotificationItem[]>([]);
  const menu = user?.role === 'super_admin' ? superMenu : clientMenu;

  useEffect(()=>{
    if(user?.role==='super_admin') api<{success:boolean;results:Client[]}>('/v1/admin/clients').then(r=>setClients(r.results||[])).catch(()=>{});
  },[user?.role]);
  useEffect(()=>{
    const endpoint=user?.role==='super_admin'?'/v1/admin/notifications?unread=true&limit=10':'/v1/dashboard/notifications?unread=true&limit=10';
    api<{success:boolean;results:NotificationItem[]}>(endpoint).then(r=>setNotifications(r.results||[])).catch(()=>{});
  },[location.pathname,user?.role]);
  useEffect(()=>{ sessionStorage.setItem('synotech_selected_client',clientId); },[clientId]);

  const pageTitle = useMemo(()=> menu.find(item=>location.pathname.startsWith(item[0]))?.[1] || 'Synotech AI Operations',[location.pathname,menu]);
  const withClient=(path:string)=> user?.role==='super_admin' ? `${path}${path.includes('?')?'&':'?'}client_id=${encodeURIComponent(clientId)}` : path;

  return <div className={`app-shell ${collapsed?'sidebar-collapsed':''}`}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">S</span><div><strong>Synotech</strong><small>AI Operations</small></div></div>
      <nav>{menu.map(([to,label,Icon])=><NavLink key={to} to={to} className={({isActive})=>isActive?'active':''}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><button className="collapse-btn" onClick={()=>setCollapsed(v=>!v)}>{collapsed?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>}<span>Thu gọn</span></button></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <div className="topbar-title"><h2>{pageTitle}</h2>{user?.role==='super_admin' && <label className="tenant-select"><Building2 size={16}/><select value={clientId} onChange={e=>setClientId(e.target.value)}>{clients.map(c=><option key={c.client_id||c.id} value={c.client_id||c.id}>{c.display_name}</option>)}</select><ChevronDown size={15}/></label>}</div>
        <div className="topbar-search"><Search size={17}/><input placeholder="Tìm ticket, hội thoại, tài liệu..." onKeyDown={e=>{if(e.key==='Enter'){const q=(e.currentTarget.value||'').trim(); if(q) navigate(user?.role==='super_admin'?`/admin/tickets?q=${encodeURIComponent(q)}`:`/client/conversations?q=${encodeURIComponent(q)}`)}}}/></div>
        <div className="topbar-actions"><button className="notification-btn" onClick={()=>navigate(user?.role==='super_admin'?'/admin/tickets':'/client/notifications')}><Bell size={19}/>{notifications.length>0&&<b>{notifications.length}</b>}</button><div className="user-chip"><span>{(user?.full_name||'U').slice(0,1).toUpperCase()}</span><div><strong>{user?.full_name}</strong><small>{user?.role==='super_admin'?'Super Admin':'Client Admin'}</small></div></div><button className="icon-btn" title="Đăng xuất" onClick={()=>logout()}><LogOut size={18}/></button></div>
      </header>
      <main><Outlet context={{clientId,withClient}}/></main>
    </div>
  </div>;
}

export type DashboardOutletContext = { clientId:string; withClient:(path:string)=>string };
