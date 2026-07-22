import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MessagesSquare, TicketCheck, Users, FileBarChart, Bell, UserCircle,
  Building2, Bot, Database, ChartNoAxesCombined, Settings, ScrollText, CalendarRange, RadioTower,
  Search, LogOut, PanelLeftClose, PanelLeftOpen, ChevronDown
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './auth';
import { api } from './api';
import type { Client, NotificationItem } from './types';
import { notify } from './toast';

type MenuItem = [string,string,LucideIcon];
type MenuGroup = {key:string;label:string;items:MenuItem[]};


function updateBrowserNotificationBadge(count:number){
  const doc=document;
  const root=doc.documentElement;
  const baseTitle=root.dataset.synotechBaseTitle||doc.title.replace(/^\(\d+\+?\)\s*/,"");
  root.dataset.synotechBaseTitle=baseTitle;
  doc.title=count>0?`(${count>99?'99+':count}) ${baseTitle}`:baseTitle;
  let link=doc.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if(!link){link=doc.createElement('link');link.rel='icon';link.href='/favicon.svg';doc.head.appendChild(link);}
  const baseHref=link.dataset.synotechBaseHref||link.href||'/favicon.svg';
  link.dataset.synotechBaseHref=baseHref;
  if(count<=0){link.href=baseHref;return;}
  const canvas=doc.createElement('canvas');canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const drawBadge=()=>{
    ctx.beginPath();ctx.arc(49,15,15,0,Math.PI*2);ctx.fillStyle='#dc2626';ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='bold 17px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(count>99?'99+':String(count),49,16);
    link!.href=canvas.toDataURL('image/png');
  };
  const fallback=()=>{ctx.fillStyle='#2563eb';ctx.fillRect(4,4,48,48);ctx.fillStyle='#fff';ctx.font='bold 30px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('S',28,29);drawBadge();};
  const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{ctx.drawImage(img,4,4,48,48);drawBadge();};img.onerror=fallback;img.src=baseHref;
}


let notificationAudioUnlocked=false;
function unlockNotificationAudio(){notificationAudioUnlocked=true;}
function playIncomingNotificationSound(){
  if(!notificationAudioUnlocked||document.hidden)return;
  try{
    const AudioCtx=(window.AudioContext||(window as any).webkitAudioContext) as typeof AudioContext;
    const ctx=new AudioCtx();const now=ctx.currentTime;
    const tone=(frequency:number,start:number,duration:number,volume:number)=>{const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(frequency,now+start);gain.gain.setValueAtTime(0.0001,now+start);gain.gain.exponentialRampToValueAtTime(volume,now+start+0.015);gain.gain.exponentialRampToValueAtTime(0.0001,now+start+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start(now+start);osc.stop(now+start+duration+0.02);};
    tone(740,0,0.16,0.08);tone(980,0.18,0.22,0.07);window.setTimeout(()=>void ctx.close(),700);
  }catch{/* Sound is enhancement-only; notifications remain visible. */}
}
const clientMenu: MenuItem[] = [
  ['/client/overview','Tổng quan',LayoutDashboard],
  ['/client/conversations','Hội thoại',MessagesSquare],
  ['/client/channels','Kênh trò chuyện',RadioTower],
  ['/client/tickets','Phản hồi & Yêu cầu',TicketCheck],
  ['/client/leads','Tư vấn trực tiếp',Users],
  ['/client/reports','Báo cáo',FileBarChart],
  ['/client/notifications','Thông báo',Bell],
  ['/client/account','Tài khoản',UserCircle]
];

const superMenuGroups: MenuGroup[] = [
  { key:'overview', label:'Tổng quan', items:[
    ['/admin/overview','Tổng quan hệ thống',LayoutDashboard],
  ]},
  { key:'customers', label:'Khách hàng & triển khai', items:[
    ['/admin/clients','Khách hàng',Building2],
    ['/admin/chatbot','Vận hành Chatbot',Bot],
    ['/admin/productization','Thương hiệu & Tư vấn',Settings],
    ['/admin/channels','Kênh tích hợp',RadioTower],
  ]},
  { key:'content', label:'Dữ liệu & nội dung', items:[
    ['/admin/admission','Dữ liệu tuyển sinh',CalendarRange],
    ['/admin/knowledge','Kho tri thức',Database],
    ['/admin/conversations','Hội thoại',MessagesSquare],
  ]},
  { key:'quality', label:'Chăm sóc & chất lượng', items:[
    ['/admin/tickets','Phản hồi & Yêu cầu',TicketCheck],
    ['/admin/analytics','Phân tích',ChartNoAxesCombined],
    ['/admin/ai-observability','Chất lượng AI & Chi phí',FileBarChart],
  ]},
  { key:'system', label:'Quản trị hệ thống', items:[
    ['/admin/users','Người dùng',Users],
    ['/admin/audit','Nhật ký thao tác',ScrollText],
    ['/admin/settings','Cấu hình hệ thống',Settings],
    ['/admin/account','Tài khoản',UserCircle],
  ]},
];

const superMenu = superMenuGroups.flatMap(group=>group.items);

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const tenantSelectRef = useRef<HTMLSelectElement>(null);
  const [collapsed,setCollapsed] = useState(false);
  const [clients,setClients] = useState<Client[]>([]);
  const [clientId,setClientId] = useState<string>(()=>sessionStorage.getItem('synotech_selected_client') || user?.client_id || 'cyp');
  const [notifications,setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount,setUnreadCount] = useState(0);
  const previousUnreadRef = useRef<number|null>(null);
  const menu = user?.role === 'super_admin' ? superMenu : clientMenu;
  useEffect(()=>{const unlock=()=>unlockNotificationAudio();window.addEventListener('pointerdown',unlock,{once:true});window.addEventListener('keydown',unlock,{once:true});return()=>{window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock)}},[]);
  const activeGroup = user?.role==='super_admin' ? superMenuGroups.find(g=>g.items.some(i=>location.pathname.startsWith(i[0])))?.key : undefined;
  const [openGroups,setOpenGroups] = useState<string[]>(()=>activeGroup?[activeGroup]:['overview']);
  useEffect(()=>{ if(activeGroup) setOpenGroups(v=>v.includes(activeGroup)?v:[...v,activeGroup]); },[activeGroup]);

  useEffect(()=>{
    if(user?.role==='super_admin') api<{success:boolean;results:Client[]}>('/v1/admin/clients').then(r=>{
      const rows=r.results||[];
      setClients(rows);
      if(rows.length && !rows.some(c=>(c.client_id||c.id)===clientId)) setClientId(String(rows[0].client_id||rows[0].id));
    }).catch(()=>{});
  },[user?.role]);
  useEffect(()=>{
    let cancelled=false;
    const endpoint=user?.role==='super_admin'?'/v1/admin/notifications?unread=true&limit=20':'/v1/dashboard/notifications?unread=true&limit=20';
    const load=()=>api<{success:boolean;results:NotificationItem[];unread_count?:number}>(endpoint).then(r=>{
      if(cancelled)return;
      const nextCount=Number(r.unread_count??r.results?.length??0);
      const previous=previousUnreadRef.current;
      if(previous!==null&&nextCount>previous&&user?.role==='client_admin'){
        const newest=(r.results||[])[0];
        const title=newest?.resource_type==='lead'?'Có khách hàng tiềm năng mới.':newest?.resource_type==='chat_feedback'?'Có phản hồi chatbot mới.':'Bạn có thông báo mới.';
        notify(title,'info');playIncomingNotificationSound();
      }
      previousUnreadRef.current=nextCount;
      setNotifications(r.results||[]);
      setUnreadCount(nextCount);
    }).catch(()=>{});
    const clear=()=>{previousUnreadRef.current=0;setNotifications([]);setUnreadCount(0)};
    const refresh=()=>{void load()};
    const visible=()=>{if(!document.hidden)void load()};
    void load();
    const timer=window.setInterval(()=>{if(!document.hidden)void load()},5000);
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',visible);
    window.addEventListener('synotech:notifications-read',clear);
    window.addEventListener('synotech:notifications-refresh',refresh);
    return()=>{cancelled=true;window.clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible);window.removeEventListener('synotech:notifications-read',clear);window.removeEventListener('synotech:notifications-refresh',refresh)};
  },[location.pathname,user?.role]);
  useEffect(()=>{updateBrowserNotificationBadge(unreadCount)},[unreadCount]);
  useEffect(()=>{ sessionStorage.setItem('synotech_selected_client',clientId); },[clientId]);

  const pageTitle = useMemo(()=> menu.find(item=>location.pathname.startsWith(item[0]))?.[1] || 'Synotech',[location.pathname,menu]);
  const withClient=(path:string)=> user?.role==='super_admin' ? `${path}${path.includes('?')?'&':'?'}client_id=${encodeURIComponent(clientId)}` : path;
  const openTenantPicker=()=>{
    const select=tenantSelectRef.current;
    if(!select)return;
    try{
      const picker=select as HTMLSelectElement & {showPicker?:()=>void};
      if(typeof picker.showPicker==='function') picker.showPicker();
      else { select.focus(); select.click(); }
    }catch{ select.focus(); }
  };
  const accountPath=user?.role==='super_admin'?'/admin/account':'/client/account';

  return <div className={`app-shell ${collapsed?'sidebar-collapsed':''}`}>
    <aside className="sidebar">
      <div className="brand"><img className="brand-logo" src="/synotech-logo.png" alt="Synotech"/><div><strong>Synotech</strong><small>Giải pháp công nghệ</small></div></div>
      <nav className="sidebar-nav">{user?.role==='super_admin' ? superMenuGroups.map(group=>{const opened=openGroups.includes(group.key);return <section className="nav-group" key={group.key}><button type="button" className={`nav-group-toggle ${activeGroup===group.key?'active-group':''}`} onClick={()=>setOpenGroups(v=>opened?v.filter(x=>x!==group.key):[...v,group.key])}><span>{group.label}</span><ChevronDown size={15} className={opened?'rotated':''}/></button>{opened&&<div className="nav-group-items">{group.items.map(([to,label,Icon])=><NavLink key={to} to={to} className={({isActive})=>isActive?'active':''}><Icon size={18}/><span>{label}</span></NavLink>)}</div>}</section>}) : menu.map(([to,label,Icon])=><NavLink key={to} to={to} className={({isActive})=>isActive?'active':''}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><button className="collapse-btn" onClick={()=>setCollapsed(v=>!v)}>{collapsed?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>}<span>Thu gọn</span></button></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <div className="topbar-title"><h2>{pageTitle}</h2>{user?.role==='super_admin' && <div className="tenant-select"><Building2 size={16}/><select ref={tenantSelectRef} value={clientId} onChange={e=>setClientId(e.target.value)} aria-label="Chọn khách hàng">{clients.map(c=><option key={c.client_id||c.id} value={c.client_id||c.id}>{c.display_name}</option>)}</select><button type="button" className="tenant-select-arrow" onClick={openTenantPicker} aria-label="Mở danh sách khách hàng"><ChevronDown size={15}/></button></div>}</div>
        <div className="topbar-search"><Search size={17}/><input placeholder="Tìm yêu cầu, hội thoại, tài liệu..." onKeyDown={e=>{if(e.key==='Enter'){const q=(e.currentTarget.value||'').trim(); if(q) navigate(user?.role==='super_admin'?`/admin/tickets?q=${encodeURIComponent(q)}`:`/client/conversations?q=${encodeURIComponent(q)}`)}}}/></div>
        <div className="topbar-actions"><button className="notification-btn" onClick={()=>navigate(user?.role==='super_admin'?'/admin/tickets':'/client/notifications')}><Bell size={19}/>{unreadCount>0&&<b>{unreadCount>99?'99+':unreadCount}</b>}</button><button className="user-chip" onClick={()=>navigate(accountPath)} title="Mở thông tin tài khoản"><span>{(user?.full_name||'U').slice(0,1).toUpperCase()}</span><div><strong>{user?.full_name}</strong><small>{user?.role==='super_admin'?'Quản trị hệ thống':'Quản trị khách hàng'}</small></div></button><button className="icon-btn" title="Đăng xuất" onClick={()=>logout()}><LogOut size={18}/></button></div>
      </header>
      <main><Outlet context={{clientId,withClient}}/></main>
    </div>
  </div>;
}

export type DashboardOutletContext = { clientId:string; withClient:(path:string)=>string };
