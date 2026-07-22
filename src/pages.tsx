import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { api, download, uploadAsset } from './api';
import { useAuth } from './auth';
import type { AdmissionBenchmark, AdmissionRound, ApiList, Client, Conversation, KbDocument, Lead, NotificationItem, Ticket, User, ChannelSummary, ChannelIntegration, ChatSurfaceConfig } from './types';
import {
  DataTable, Drawer, EmptyState, ErrorState, formatDate, LoadingState, MetricCard, MiniBarChart,
  Modal, PageHeader, SectionCard, Select, shortText, StatusBadge, Tabs, Timeline, Toolbar, TopicFeedbackChart
} from './components';
import type { DashboardOutletContext } from './layout';
import { FEEDBACK_REVIEW_STATUS_OPTIONS, FEEDBACK_ROOT_CAUSE_OPTIONS, feedbackReviewStatusLabel, feedbackRootCauseLabel, issueTypeLabel, knowledgeGroupLabel, topicLabel, intentLabel, channelLabel, featureLabel, auditActionLabel, auditResourceLabel } from './labels';
import { AlertCircle, Bell, Bot, CalendarRange, CheckCircle2, Database, Download, ExternalLink, FileCheck2, Filter, KeyRound, MessageSquareText, Plus, RefreshCw, Save, Send, ShieldCheck, TicketCheck, Trash2, UserPlus, RadioTower, Globe2, Facebook, MessageCircle, UploadCloud, Image as ImageIcon } from 'lucide-react';

function useLoad<T>(loader:()=>Promise<T>, deps:unknown[]=[]){
  const [data,setData]=useState<T|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const reload=()=>{setLoading(true);setError('');loader().then(setData).catch(e=>setError(e instanceof Error?e.message:String(e))).finally(()=>setLoading(false));};
  useEffect(reload,deps); return {data,loading,error,reload,setData};
}

export function LoginPage(){
  const {login,user}=useAuth();
  const navigate=useNavigate();
  const [params]=useSearchParams();
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [remember,setRemember]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  useEffect(()=>{if(user) navigate(user.role==='super_admin'?'/admin/overview':'/client/overview',{replace:true});},[user,navigate]);
  const submit=async(e:FormEvent)=>{e.preventDefault();setLoading(true);setError('');try{await login(username,password,remember);}catch(err){setError(err instanceof Error?err.message:'Đăng nhập thất bại.');}finally{setLoading(false)}};
  return <div className="login-page">
    <div className="login-visual" aria-label="Hình nền thương hiệu Synotech" aria-hidden="true"/>
    <form className="login-card" onSubmit={submit}>
      <div className="brand brand-login"><img className="brand-logo" src="/synotech-logo.png" alt="Synotech"/><div><strong>Synotech</strong><small>Giải pháp công nghệ</small></div></div>
      <h2>Đăng nhập trang quản trị</h2><p>Sử dụng tài khoản được Synotech cấp.</p>
      {params.get('passwordChanged')==='1'&&<div className="success-message login-message">Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.</div>}
      {error&&<div className="form-error"><AlertCircle size={17}/>{error}</div>}
      <label>Tên đăng nhập<input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required/></label>
      <label>Mật khẩu<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>
      <label className="remember-login"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/><span>Ghi nhớ đăng nhập trên thiết bị này</span></label>
      <button className="btn btn-primary btn-block" disabled={loading}>{loading?'Đang đăng nhập...':'Đăng nhập'}</button>
      <small className="login-note">Chỉ chọn ghi nhớ khi đây là thiết bị cá nhân của bạn.</small>
    </form>
  </div>;
}

export function ClientOverviewPage(){
  const {withClient}=useOutletContext<DashboardOutletContext>();
  const {data,loading,error,reload}=useLoad(async()=>{
    const [summary,unanswered,feedback]=await Promise.all([
      api<any>(withClient('/v1/dashboard/summary?limit=30')),
      api<ApiList<any>>(withClient('/v1/dashboard/unanswered?limit=8')),
      api<any>(withClient('/v1/dashboard/feedback/summary?limit=12')),
    ]);
    return{summary,unanswered:unanswered.results||[],feedback};
  },[]);
  if(loading)return <LoadingState/>; if(error)return <ErrorState message={error} retry={reload}/>;
  const daily=data?.summary?.daily||[];
  const totals=daily.reduce((a:any,r:any)=>({q:a.q+Number(r.valid_question_count||0),s:a.s+Number(r.active_sessions||0),rag:a.rag+Number(r.rag_answer_count||0)}),{q:0,s:0,rag:0});
  const overview=data?.feedback?.overview||{};
  const chartRows=(data?.feedback?.topics||[]).map((r:any)=>({
    label:topicLabel(r.topic),questions:Number(r.question_count||0),likes:Number(r.like_count||0),dislikes:Number(r.dislike_count||0)
  }));
  return <>
    <PageHeader title="Tổng quan chatbot" description="Theo dõi mức độ sử dụng, phản hồi của người dùng và các nội dung cần cải thiện." actions={<button className="btn btn-secondary" onClick={reload}><RefreshCw size={16}/>Làm mới</button>}/>
    <div className="metrics-grid">
      <MetricCard label="Câu hỏi" value={totals.q} hint="30 ngày gần nhất"/>
      <MetricCard label="Phiên hội thoại" value={totals.s} tone="purple"/>
      <MetricCard label="Lượt hài lòng" value={overview.like_count||0} tone="green"/>
      <MetricCard label="Lượt không hài lòng" value={overview.dislike_count||0} tone="red"/>
      <MetricCard label="Tỷ lệ hài lòng" value={overview.satisfaction_rate==null?'Chưa có':`${overview.satisfaction_rate}%`} tone="orange"/>
    </div>
    <div className="two-column wide-left">
      <SectionCard title="Mức độ hài lòng theo chủ đề" description="Cột là số câu hỏi; hai đường thể hiện lượt hài lòng và không hài lòng của từng chủ đề."><TopicFeedbackChart data={chartRows}/></SectionCard>
      <SectionCard title="Phản hồi cần theo dõi" description="Các lượt không hài lòng gần đây để nhà trường nắm tình hình.">
        <DataTable rows={data?.feedback?.recent_negative||[]} keyOf={(r:any)=>r.id} columns={[
          {key:'q',title:'Câu hỏi',render:(r:any)=>shortText(r.question_text,72)},
          {key:'group',title:'Nhóm nội dung',render:(r:any)=><span className="tag">{knowledgeGroupLabel(r.knowledge_group)}</span>},
          {key:'status',title:'Trạng thái xem xét',render:(r:any)=>feedbackReviewStatusLabel(r.review_status)},
        ]}/>
      </SectionCard>
    </div>
    <SectionCard title="Câu hỏi cần chú ý" description="Các câu chưa có nguồn hoặc cần kiểm tra thêm">
      <DataTable rows={data?.unanswered||[]} keyOf={(r:any)=>r.id} columns={[
        {key:'q',title:'Câu hỏi',render:(r:any)=>shortText(r.raw_message,100)},
        {key:'group',title:'Nhóm nội dung',render:(r:any)=><span className="tag">{knowledgeGroupLabel(r.knowledge_group)}</span>},
        {key:'reason',title:'Lý do',render:(r:any)=><StatusBadge value={r.reason}/>},
        {key:'time',title:'Thời gian',render:(r:any)=>formatDate(r.created_at)}
      ]}/>
    </SectionCard>
  </>;
}
export function AdminOverviewPage(){
  const {clientId,withClient}=useOutletContext<DashboardOutletContext>();
  const {data,loading,error,reload}=useLoad(async()=>{const [overview,analytics,tickets]=await Promise.all([api<any>('/v1/admin/overview'),api<any>(withClient('/v1/admin/analytics/system')),api<ApiList<Ticket>>('/v1/admin/tickets?limit=8')]);return{overview,analytics,tickets:tickets.results||[]}},[clientId]);
  if(loading)return <LoadingState/>; if(error)return <ErrorState message={error} retry={reload}/>;
  const a=data?.analytics||{}; const feedback=a.feedback||{};
  return <><PageHeader title="Tổng quan hệ thống" description="Theo dõi khách hàng, chatbot, kho tri thức, phản hồi và yêu cầu hỗ trợ trên toàn hệ thống." actions={<button className="btn btn-secondary" onClick={reload}><RefreshCw size={16}/>Làm mới</button>}/>
  <div className="metrics-grid"><MetricCard label="Khách hàng" value={data?.overview?.total_clients||0}/><MetricCard label="Khách hàng đang hoạt động" value={data?.overview?.active_clients||0} tone="green"/><MetricCard label="Yêu cầu đang mở" value={a.platform?.open_tickets||0} tone="red"/><MetricCard label="Lượt hài lòng" value={feedback.like_count||0} tone="green"/><MetricCard label="Lượt không hài lòng" value={feedback.dislike_count||0} tone="red"/></div>
  <div className="three-column">
    <SectionCard title="Chất lượng hội thoại"><div className="health-list"><div><span>Thiếu nguồn</span><b>{a.chats?.no_source_events||0}</b></div><div><span>Câu hỏi nhiều nội dung</span><b>{a.chats?.multi_intent_events||0}</b></div><div><span>Độ tin cậy trung bình</span><b>{Math.round(Number(a.chats?.avg_confidence||0)*100)}%</b></div></div></SectionCard>
    <SectionCard title="Phản hồi người dùng"><div className="health-list"><div><span>Tỷ lệ hài lòng</span><b>{feedback.satisfaction_rate==null?'Chưa có':`${feedback.satisfaction_rate}%`}</b></div><div><span>Chưa xem xét</span><b>{feedback.unreviewed_dislike_count||0}</b></div><div><span>Tổng lượt đánh giá</span><b>{feedback.feedback_count||0}</b></div></div></SectionCard>
    <SectionCard title="Sức khỏe kho tri thức"><div className="health-list"><div><span>Tài liệu</span><b>{a.kb?.total_documents||0}</b></div><div><span>Thông tin sai hoặc thiếu</span><b>{a.kb?.invalid_metadata||0}</b></div><div><span>Lỗi đồng bộ</span><b>{a.kb?.sync_issues||0}</b></div></div></SectionCard>
  </div><SectionCard title="Yêu cầu mới cập nhật"><TicketTable rows={data?.tickets||[]}/></SectionCard></>;
}
function TicketTable({rows,onSelect}:{rows:Ticket[];onSelect?:(t:Ticket)=>void}){return <DataTable rows={rows} keyOf={r=>r.id} onRowClick={onSelect} columns={[{key:'code',title:'Mã yêu cầu',render:r=><b className="mono">{r.ticket_code}</b>},{key:'title',title:'Nội dung',render:r=><div><strong>{shortText(r.title,55)}</strong><small className="table-sub">{r.client_name||r.client_id}</small></div>},{key:'priority',title:'Mức độ',render:r=><StatusBadge value={r.priority}/>},{key:'status',title:'Trạng thái',render:r=><StatusBadge value={r.status}/>},{key:'assignee',title:'Người xử lý',render:r=>r.assigned_to_name||'Chưa phân công'},{key:'time',title:'Cập nhật',render:r=>formatDate(r.updated_at)}]}/>}

export function ConversationsPage({admin=false}:{admin?:boolean}){
  const {clientId,withClient}=useOutletContext<DashboardOutletContext>();
  const [searchParams]=useSearchParams();
  const [search,setSearch]=useState(searchParams.get('q')||searchParams.get('session_id')||'');
  const [flagged,setFlagged]=useState(false);
  const [page,setPage]=useState(1);
  const pageSize=20;
  const [selected,setSelected]=useState<Conversation|null>(null); const [detail,setDetail]=useState<any>(null); const [ticketOpen,setTicketOpen]=useState(false);
  const endpoint=admin?'/v1/admin/conversations':'/v1/dashboard/conversations';
  useEffect(()=>setPage(1),[clientId,search,flagged]);
  const {data,loading,error,reload}=useLoad(()=>api<any>(withClient(`${endpoint}?page=${page}&page_size=${pageSize}${search?`&q=${encodeURIComponent(search)}`:''}${flagged?'&flagged=true':''}`)),[clientId,search,flagged,page]);
  const openConversation=async(row:Conversation)=>{setSelected(row);setDetail(null);const base=admin?'/v1/admin/conversations':'/v1/dashboard/conversations';setDetail(await api(withClient(`${base}/${encodeURIComponent(row.session_id)}`)));};
  const topicSummary=(row:any)=>{const topics=Array.isArray(row.topics)?row.topics:[];const labels=topics.map((x:string)=>topicLabel(x));if(!labels.length){const groups=Array.isArray(row.knowledge_groups)?row.knowledge_groups:[];return groups.map((x:string)=>knowledgeGroupLabel(x));}return labels;};
  return <><PageHeader title="Hội thoại" description={admin?'Kiểm tra hội thoại chi tiết và dữ liệu vận hành theo khách hàng.':'Xem câu hỏi, câu trả lời, nguồn trích dẫn và tạo phản hồi.'}/><Toolbar search={search} onSearch={setSearch}><label className="check"><input type="checkbox" checked={flagged} onChange={e=>setFlagged(e.target.checked)}/>Chỉ hiện hội thoại cần chú ý</label></Toolbar>{loading?<LoadingState/>:error?<ErrorState message={error} retry={reload}/>:<><DataTable rows={data?.results||[]} keyOf={(r:any)=>r.session_id} onRowClick={openConversation} columns={[{key:'time',title:'Thời gian',render:(r:any)=>formatDate(r.latest_event_at||r.started_at)},{key:'question',title:'Câu hỏi gần nhất',render:(r:any)=><div><strong>{shortText(r.latest_user_message,90)}</strong><small className="table-sub mono">{r.session_id}</small></div>},{key:'group',title:'Nhóm chủ đề',render:(r:any)=>{const labels=topicSummary(r);return <span className="tag topic-summary" title={labels.join(', ')}>{labels.length?`${labels[0]}${labels.length>1?` +${labels.length-1}`:''}`:'Chưa xác định'}</span>}},{key:'messages',title:'Câu hỏi',render:(r:any)=>Number(r.user_question_count??r.valid_question_count??0)},{key:'issues',title:'Cảnh báo',render:(r:any)=><div className="issue-counts">{r.no_source_count>0&&<span className="danger">{r.no_source_count} thiếu nguồn</span>}{r.error_count>0&&<span className="danger">{r.error_count} lỗi</span>}{r.multi_intent_count>0&&<span>{r.multi_intent_count} câu nhiều nội dung</span>}</div>}]}/><Pagination page={Number(data?.page||1)} totalPages={Number(data?.total_pages||1)} onChange={setPage}/></>}<Drawer open={!!selected} title="Chi tiết hội thoại" onClose={()=>{setSelected(null);setDetail(null)}} footer={!admin&&<button className="btn btn-danger" onClick={()=>setTicketOpen(true)}><TicketCheck size={16}/>Báo câu trả lời sai</button>}>{!detail?<LoadingState/>:<ConversationDetail detail={detail} admin={admin}/>}</Drawer>{!admin&&selected&&<CreateTicketModal open={ticketOpen} onClose={()=>setTicketOpen(false)} conversation={detail} sessionId={selected.session_id}/>}</>;
}

function Pagination({page,totalPages,onChange}:{page:number;totalPages:number;onChange:(page:number)=>void}){
  if(totalPages<=1)return null;
  const pages=Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=2);
  const items:(number|string)[]=[];let prev=0;for(const p of pages){if(prev&&p-prev>1)items.push(`gap-${p}`);items.push(p);prev=p;}
  return <nav className="pagination" aria-label="Chuyển trang"><button disabled={page<=1} onClick={()=>onChange(page-1)}>‹</button>{items.map(item=>typeof item==='number'?<button key={item} className={item===page?'active':''} onClick={()=>onChange(item)}>{item}</button>:<span key={item}>…</span>)}<button disabled={page>=totalPages} onClick={()=>onChange(page+1)}>›</button></nav>;
}

function ConversationDetail({detail,admin}:{detail:any;admin:boolean}){const events=detail?.events||[];const citations=detail?.citations||[];const tasks=detail?.tasks||[];return <div className="conversation-detail"><div className="detail-meta"><span>Mã hội thoại <b className="mono">{detail?.session?.id}</b></span><span>Bắt đầu {formatDate(detail?.session?.started_at)}</span></div><div className="conversation-thread">{events.map((e:any)=><div className={`chat-event ${e.role}`} key={e.id}><span>{e.role==='user'?'Người dùng':'Chatbot'}</span><div>{e.raw_message}</div>{admin&&<small>{knowledgeGroupLabel(e.knowledge_group)} · {intentLabel(e.intent)} · {Math.round(Number(e.confidence||0)*100)}%</small>}</div>)}</div>{tasks.length>0&&<SectionCard title="Xử lý câu hỏi nhiều nội dung"><DataTable rows={tasks} keyOf={(r:any)=>r.id} columns={[{key:'task',title:'Nội dung cần xử lý',render:(r:any)=>r.query_text},{key:'group',title:'Nhóm nội dung',render:(r:any)=><span className="tag">{knowledgeGroupLabel(r.knowledge_group)}</span>},{key:'status',title:'Trạng thái',render:(r:any)=><StatusBadge value={r.status}/>},{key:'score',title:'Điểm khớp',render:(r:any)=>r.max_retrieval_score??'—'}]}/></SectionCard>}{citations.length>0&&<SectionCard title="Nguồn trích dẫn"><div className="source-list">{citations.map((c:any)=><div key={c.id}><FileCheck2 size={18}/><div><strong>{c.document_name}</strong><small>{c.source_id||c.source_code||c.document_id} · điểm khớp {c.score??'—'}</small></div>{(c.preview_url||c.source_url)&&<a href={c.preview_url||c.source_url} target="_blank" rel="noreferrer" title="Xem tài liệu"><ExternalLink size={16}/></a>}</div>)}</div></SectionCard>}</div>}

function CreateTicketModal({open,onClose,conversation,sessionId}:{open:boolean;onClose:()=>void;conversation:any;sessionId:string}){const [issue,setIssue]=useState('wrong_answer');const [priority,setPriority]=useState('normal');const [description,setDescription]=useState('');const [sending,setSending]=useState(false);const events=conversation?.events||[];const userEvent=[...events].reverse().find((e:any)=>e.role==='user');const answerEvent=[...events].reverse().find((e:any)=>e.role==='assistant'&&(!userEvent||new Date(e.created_at)>=new Date(userEvent.created_at)))||[...events].reverse().find((e:any)=>e.role==='assistant');const allSources=conversation?.citations||[];const eventSources=userEvent?.id?allSources.filter((c:any)=>c.chat_event_id===userEvent.id):[];const sources=eventSources.length?eventSources:allSources;const submit=async()=>{setSending(true);try{await api('/v1/dashboard/tickets',{method:'POST',body:JSON.stringify({request_type:'answer_feedback',issue_type:issue,title:`Phản hồi câu trả lời: ${shortText(userEvent?.raw_message,60)}`,description,priority,session_id:sessionId,chat_event_id:userEvent?.id,question:userEvent?.raw_message,answer:answerEvent?.raw_message,sources})});onClose();}finally{setSending(false)}};return <Modal open={open} title="Báo câu trả lời chưa chính xác" onClose={onClose} actions={<><button className="btn btn-secondary" onClick={onClose}>Hủy</button><button className="btn btn-danger" disabled={sending} onClick={submit}>{sending?'Đang gửi...':'Tạo yêu cầu'}</button></>}><div className="form-grid"><label>Loại vấn đề<select value={issue} onChange={e=>setIssue(e.target.value)}><option value="wrong_answer">Trả lời sai</option><option value="missing_source">Thiếu nguồn</option><option value="outdated_information">Thông tin cũ</option><option value="wrong_citation">Trích sai tài liệu</option><option value="misclassification">Phân loại sai câu hỏi</option><option value="no_response">Không phản hồi</option><option value="ui_error">Lỗi giao diện</option><option value="knowledge_update">Yêu cầu cập nhật dữ liệu</option><option value="other">Khác</option></select></label><label>Mức độ<select value={priority} onChange={e=>setPriority(e.target.value)}><option value="low">Thấp</option><option value="normal">Bình thường</option><option value="high">Cao</option><option value="urgent">Khẩn cấp</option></select></label><label className="full">Mô tả mong muốn<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={5} placeholder="Nêu phần sai và câu trả lời mong muốn..."/></label><div className="snapshot full"><strong>Câu hỏi</strong><p>{userEvent?.raw_message||'—'}</p><strong>Câu trả lời</strong><p>{answerEvent?.raw_message||'—'}</p></div></div></Modal>}

export function TicketsPage({admin=false}:{admin?:boolean}){const {clientId,withClient}=useOutletContext<DashboardOutletContext>();const [status,setStatus]=useState('');const [search,setSearch]=useState('');const [selected,setSelected]=useState<Ticket|null>(null);const [detail,setDetail]=useState<any>(null);const base=admin?'/v1/admin/tickets':'/v1/dashboard/tickets';const {data,loading,error,reload}=useLoad(()=>api<ApiList<Ticket>>(withClient(`${base}?limit=300${status?`&status=${status}`:''}${search?`&q=${encodeURIComponent(search)}`:''}`)),[clientId,status,search]);const open=async(t:Ticket)=>{setSelected(t);setDetail(await api(withClient(`${base}/${t.id}`)))};return <><PageHeader title={admin?'Phản hồi & Yêu cầu':'Phản hồi & Yêu cầu'} description={admin?'Tiếp nhận và xử lý phản hồi từ các trường.':'Theo dõi tiến độ xử lý các phản hồi đã gửi.'}/><Tabs active={status} onChange={setStatus} items={[{key:'',label:'Tất cả'},{key:'new',label:'Mới'},{key:'in_progress',label:'Đang xử lý'},{key:'waiting_client',label:'Chờ phản hồi'},{key:'resolved',label:'Đã xử lý'},{key:'closed',label:'Đã đóng'}]}/><Toolbar search={search} onSearch={setSearch}/>{loading?<LoadingState/>:error?<ErrorState message={error} retry={reload}/>:<TicketTable rows={data?.results||[]} onSelect={open}/>}<Drawer open={!!selected} title={selected?.ticket_code||'Yêu cầu'} onClose={()=>{setSelected(null);setDetail(null)}} footer={detail&&<TicketActions admin={admin} detail={detail} reload={async()=>{setDetail(await api(withClient(`${base}/${selected?.id}`)));reload();}}/>}>{!detail?<LoadingState/>:<TicketDetail detail={detail} admin={admin}/>}</Drawer></>}

function TicketDetail({detail,admin}:{detail:any;admin:boolean}){const t=detail.ticket;return <div className="ticket-detail"><TicketWorkflow status={t.status}/><div className="ticket-summary"><div><span>Trạng thái</span><StatusBadge value={t.status}/></div><div><span>Mức độ</span><StatusBadge value={t.priority}/></div><div><span>Người xử lý</span><b>{t.assigned_to_name||'Chưa phân công'}</b></div><div><span>Cập nhật</span><b>{formatDate(t.updated_at)}</b></div></div><SectionCard title="Nội dung phản hồi"><h3>{t.title}</h3><p>{t.description||'Không có mô tả.'}</p>{t.question_snapshot&&<><label className="detail-label">Câu hỏi người dùng</label><div className="quote-box">{t.question_snapshot}</div></>}{t.answer_snapshot&&<><label className="detail-label">Câu trả lời chatbot</label><div className="quote-box">{t.answer_snapshot}</div></>}</SectionCard>{t.resolution_note&&<SectionCard title="Kết quả xử lý"><p>{t.resolution_note}</p></SectionCard>}<SectionCard title="Trao đổi"><div className="comments">{(detail.comments||[]).map((c:any)=><div className={`comment ${c.author_role}`} key={c.id}><div><strong>{c.author_name}</strong><small>{formatDate(c.created_at)}{admin&&c.visibility==='internal'?' · Nội bộ':''}</small></div><p>{c.comment_text}</p></div>)}</div></SectionCard><SectionCard title="Lịch sử"><Timeline events={detail.events||[]}/></SectionCard></div>}

const TICKET_STEPS=[['new','Tiếp nhận'],['in_progress','Đang xử lý'],['waiting_client','Chờ phản hồi'],['resolved','Đã xử lý'],['closed','Đã đóng']] as const;
function TicketWorkflow({status}:{status:string}){const aliases:Record<string,string>={triaged:'new',reopened:'in_progress',rejected:'closed'};const current=aliases[status]||status;const index=Math.max(0,TICKET_STEPS.findIndex(([key])=>key===current));return <div className="ticket-workflow">{TICKET_STEPS.map(([key,label],i)=><div key={key} className={`${i<index?'done ':''}${i===index?'active':''}`}><span>{i+1}</span><small>{label}</small></div>)}</div>}
function TicketActions({admin,detail,reload}:{admin:boolean;detail:any;reload:()=>Promise<void>}){const t=detail.ticket;const [comment,setComment]=useState('');const [status,setStatus]=useState(t.status);const [resolution,setResolution]=useState(t.resolution_note||'');const [saving,setSaving]=useState(false);useEffect(()=>{setStatus(t.status);setResolution(t.resolution_note||'')},[t.id,t.status,t.resolution_note]);const persist=async()=>{if(admin)await api(`/v1/admin/tickets/${t.id}`,{method:'PATCH',body:JSON.stringify({status,resolution_note:resolution})})};const sendComment=async()=>{if(!comment.trim()&&!admin)return;setSaving(true);try{await persist();if(comment.trim()){const base=admin?'/v1/admin/tickets':'/v1/dashboard/tickets';await api(`${base}/${t.id}/comments`,{method:'POST',body:JSON.stringify({comment_text:comment,visibility:'shared'})});setComment('')}await reload()}finally{setSaving(false)}};const update=async()=>{setSaving(true);try{if(admin)await persist();else if(['resolved','closed'].includes(t.status))await api(`/v1/dashboard/tickets/${t.id}`,{method:'PATCH',body:JSON.stringify({status:'reopened'})});await reload()}finally{setSaving(false)}};return <div className="ticket-footer"><div className="comment-composer"><input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Nhập phản hồi..."/><button className="icon-btn primary" disabled={saving} title={admin?'Gửi phản hồi và lưu tiến trình':'Gửi phản hồi'} onClick={sendComment}><Send size={17}/></button></div>{admin?<><select value={status} onChange={e=>setStatus(e.target.value)}><option value="new">1. Tiếp nhận</option><option value="in_progress">2. Đang xử lý</option><option value="waiting_client">3. Chờ phản hồi</option><option value="resolved">4. Đã xử lý</option><option value="closed">5. Đã đóng</option></select><input value={resolution} onChange={e=>setResolution(e.target.value)} placeholder="Kết quả xử lý"/><button className="btn btn-primary" disabled={saving} onClick={update}>{saving?'Đang lưu...':'Lưu tiến trình'}</button></>:['resolved','closed'].includes(t.status)&&<button className="btn btn-secondary" onClick={update}>Mở lại yêu cầu</button>}</div>}

export function ClientsPage(){const {data,loading,error,reload}=useLoad(()=>api<ApiList<Client>>('/v1/admin/clients'),[]);const [selected,setSelected]=useState<Client|null>(null);const [createOpen,setCreateOpen]=useState(false);return <><PageHeader title="Khách hàng" description="Quản lý khách hàng, hợp đồng, gói dịch vụ và trạng thái vận hành." actions={<button className="btn btn-primary" onClick={()=>setCreateOpen(true)}><Plus size={16}/>Thêm khách hàng</button>}/>{loading?<LoadingState/>:error?<ErrorState message={error} retry={reload}/>:<DataTable rows={data?.results||[]} keyOf={r=>String(r.client_id||r.id)} onRowClick={setSelected} columns={[{key:'name',title:'Trường',render:r=><div><strong>{r.display_name}</strong><small className="table-sub mono">{r.client_id||r.id}</small></div>},{key:'status',title:'Trạng thái',render:r=><StatusBadge value={r.status}/>},{key:'plan',title:'Gói',render:r=>r.plan_code||'—'},{key:'province',title:'Tỉnh/TP',render:r=>r.province||'—'},{key:'contract',title:'Hết hạn',render:r=>formatDate(r.contract_end_at)}]}/>}<Drawer open={!!selected} title={selected?.display_name||''} onClose={()=>setSelected(null)}><ClientEditor client={selected} onSaved={reload}/></Drawer><CreateClientModal open={createOpen} onClose={()=>setCreateOpen(false)} onCreated={reload}/></>}

function ClientEditor({client,onSaved}:{client:Client|null;onSaved:()=>void}){
  const [status,setStatus]=useState(client?.status||'active');const [website,setWebsite]=useState(client?.website_url||'');const [notes,setNotes]=useState((client as any)?.notes||'');
  useEffect(()=>{setStatus(client?.status||'active');setWebsite(client?.website_url||'');setNotes((client as any)?.notes||'')},[client]);
  if(!client)return null;const id=client.client_id||client.id;
  const save=async()=>{await api(`/v1/admin/clients/${id}`,{method:'PATCH',body:JSON.stringify({status,website_url:website||null,notes})});onSaved()};
  return <div className="client-editor-stack"><div className="form-grid"><label className="full">Tên trường<input value={client.display_name} readOnly/></label><label>Trạng thái<select value={status} onChange={e=>setStatus(e.target.value)}><option value="trial">Dùng thử</option><option value="active">Hoạt động</option><option value="grace_period">Gia hạn</option><option value="suspended">Tạm dừng</option><option value="terminated">Kết thúc</option></select></label><label>Website trường<input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://ten-truong.edu.vn"/></label><label className="full">Ghi chú<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4}/></label><button className="btn btn-primary" onClick={save}>Lưu thông tin chung</button></div><ClientContactSettings clientId={String(id)}/></div>
}

const CONTACT_TYPES=[['hotline','Số điện thoại'],['email','Email'],['website','Website'],['facebook','Facebook'],['zalo','Zalo'],['address','Địa chỉ']] as const;
function ClientContactSettings({clientId}:{clientId:string}){
  const contacts=useLoad(()=>api<ApiList<any>>(`/v1/admin/clients/${clientId}/contacts`),[clientId]);const [type,setType]=useState('hotline');const [label,setLabel]=useState('Tư vấn tuyển sinh');const [value,setValue]=useState('');
  const add=async()=>{if(!value.trim())return;await api(`/v1/admin/clients/${clientId}/contacts`,{method:'POST',body:JSON.stringify({channel_type:type,label:label||CONTACT_TYPES.find(x=>x[0]===type)?.[1]||type,value:value.trim(),is_primary:1,status:'active'})});setValue('');contacts.reload()};
  const remove=async(id:string)=>{if(!window.confirm('Xóa thông tin liên hệ này?'))return;await api(`/v1/admin/clients/${clientId}/contacts/${id}`,{method:'DELETE'});contacts.reload()};
  return <SectionCard title="Thông tin tư vấn của trường" description="Gateway tự chuyển dữ liệu này vào Dify để trả lời câu hỏi liên hệ và tư vấn."><div className="contact-list">{(contacts.data?.results||[]).map((c:any)=><div className="contact-row" key={c.id}><div><strong>{c.label}</strong><small>{CONTACT_TYPES.find(x=>x[0]===c.channel_type)?.[1]||c.channel_type}: {c.value}</small></div><button className="table-action danger" onClick={()=>remove(c.id)}>Xóa</button></div>)}</div><div className="form-grid contact-create"><label>Loại thông tin<select value={type} onChange={e=>setType(e.target.value)}>{CONTACT_TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Nhãn hiển thị<input value={label} onChange={e=>setLabel(e.target.value)}/></label><label className="full">Giá trị<input value={value} onChange={e=>setValue(e.target.value)} placeholder="Số điện thoại, URL hoặc địa chỉ"/></label><button className="btn btn-secondary" onClick={add}>Thêm thông tin liên hệ</button></div></SectionCard>
}

function CreateClientModal({open,onClose,onCreated}:{open:boolean;onClose:()=>void;onCreated:()=>void}){const [form,setForm]=useState({client_code:'',display_name:'',province:'',website_url:'',status:'trial'});const [saving,setSaving]=useState(false);const [error,setError]=useState('');const submit=async()=>{if(saving)return;setError('');setSaving(true);try{await api('/v1/admin/clients',{method:'POST',body:JSON.stringify({...form,client_code:form.client_code.trim().toLowerCase(),display_name:form.display_name.trim(),province:form.province.trim(),website_url:form.website_url.trim()||null})});onCreated();onClose();setForm({client_code:'',display_name:'',province:'',website_url:'',status:'trial'})}catch(e){setError(e instanceof Error?e.message:'Không thể tạo khách hàng.')}finally{setSaving(false)}};return <Modal open={open} title="Thêm khách hàng" onClose={onClose} actions={<><button className="btn btn-secondary" onClick={onClose} disabled={saving}>Hủy</button><button className="btn btn-primary" onClick={submit} disabled={saving}>{saving?'Đang tạo...':'Tạo khách hàng'}</button></>}><>{error&&<div className="inline-error">{error}</div>}<div className="form-grid"><label>Mã trường<input value={form.client_code} onChange={e=>setForm({...form,client_code:e.target.value.replace(/\s+/g,'').toLowerCase()})} placeholder="cyp"/></label><label>Tên trường<input value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})}/></label><label>Tỉnh/TP<input value={form.province} onChange={e=>setForm({...form,province:e.target.value})}/></label><label>Website<input value={form.website_url} onChange={e=>setForm({...form,website_url:e.target.value})} placeholder="https://ten-truong.edu.vn"/></label></div></></Modal>}


export function AdmissionDataPage(){
  const {clientId,withClient}=useOutletContext<DashboardOutletContext>();
  const [tab,setTab]=useState('rounds');
  const [year,setYear]=useState(String(new Date().getFullYear()));
  const rounds=useLoad(()=>api<ApiList<AdmissionRound>>(withClient(`/v1/admin/admission-rounds?year=${encodeURIComponent(year)}`)),[clientId,year]);
  const benchmarks=useLoad(()=>api<ApiList<AdmissionBenchmark>>(withClient(`/v1/admin/admission-benchmarks?limit=1000&year=${encodeURIComponent(year)}`)),[clientId,year]);
  const [roundForm,setRoundForm]=useState({year:Number(year),round_no:1,round_name:'Đợt 1',status:'upcoming',starts_at:'',ends_at:'',is_current:false});
  const [benchmarkForm,setBenchmarkForm]=useState({year:Number(year),round_no:1,major_code:'',major_name:'',block_code:'B00',method_code:'thpt_quoc_gia',min_score:'',status:'active',source_id:'',note:''});
  useEffect(()=>{setRoundForm(v=>({...v,year:Number(year)}));setBenchmarkForm(v=>({...v,year:Number(year)}));},[year]);
  const saveRound=async()=>{await api(withClient('/v1/admin/admission-rounds'),{method:'POST',body:JSON.stringify({...roundForm,is_current:roundForm.is_current})});rounds.reload()};
  const saveBenchmark=async()=>{await api(withClient('/v1/admin/admission-benchmarks'),{method:'POST',body:JSON.stringify({...benchmarkForm,min_score:Number(benchmarkForm.min_score)})});benchmarks.reload()};
  const deleteBenchmark=async(id:string)=>{if(!confirm('Xóa dữ liệu điểm chuẩn này?'))return;await api(withClient(`/v1/admin/admission-benchmarks/${id}`),{method:'DELETE'});benchmarks.reload()};
  return <><PageHeader title="Dữ liệu tuyển sinh" description="Quản lý năm, đợt tuyển sinh và dữ liệu điểm chuẩn có cấu trúc." actions={<label className="inline-filter">Năm<input type="number" value={year} onChange={e=>setYear(e.target.value)}/></label>}/><Tabs active={tab} onChange={setTab} items={[{key:'rounds',label:'Đợt tuyển sinh'},{key:'benchmarks',label:'Điểm chuẩn có cấu trúc'}]}/>{tab==='rounds'?<div className="two-column"><SectionCard title="Danh sách đợt">{rounds.loading?<LoadingState/>:rounds.error?<ErrorState message={rounds.error} retry={rounds.reload}/>:<DataTable rows={rounds.data?.results||[]} keyOf={r=>r.id} columns={[{key:'round',title:'Đợt',render:r=><div><strong>{r.round_name}</strong><small className="table-sub">Năm {r.year} · #{r.round_no}</small></div>},{key:'status',title:'Trạng thái',render:r=><StatusBadge value={r.status}/>},{key:'period',title:'Thời gian',render:r=><span>{r.starts_at?formatDate(r.starts_at):'—'} → {r.ends_at?formatDate(r.ends_at):'—'}</span>},{key:'current',title:'Đợt hiện hành',render:r=>r.is_current?<span className="tag">Hiện hành</span>:'—'}]}/>}</SectionCard><SectionCard title="Thêm / cập nhật đợt"><div className="form-grid"><label>Năm<input type="number" value={roundForm.year} onChange={e=>setRoundForm({...roundForm,year:Number(e.target.value)})}/></label><label>Số đợt<input type="number" min="1" value={roundForm.round_no} onChange={e=>setRoundForm({...roundForm,round_no:Number(e.target.value),round_name:`Đợt ${e.target.value}`})}/></label><label className="full">Tên đợt<input value={roundForm.round_name} onChange={e=>setRoundForm({...roundForm,round_name:e.target.value})}/></label><label>Trạng thái<select value={roundForm.status} onChange={e=>setRoundForm({...roundForm,status:e.target.value})}><option value="upcoming">Sắp mở</option><option value="open">Đang mở</option><option value="closed">Đã đóng</option><option value="cancelled">Đã hủy</option></select></label><label className="check"><input type="checkbox" checked={roundForm.is_current} onChange={e=>setRoundForm({...roundForm,is_current:e.target.checked})}/>Đợt hiện hành</label><label>Bắt đầu<input type="datetime-local" value={roundForm.starts_at} onChange={e=>setRoundForm({...roundForm,starts_at:e.target.value})}/></label><label>Kết thúc<input type="datetime-local" value={roundForm.ends_at} onChange={e=>setRoundForm({...roundForm,ends_at:e.target.value})}/></label><button className="btn btn-primary full" onClick={saveRound}><Save size={16}/>Lưu đợt tuyển sinh</button></div></SectionCard></div>:<div className="two-column wide-left"><SectionCard title="Danh sách điểm chuẩn">{benchmarks.loading?<LoadingState/>:benchmarks.error?<ErrorState message={benchmarks.error} retry={benchmarks.reload}/>:<DataTable rows={benchmarks.data?.results||[]} keyOf={r=>r.id} columns={[{key:'major',title:'Ngành',render:r=><div><strong>{r.major_name}</strong><small className="table-sub mono">{r.major_code}</small></div>},{key:'context',title:'Năm/Đợt',render:r=>`${r.year} · ${r.round_no===0?'Chung':`Đợt ${r.round_no}`}`},{key:'block',title:'Tổ hợp',render:r=>r.block_code},{key:'score',title:'Điểm',render:r=><b>{r.min_score}</b>},{key:'status',title:'Trạng thái',render:r=><StatusBadge value={r.status}/>},{key:'source',title:'Nguồn',render:r=><span className="mono">{r.source_id||'—'}</span>},{key:'actions',title:'',render:r=><button className="icon-btn danger" title="Xóa" onClick={e=>{e.stopPropagation();deleteBenchmark(r.id)}}><Trash2 size={16}/></button>} ]}/>}</SectionCard><SectionCard title="Thêm / cập nhật điểm chuẩn"><div className="form-grid"><label>Năm<input type="number" value={benchmarkForm.year} onChange={e=>setBenchmarkForm({...benchmarkForm,year:Number(e.target.value)})}/></label><label>Đợt<input type="number" min="0" value={benchmarkForm.round_no} onChange={e=>setBenchmarkForm({...benchmarkForm,round_no:Number(e.target.value)})}/></label><label>Mã ngành<input value={benchmarkForm.major_code} onChange={e=>setBenchmarkForm({...benchmarkForm,major_code:e.target.value})}/></label><label>Tên ngành<input value={benchmarkForm.major_name} onChange={e=>setBenchmarkForm({...benchmarkForm,major_name:e.target.value})}/></label><label>Tổ hợp<input value={benchmarkForm.block_code} onChange={e=>setBenchmarkForm({...benchmarkForm,block_code:e.target.value.toUpperCase()})}/></label><label>Phương thức<input value={benchmarkForm.method_code} onChange={e=>setBenchmarkForm({...benchmarkForm,method_code:e.target.value})}/></label><label>Điểm tối thiểu<input type="number" step="0.01" value={benchmarkForm.min_score} onChange={e=>setBenchmarkForm({...benchmarkForm,min_score:e.target.value})}/></label><label>Trạng thái<select value={benchmarkForm.status} onChange={e=>setBenchmarkForm({...benchmarkForm,status:e.target.value})}><option value="active">Hoạt động</option><option value="inactive">Không hoạt động</option><option value="archived">Đã lưu trữ</option></select></label><label className="full">Source ID<input value={benchmarkForm.source_id} onChange={e=>setBenchmarkForm({...benchmarkForm,source_id:e.target.value})} placeholder="Mã nguồn tài liệu"/></label><label className="full">Ghi chú<textarea rows={3} value={benchmarkForm.note} onChange={e=>setBenchmarkForm({...benchmarkForm,note:e.target.value})}/></label><button className="btn btn-primary full" onClick={saveBenchmark}><Save size={16}/>Lưu điểm chuẩn</button></div></SectionCard></div>}</>;
}

function KbConflictsPanel({clientId,withClient}:{clientId:string;withClient:(path:string)=>string}){
  const conflicts=useLoad(()=>api<ApiList<any>>(withClient('/v1/admin/kb/conflicts?limit=500')),[clientId]);
  const resolve=async(row:any,status:'resolved_manual'|'dismissed'|'open')=>{
    const sources=Array.isArray(row.source_ids)?row.source_ids.map(String):[];
    let preferred:string|null=null;
    if(status==='resolved_manual'){
      preferred=window.prompt(`Chọn source_id được ưu tiên:\n${sources.join('\n')}`,row.preferred_source_id||sources[0]||'');
      if(!preferred)return;
    }
    const note=status==='open'?null:window.prompt('Ghi chú quyết định (khuyến nghị nhập căn cứ hiệu lực/ưu tiên):',row.resolution_note||'');
    if(status!=='open'&&note===null)return;
    await api(withClient(`/v1/admin/kb/conflicts/${encodeURIComponent(row.id)}`),{method:'PATCH',body:JSON.stringify({resolution_status:status,preferred_source_id:preferred,resolution_note:note})});
    conflicts.reload();
  };
  return <SectionCard title="Xung đột tri thức" description="Các claim cùng khóa nhưng khác giá trị. Quyết định thủ công được lưu bền vững và không bị resolver tự động ghi đè.">
    {conflicts.loading?<LoadingState/>:conflicts.error?<ErrorState message={conflicts.error} retry={conflicts.reload}/>:<DataTable rows={conflicts.data?.results||[]} keyOf={(r:any)=>r.id} columns={[
      {key:'claim',title:'Claim',render:(r:any)=><div><strong className="mono">{r.claim_key}</strong><small className="table-sub">{(r.source_ids||[]).join(' ↔ ')}</small></div>},
      {key:'status',title:'Trạng thái',render:(r:any)=><StatusBadge value={r.resolution_status}/>},
      {key:'preferred',title:'Nguồn ưu tiên',render:(r:any)=><span className="mono">{r.preferred_source_id||'Chưa quyết định'}</span>},
      {key:'time',title:'Cập nhật',render:(r:any)=>formatDate(r.updated_at)},
      {key:'actions',title:'Xử lý',render:(r:any)=><div className="button-row"><button className="table-action" onClick={()=>resolve(r,'resolved_manual')}>Chọn nguồn</button><button className="table-action" onClick={()=>resolve(r,'dismissed')}>Bỏ qua</button>{r.resolution_status!=='open'&&<button className="table-action" onClick={()=>resolve(r,'open')}>Mở lại</button>}</div>}
    ]}/>} 
  </SectionCard>;
}

export function KnowledgeBasePage(){const {clientId,withClient}=useOutletContext<DashboardOutletContext>();const [tab,setTab]=useState('documents');const [group,setGroup]=useState('');const [selected,setSelected]=useState<KbDocument|null>(null);const docs=useLoad(()=>api<ApiList<KbDocument>>(withClient(`/v1/admin/kb/documents?limit=500${group?`&knowledge_group=${group}`:''}`)),[clientId,group]);const datasets=useLoad(()=>api<ApiList<any>>(withClient('/v1/admin/kb/datasets')),[clientId]);const sync=async()=>{await api(withClient('/v1/admin/kb/sync'),{method:'POST',body:JSON.stringify({})});docs.reload();datasets.reload()};return <><PageHeader title="Kho tri thức" description="Quản lý tài liệu đang có trên Dify; xem metadata ở chế độ chỉ đọc, bật/tắt tài liệu và xem các đoạn nội dung theo source_id." actions={<button className="btn btn-primary" onClick={sync}><RefreshCw size={16}/>Đồng bộ ngay</button>}/><Tabs active={tab} onChange={setTab} items={[{key:'documents',label:'Tài liệu'},{key:'datasets',label:'Nguồn dữ liệu'},{key:'conflicts',label:'Xung đột'},{key:'validation',label:'Kiểm tra thông tin'},{key:'deleted',label:'Đã xóa'}]}/>{tab==='conflicts'?<KbConflictsPanel clientId={clientId} withClient={withClient}/>:tab==='datasets'?<SectionCard title="Nguồn dữ liệu đã kết nối">{datasets.loading?<LoadingState/>:<DataTable rows={datasets.data?.results||[]} keyOf={(r:any)=>r.id} columns={[{key:'name',title:'Nguồn dữ liệu',render:(r:any)=><div><strong>{r.dataset_name}</strong><small className="table-sub mono">{r.dify_dataset_id}</small></div>},{key:'sync',title:'Đồng bộ',render:(r:any)=><StatusBadge value={r.last_sync_status||'pending'}/>},{key:'time',title:'Lần cuối',render:(r:any)=>formatDate(r.last_synced_at)},{key:'interval',title:'Chu kỳ',render:(r:any)=>`${r.sync_interval_minutes} phút`}]}/>}</SectionCard>:<><Toolbar><select value={group} onChange={e=>setGroup(e.target.value)}><option value="">Tất cả nhóm nội dung</option>{['admission','tuition','major','academic','exam','graduation','clinical','online_learning','student_policy','campus','contact','legal_policy'].map(x=><option key={x} value={x}>{knowledgeGroupLabel(x)}</option>)}</select></Toolbar>{docs.loading?<LoadingState/>:docs.error?<ErrorState message={docs.error} retry={docs.reload}/>:<DataTable rows={(docs.data?.results||[]).filter(r=>tab==='deleted'?r.sync_status==='deleted':tab==='validation'?r.metadata_check_status!=='valid':r.sync_status!=='deleted')} keyOf={r=>r.id} onRowClick={setSelected} columns={[{key:'doc',title:'Tài liệu',render:r=><div><strong>{shortText(r.document_name,60)}</strong><small className="table-sub mono">{r.source_id||'Thiếu source_id'}{r.dify_document_id?` · Dify: ${r.dify_document_id}`:''}</small></div>},{key:'group',title:'Nhóm nội dung',render:r=><span className="tag">{r.knowledge_group||'—'}</span>},{key:'year',title:'Năm/Đợt',render:r=>r.year?`${r.year}${r.round_no!=null?` · Đợt ${r.round_no}`:''}`:'—'},{key:'status',title:'Trạng thái tài liệu',render:r=><StatusBadge value={r.actual_status}/>},{key:'index',title:'Lập chỉ mục',render:r=><StatusBadge value={r.indexing_status}/>},{key:'metadata',title:'Thông tin mô tả',render:r=><StatusBadge value={r.metadata_check_status}/>},{key:'chunks',title:'Số đoạn',render:r=>r.chunk_count??0},{key:'sync',title:'Đồng bộ',render:r=><StatusBadge value={r.sync_status}/>} ]}/>}</>}<Drawer open={!!selected} title={selected?.document_name||''} onClose={()=>setSelected(null)}><KbDocumentEditor document={selected} onSaved={docs.reload} onDeleted={()=>{setSelected(null);docs.reload()}}/></Drawer></>}

function KbDocumentEditor({document,onSaved,onDeleted}:{document:KbDocument|null;onSaved:()=>void;onDeleted:()=>void}){
  const [deleting,setDeleting]=useState(false);
  const [chunkPage,setChunkPage]=useState(1);
  useEffect(()=>setChunkPage(1),[document?.id]);
  const sourceDetail=useLoad(()=>document?.source_id?api<any>(`/v1/admin/kb/sources/${encodeURIComponent(document.source_id)}?client_id=${document.client_id}&segment_page=${chunkPage}&segment_page_size=100`):Promise.resolve(null),[document?.source_id,document?.client_id,chunkPage]);
  if(!document)return null;
  const status=async(action:'enable'|'disable')=>{await api(`/v1/admin/kb/documents/${document.id}/status?client_id=${document.client_id}`,{method:'PATCH',body:JSON.stringify({action})});onSaved()};
  const remove=async(mode:'remove_from_kb'|'permanent')=>{
    const expected=document.source_id||document.document_name;
    const actionText=mode==='permanent'?'Xóa vĩnh viễn khỏi Dify, R2 và registry':'Gỡ khỏi Dify KB nhưng giữ file gốc và preview trên R2';
    const confirmation=window.prompt(`${actionText}. Nhập chính xác mã nguồn sau để xác nhận:\n\n${expected}`,'');
    if(confirmation===null)return;
    if(confirmation.trim()!==expected){window.alert('Mã xác nhận không khớp. Tài liệu chưa bị xóa.');return;}
    setDeleting(true);
    try{await api(`/v1/admin/kb/documents/${document.id}?client_id=${document.client_id}`,{method:'DELETE',body:JSON.stringify({confirmation:confirmation.trim(),mode})});onDeleted();}
    finally{setDeleting(false);}
  };
  const source=sourceDetail.data?.source;
  const manifestChunks=sourceDetail.data?.chunks||[];
  const difyChunks=sourceDetail.data?.dify_chunks||[];
  const chunks=difyChunks.length?difyChunks:manifestChunks;
  const canManage=Boolean(document.dify_document_id)&&!String(document.id).startsWith('manifest:');
  const difyMetadata=sourceDetail.data?.dify_metadata||safeParseJson(document.metadata_json);
  const metadataEntries=Object.entries(difyMetadata||{}).filter(([,value])=>value!==null&&value!==undefined&&String(value).trim()!=='');
  return <div className="form-grid">
    <div className="full button-row">
      {canManage?<>
        <button className="btn btn-secondary" onClick={()=>status('enable')}>Bật</button>
        <button className="btn btn-secondary" onClick={()=>status('disable')}>Tắt</button>
        <button className="btn btn-secondary" disabled={deleting} onClick={()=>remove('remove_from_kb')}><Trash2 size={16}/>{deleting?'Đang xử lý...':'Gỡ khỏi KB'}</button>
        <button className="btn btn-danger" disabled={deleting} onClick={()=>remove('permanent')}><Trash2 size={16}/>Xóa vĩnh viễn</button>
      </>:<span className="field-hint">Tài liệu chưa có Dify document ID nên chưa thể thao tác trạng thái.</span>}
    </div>
    <div className="full snapshot">
      <h3>Metadata trên Dify — chỉ đọc</h3>
      {metadataEntries.length?<div className="metadata-readonly-grid">{metadataEntries.map(([key,value])=><div key={key}><small>{key}</small><strong>{typeof value==='object'?JSON.stringify(value):String(value)}</strong></div>)}</div>:<p>Chưa có metadata từ Dify.</p>}
      {sourceDetail.data?.dify_document_error&&<small className="error-text">Không đọc được metadata trực tiếp từ Dify, đang hiển thị bản đồng bộ gần nhất: {sourceDetail.data.dify_document_error}</small>}
    </div>
    <div className="full">
      <h3>Nội dung đã chuẩn bị từ pipeline</h3>
      {sourceDetail.loading?<LoadingState/>:sourceDetail.error?<p className="error-text">Chưa đồng bộ citation manifest: {sourceDetail.error}</p>:source?<>
        <div className="snapshot">
          <p><b>Document ID:</b> <span className="mono">{source.document_id}</span></p>
          <p><b>Phiên bản:</b> {source.version||'—'} · <b>Ngôn ngữ:</b> {source.language||'—'} · <b>Hiển thị:</b> {source.visibility||'—'}</p>
          <p><b>File gốc R2:</b> <span className="mono">{source.r2_original_key}</span></p>
          <p><b>Bản xem trước:</b> <span className="mono">{source.r2_preview_key||'Chưa có'}</span></p><p><b>Trạng thái preview:</b> {source.preview_status||'—'} · <b>Loại:</b> {source.preview_type||source.preview_mime_type||'—'}</p>
          <div className="button-row">{source.preview_url&&<a className="btn btn-secondary" href={source.preview_url} target="_blank" rel="noreferrer">Xem tài liệu</a>}</div>
          <p><b>Số đoạn:</b> {chunks.length} · <b>Nguồn đoạn:</b> {difyChunks.length?'Dify trực tiếp':'Manifest đã đồng bộ'}{source.dify_document_id?<> · <b>Dify document:</b> <span className="mono">{source.dify_document_id}</span></>:null}</p>
        </div>
        <div className="source-list">{chunks.map((c:any)=><div key={c.chunk_id}><FileCheck2 size={18}/><div><strong>{c.section_title||c.chunk_id}</strong><small>Trang {c.page_start??'—'}{c.page_end&&c.page_end!==c.page_start?`–${c.page_end}`:''}</small><p>{c.snippet||'—'}</p></div></div>)}</div>
        {sourceDetail.data?.dify_chunk_error&&<small className="error-text">Không đọc được chunks trực tiếp từ Dify, đang hiển thị manifest: {sourceDetail.data.dify_chunk_error}</small>}
        {difyChunks.length>0&&<div className="button-row"><button className="btn btn-secondary" disabled={chunkPage<=1} onClick={()=>setChunkPage(p=>Math.max(1,p-1))}>Trang trước</button><span className="field-hint">Trang chunks {chunkPage}</span><button className="btn btn-secondary" disabled={!sourceDetail.data?.segment_pagination?.has_more} onClick={()=>setChunkPage(p=>p+1)}>Trang sau</button></div>}
      </>:<p>Chưa có manifest.</p>}
    </div>
  </div>;
}

export function ChatbotOperationsPage(){
  const {clientId,withClient}=useOutletContext<DashboardOutletContext>();
  const details=useLoad(async()=>{
    const [client,secret,knowledgeSecret]=await Promise.all([
      api<any>(withClient(`/v1/admin/clients/${clientId}`)),
      api<any>(`/v1/admin/clients/${clientId}/chat-runtime-secret`),
      api<any>(`/v1/admin/clients/${clientId}/knowledge-api-secret`)
    ]);
    return {client,secret,knowledgeSecret};
  },[clientId]);
  if(details.loading)return <LoadingState/>;
  if(details.error)return <ErrorState message={details.error} retry={details.reload}/>;
  const data=details.data?.client||{};
  const c=data.client||{};
  const runtime=data.runtime||{};
  const chatbotFeature=(data.features||[]).find((f:any)=>f.feature_key==='chatbot');
  const runtimeReady=Boolean(details.data?.secret?.configured&&runtime.dify_base_url&&Number(chatbotFeature?.is_enabled)!==0&&['active','trial','grace_period'].includes(c.status));
  return <>
    <PageHeader title="Vận hành Chatbot" description="Cấu hình, kiểm tra và bật chatbot cho từng khách hàng ngay trên Dashboard." actions={<button className="btn btn-secondary" onClick={details.reload}><RefreshCw size={16}/>Làm mới</button>}/>
    <div className="metrics-grid">
      <MetricCard label="Khách hàng" value={c.display_name||clientId}/>
      <MetricCard label="Trạng thái khách hàng" value={c.status||'—'} tone="green"/>
      <MetricCard label="Kết nối chatbot" value={runtimeReady?'Sẵn sàng':'Chưa hoàn tất'} tone={runtimeReady?'green':'orange'}/>
      <MetricCard label="Phiên bản vận hành" value={data.runtime_version||runtime.runtime_version||1}/>
      <MetricCard label="Giới hạn câu hỏi" value={data.subscription?.monthly_question_limit||0} tone="purple"/>
    </div>
    <ChatRuntimeEditor key={clientId} clientId={clientId} data={data} secret={details.data?.secret} knowledgeSecret={details.data?.knowledgeSecret} onSaved={details.reload}/>
    <FeatureFlagsEditor key={`features-${clientId}`} clientId={clientId} features={data.features||[]} onSaved={details.reload}/>
  </>;
}


function ChatRuntimeEditor({clientId,data,secret,knowledgeSecret,onSaved}:{clientId:string;data:any;secret:any;knowledgeSecret:any;onSaved:()=>void}){
  const runtime=data.runtime||{};
  const chatbot=(data.features||[]).find((f:any)=>f.feature_key==='chatbot');
  const [tenantStatus,setTenantStatus]=useState(data.client?.status||'trial');
  const [chatbotEnabled,setChatbotEnabled]=useState(Number(chatbot?.is_enabled)!==0);
  const [gatewayBaseUrl,setGatewayBaseUrl]=useState(runtime.gateway_base_url||'');
  const [difyBaseUrl,setDifyBaseUrl]=useState(runtime.dify_base_url||'https://api.dify.ai/v1');
  const [difyAppId,setDifyAppId]=useState(runtime.dify_app_id||'');
  const [workflowVersion,setWorkflowVersion]=useState(runtime.dify_workflow_version||'');
  const [maintenanceMessage,setMaintenanceMessage]=useState(runtime.maintenance_message||'Dịch vụ hiện đang tạm ngừng. Vui lòng thử lại sau.');
  const [apiKey,setApiKey]=useState('');
  const [knowledgeApiKey,setKnowledgeApiKey]=useState('');
  const [knowledgeDatasetId,setKnowledgeDatasetId]=useState(knowledgeSecret?.default_dataset_id||'');
  const [knowledgeDatasetName,setKnowledgeDatasetName]=useState(knowledgeSecret?.default_dataset_name||'');
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const run=async(action:()=>Promise<any>,success:string)=>{setSaving(true);setError('');setMessage('');try{const result=await action();setMessage(result?.message||success);onSaved();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setSaving(false)}};
  const save=()=>run(async()=>{
    await api(`/v1/admin/clients/${clientId}`,{method:'PATCH',body:JSON.stringify({status:tenantStatus})});
    await api(`/v1/admin/clients/${clientId}/config`,{method:'PATCH',body:JSON.stringify({gateway_base_url:gatewayBaseUrl||null,dify_base_url:difyBaseUrl,dify_app_id:difyAppId||null,dify_workflow_version:workflowVersion||null,maintenance_message:maintenanceMessage,dify_api_key:apiKey.trim()||undefined})});
    if(knowledgeApiKey.trim()||knowledgeDatasetId.trim()||knowledgeSecret?.configured)await api(`/v1/admin/clients/${clientId}/knowledge-api-secret`,{method:'PUT',body:JSON.stringify({dify_knowledge_api_key:knowledgeApiKey.trim()||undefined,default_dataset_id:knowledgeDatasetId.trim()||null,default_dataset_name:knowledgeDatasetName.trim()||null})});
    await api(`/v1/admin/clients/${clientId}/features`,{method:'PATCH',body:JSON.stringify({feature_key:'chatbot',is_enabled:chatbotEnabled,config:safeParseJson(chatbot?.config_json)})});
    setApiKey('');setKnowledgeApiKey('');
    return {message:'Đã lưu cấu hình chatbot.'};
  },'Đã lưu cấu hình chatbot.');
  const test=()=>run(()=>api(`/v1/admin/clients/${clientId}/chat-runtime/test`,{method:'POST',body:JSON.stringify({})}),'Kết nối chatbot thành công.');
  const activate=()=>run(()=>api(`/v1/admin/clients/${clientId}/chat-runtime/activate`,{method:'POST',body:JSON.stringify({})}),'Chatbot đã sẵn sàng hoạt động.');
  const testKnowledge=()=>run(()=>api(`/v1/admin/clients/${clientId}/knowledge-api-secret/test`,{method:'POST',body:JSON.stringify({})}),'Kết nối Dify Knowledge API thành công.');
  const removeKey=()=>{if(!window.confirm('Xóa khóa truy cập chatbot của khách hàng này?'))return;run(()=>api(`/v1/admin/clients/${clientId}/chat-runtime-secret`,{method:'DELETE'}),'Đã xóa khóa truy cập chatbot.');};
  const removeKnowledgeKey=()=>{if(!window.confirm('Xóa Dify Knowledge API Key của khách hàng này? Tính năng đồng bộ, bật/tắt tài liệu sẽ tạm ngừng.'))return;run(()=>api(`/v1/admin/clients/${clientId}/knowledge-api-secret`,{method:'DELETE'}),'Đã xóa Dify Knowledge API Key.');};
  return <SectionCard title="Kết nối và trạng thái chatbot" description="Mỗi khách hàng có cấu hình riêng. Khóa truy cập được mã hóa và không hiển thị lại sau khi lưu.">
    <div className="form-grid runtime-form">
      <label>Trạng thái khách hàng<select value={tenantStatus} onChange={e=>setTenantStatus(e.target.value)}><option value="trial">Dùng thử</option><option value="active">Hoạt động</option><option value="grace_period">Gia hạn</option><option value="suspended">Tạm dừng</option><option value="terminated">Kết thúc</option></select></label>
      <label className="check runtime-check"><input type="checkbox" checked={chatbotEnabled} onChange={e=>setChatbotEnabled(e.target.checked)}/>Cho phép chatbot hoạt động</label>
      <label className="full">Địa chỉ máy chủ Dify<input value={difyBaseUrl} onChange={e=>setDifyBaseUrl(e.target.value)} placeholder="https://dify.example.com/v1"/></label>
      <label>Mã ứng dụng Dify<input value={difyAppId} onChange={e=>setDifyAppId(e.target.value)} placeholder="Mã ứng dụng nếu có"/></label>
      <label>Phiên bản quy trình<input value={workflowVersion} onChange={e=>setWorkflowVersion(e.target.value)} placeholder="Ví dụ: CYP_Admissions_v1"/></label>
      <label className="full">Địa chỉ cổng kết nối<input value={gatewayBaseUrl} onChange={e=>setGatewayBaseUrl(e.target.value)} placeholder="https://gateway.synotech.io.vn"/></label>
      <label className="full">Dify App API Key — dùng cho chatbot<input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={secret?.configured?'Đã có khóa — chỉ nhập khi muốn thay đổi':'Nhập App API Key của ứng dụng Dify'}/><small className="field-hint">Dùng để gửi câu hỏi tới workflow chatbot. Trạng thái: {secret?.configured?'Đã cấu hình':'Chưa cấu hình'}.</small></label>
      <label className="full">Dify Knowledge API Key — dùng cho Kho tri thức<input type="password" value={knowledgeApiKey} onChange={e=>setKnowledgeApiKey(e.target.value)} placeholder={knowledgeSecret?.configured?'Đã có khóa — chỉ nhập khi muốn thay đổi':'Nhập Knowledge API Key của Dify'}/><small className="field-hint">Dùng để đồng bộ chunks và bật, tắt hoặc lưu trữ tài liệu trên Dify. Lấy tại Dify → API Access của Knowledge/Dataset. Trạng thái: {knowledgeSecret?.configured?'Đã cấu hình':'Chưa cấu hình'}.</small></label><label>Dify Knowledge Base ID mặc định<input value={knowledgeDatasetId} onChange={e=>setKnowledgeDatasetId(e.target.value)} placeholder="UUID của Knowledge Base/Dataset"/><small className="field-hint">Dùng làm Knowledge Base mặc định. Mỗi tài liệu vẫn giữ dataset ID riêng nên hệ thống hỗ trợ nhiều Knowledge Base.</small></label><label>Tên Knowledge Base mặc định<input value={knowledgeDatasetName} onChange={e=>setKnowledgeDatasetName(e.target.value)} placeholder="Ví dụ: CYP Admissions KB"/></label>
      <label className="full">Thông báo khi tạm dừng<textarea rows={3} value={maintenanceMessage} onChange={e=>setMaintenanceMessage(e.target.value)}/></label>
      {message&&<div className="success-message full">{message}</div>}{error&&<div className="form-error full">{error}</div>}
      <div className="button-row full"><button className="btn btn-primary" disabled={saving} onClick={save}><Save size={16}/>Lưu cấu hình</button><button className="btn btn-secondary" disabled={saving} onClick={test}><RefreshCw size={16}/>Kiểm tra chatbot</button><button className="btn btn-secondary" disabled={saving||!knowledgeSecret?.configured} onClick={testKnowledge}><Database size={16}/>Kiểm tra Kho tri thức</button><button className="btn btn-secondary" disabled={saving} onClick={activate}><Bot size={16}/>Kích hoạt chatbot</button>{secret?.configured&&<button className="btn btn-danger" disabled={saving} onClick={removeKey}><Trash2 size={16}/>Xóa App API Key</button>}{knowledgeSecret?.configured&&<button className="btn btn-danger" disabled={saving} onClick={removeKnowledgeKey}><Trash2 size={16}/>Xóa Knowledge API Key</button>}</div>
    </div>
  </SectionCard>;
}

function FeatureFlagsEditor({clientId,features,onSaved}:{clientId:string;features:any[];onSaved:()=>void}){
  const [rows,setRows]=useState(()=>features.map(f=>({...f,is_enabled:Number(f.is_enabled)!==0})));
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const save=async()=>{setSaving(true);setMessage('');try{await api(`/v1/admin/clients/${clientId}/features`,{method:'PATCH',body:JSON.stringify({features:rows.map(f=>({feature_key:f.feature_key,is_enabled:f.is_enabled,config:safeParseJson(f.config_json)}))})});setMessage('Đã cập nhật trạng thái tính năng.');onSaved();}finally{setSaving(false)}};
  return <SectionCard title="Tính năng theo khách hàng" description="Bật hoặc tắt từng chức năng cho khách hàng đang chọn." action={<button className="btn btn-primary" disabled={saving} onClick={save}><Save size={16}/>Lưu trạng thái</button>}><div className="feature-grid editable-features">{rows.map((f,index)=><label key={f.feature_key}><span>{featureLabel(f.feature_key)}</span><input type="checkbox" checked={f.is_enabled} onChange={e=>setRows(current=>current.map((row,i)=>i===index?{...row,is_enabled:e.target.checked}:row))}/></label>)}</div>{message&&<div className="success-message feature-message">{message}</div>}</SectionCard>;
}

function safeParseJson(value:any){if(!value)return{};if(typeof value==='object')return value;try{return JSON.parse(String(value))}catch{return{}}}

export function LeadsPage(){
  const {withClient}=useOutletContext<DashboardOutletContext>();
  const [params,setParams]=useSearchParams();
  const [page,setPage]=useState(1);
  const [search,setSearch]=useState('');
  const pageSize=20;
  const {data,loading,error,reload}=useLoad(()=>api<any>(withClient(`/v1/dashboard/leads?page=${page}&page_size=${pageSize}${search?`&q=${encodeURIComponent(search)}`:''}`)),[page,search]);
  const [selected,setSelected]=useState<Lead|null>(null);
  useEffect(()=>{setPage(1)},[search]);
  useEffect(()=>{
    const target=params.get('lead_id');
    if(!target)return;
    let cancelled=false;
    const clearTarget=()=>{const next=new URLSearchParams(params);next.delete('lead_id');setParams(next,{replace:true});};
    const found=((data?.results||[]) as Lead[]).find(item=>item.id===target);
    if(found){setSelected(found);clearTarget();return;}
    api<{success:boolean;item:Lead}>(`/v1/dashboard/leads/${encodeURIComponent(target)}`).then(r=>{
      if(!cancelled&&r.item)setSelected(r.item);
    }).catch(()=>{}).finally(()=>{if(!cancelled)clearTarget()});
    return()=>{cancelled=true};
  },[data,params,setParams]);
  const update=async(status:string)=>{if(!selected)return;await api(`/v1/dashboard/leads/${selected.id}`,{method:'PATCH',body:JSON.stringify({lead_status:status})});setSelected(null);reload()};
  return <>
    <PageHeader title="Tư vấn trực tiếp" description="Theo dõi đầy đủ từng lượt thí sinh yêu cầu nhà trường tư vấn; hệ thống không ghi đè hoặc tự xóa yêu cầu." actions={<button className="btn btn-secondary" onClick={()=>download('/v1/dashboard/export?type=leads&format=xlsx','leads.xls')}><Download size={16}/>Xuất Excel</button>}/>
    <Toolbar search={search} onSearch={setSearch}/>
    {loading?<LoadingState/>:error?<ErrorState message={error} retry={reload}/>:<>
      <DataTable rows={data?.results||[]} keyOf={(r:Lead)=>r.id} onRowClick={setSelected} columns={[
        {key:'name',title:'Họ tên',render:(r:Lead)=><b>{r.full_name||'Chưa cung cấp'}</b>},
        {key:'contact',title:'Liên hệ',render:(r:Lead)=><div>{r.phone||'—'}<small className="table-sub">{r.email||''}</small></div>},
        {key:'major',title:'Ngành quan tâm',render:(r:Lead)=>r.interested_major||'—'},
        {key:'province',title:'Tỉnh/TP',render:(r:Lead)=>r.province||'—'},
        {key:'status',title:'Trạng thái',render:(r:Lead)=><StatusBadge value={r.lead_status}/>},
        {key:'time',title:'Thời gian',render:(r:Lead)=>formatDate(r.created_at)}
      ]}/>
      <div className="list-summary">Tổng cộng {Number(data?.total||0)} lead · Trang {Number(data?.page||1)}/{Number(data?.total_pages||1)}</div>
      <Pagination page={Number(data?.page||1)} totalPages={Number(data?.total_pages||1)} onChange={setPage}/>
    </>}
    <Drawer open={!!selected} title={selected?.full_name||'Tư vấn trực tiếp'} onClose={()=>setSelected(null)} footer={<div className="button-row"><button className="btn btn-primary" onClick={()=>update('contacted')}>Đã liên hệ</button><button className="btn btn-secondary" onClick={()=>update('qualified')}>Tiềm năng</button><button className="btn btn-secondary" onClick={()=>update('enrolled')}>Đã nhập học</button></div>}>
      <div className="detail-list"><div><span>Số điện thoại</span><b>{selected?.phone||'—'}</b></div><div><span>Email</span><b>{selected?.email||'—'}</b></div><div><span>Ngành quan tâm</span><b>{selected?.interested_major||'—'}</b></div><div><span>Trạng thái</span><StatusBadge value={selected?.lead_status}/></div></div>
    </Drawer>
  </>;
}

export function ReportsPage(){
  const {withClient}=useOutletContext<DashboardOutletContext>();
  const [selectedFeedback,setSelectedFeedback]=useState<any|null>(null);
  const {data,loading,error,reload}=useLoad(async()=>{const [report,feedback]=await Promise.all([api<any>(withClient('/v1/dashboard/reports/overview?limit=60')),api<any>(withClient('/v1/dashboard/feedback/summary?limit=12'))]);return{...report,feedback}},[]);
  if(loading)return <LoadingState/>;if(error)return <ErrorState message={error} retry={reload}/>;
  const overview=data?.feedback?.overview||{};
  const chartRows=(data?.feedback?.topics||[]).map((r:any)=>({label:topicLabel(r.topic),questions:Number(r.question_count||0),likes:Number(r.like_count||0),dislikes:Number(r.dislike_count||0)}));
  return <><PageHeader title="Báo cáo" description="Phân tích số lượng câu hỏi, mức độ hài lòng và các yêu cầu cần xử lý." actions={<div className="button-row"><button className="btn btn-secondary" onClick={()=>download('/v1/dashboard/export?type=daily-analytics&format=xlsx','bao-cao-hoat-dong.xls')}><Download size={16}/>Xuất báo cáo hoạt động</button><button className="btn btn-secondary" onClick={()=>download('/v1/dashboard/export?type=leads&format=xlsx','khach-hang-tiem-nang.xls')}><Download size={16}/>Xuất khách hàng tiềm năng</button><button className="btn btn-secondary" onClick={()=>download('/v1/dashboard/export?type=feedback&format=xlsx','phan-hoi-chatbot.xls')}><Download size={16}/>Xuất phản hồi chatbot</button></div>}/>
  <div className="metrics-grid"><MetricCard label="Tổng lượt đánh giá" value={overview.feedback_count||0}/><MetricCard label="Hài lòng" value={overview.like_count||0} tone="green"/><MetricCard label="Không hài lòng" value={overview.dislike_count||0} tone="red"/><MetricCard label="Tỷ lệ hài lòng" value={overview.satisfaction_rate==null?'Chưa có':`${overview.satisfaction_rate}%`} tone="orange"/><MetricCard label="Chưa xem xét" value={overview.unreviewed_dislike_count||0} tone="red"/></div>
  <SectionCard title="Câu hỏi và mức độ hài lòng theo chủ đề" description="So sánh số câu hỏi, lượt hài lòng và không hài lòng của từng chủ đề."><TopicFeedbackChart data={chartRows}/></SectionCard>
  <div className="two-column"><SectionCard title="Câu hỏi theo ngày"><MiniBarChart data={(data?.daily||[]).slice(0,14).reverse().map((r:any)=>({label:String(r.day).slice(5),value:Number(r.valid_question_count||0)}))}/></SectionCard><SectionCard title="Yêu cầu theo trạng thái"><DataTable rows={data?.tickets||[]} keyOf={(r:any)=>`${r.status}-${r.priority}`} columns={[{key:'status',title:'Trạng thái',render:(r:any)=><StatusBadge value={r.status}/>},{key:'priority',title:'Mức độ',render:(r:any)=><StatusBadge value={r.priority}/>},{key:'count',title:'Số lượng',render:(r:any)=>r.ticket_count}]}/></SectionCard></div>
  <SectionCard title="Phản hồi không hài lòng gần đây" description="Bấm vào từng dòng để xem câu hỏi, câu trả lời và kết quả xem xét."><DataTable rows={data?.feedback?.recent_negative||[]} keyOf={(r:any)=>r.id} onRowClick={setSelectedFeedback} columns={[{key:'q',title:'Câu hỏi',render:(r:any)=>shortText(r.question_text,85)},{key:'topic',title:'Chủ đề',render:(r:any)=>topicLabel(r.topic)},{key:'reason',title:'Lý do người dùng chọn',render:(r:any)=>issueTypeLabel(r.issue_type)},{key:'review',title:'Kết quả xem xét',render:(r:any)=>feedbackReviewStatusLabel(r.review_status)},{key:'time',title:'Thời gian',render:(r:any)=>formatDate(r.created_at)}]}/></SectionCard>
  <Drawer open={!!selectedFeedback} title="Chi tiết phản hồi không hài lòng" onClose={()=>setSelectedFeedback(null)}>
    {selectedFeedback&&<><div className="feedback-pair"><div><strong>Câu hỏi của người dùng</strong><div className="feedback-text">{selectedFeedback.question_text||'—'}</div></div><div><strong>Câu trả lời của chatbot</strong><div className="feedback-text">{selectedFeedback.answer_text||'—'}</div></div></div><div className="feedback-session-link"><div><span>Mã phiên hội thoại</span><strong className="mono">{selectedFeedback.conversation_session_id||selectedFeedback.session_id||'—'}</strong></div>{(selectedFeedback.conversation_session_id||selectedFeedback.session_id)&&<a className="btn btn-secondary" href={`/client/conversations?q=${encodeURIComponent(selectedFeedback.conversation_session_id||selectedFeedback.session_id)}`}><MessageSquareText size={16}/>Mở toàn bộ hội thoại</a>}</div><div className="feedback-summary-grid"><div className="feedback-summary-item"><span>Nhóm nội dung</span><strong>{knowledgeGroupLabel(selectedFeedback.knowledge_group)}</strong></div><div className="feedback-summary-item"><span>Chủ đề</span><strong>{topicLabel(selectedFeedback.topic)}</strong></div><div className="feedback-summary-item"><span>Lý do người dùng chọn</span><strong>{issueTypeLabel(selectedFeedback.issue_type)}</strong></div><div className="feedback-summary-item"><span>Trạng thái xem xét</span><strong>{feedbackReviewStatusLabel(selectedFeedback.review_status)}</strong></div><div className="feedback-summary-item"><span>Nguyên nhân xác định</span><strong>{feedbackRootCauseLabel(selectedFeedback.root_cause)}</strong></div><div className="feedback-summary-item"><span>Kênh ghi nhận</span><strong>{channelLabel(selectedFeedback.channel)}</strong></div></div>{selectedFeedback.review_note&&<div className="quote-box"><strong>Ghi chú xử lý</strong><p>{selectedFeedback.review_note}</p></div>}</>}
  </Drawer></>;
}
function notificationTextVi(value?:string|null){
  const text=String(value||'');
  const map:Record<string,string>={waiting_client:'Chờ phản hồi',in_progress:'Đang xử lý',resolved:'Đã xử lý',closed:'Đã đóng',new:'Tiếp nhận',triaged:'Tiếp nhận',reopened:'Đang xử lý',cancelled:'Đã hủy',rejected:'Đã đóng'};
  return text.replace(/\b(waiting_client|in_progress|resolved|closed|new|triaged|reopened|cancelled|rejected)\b/g,key=>map[key]||key);
}
export function NotificationsPage({admin=false}:{admin?:boolean}){
  const navigate=useNavigate();
  const base=admin?'/v1/admin/notifications':'/v1/dashboard/notifications';
  const {data,loading,error,reload}=useLoad(()=>api<ApiList<NotificationItem>&{unread_count?:number}>(`${base}?limit=200`),[]);
  const [clearing,setClearing]=useState(false);
  const read=async(n:NotificationItem)=>{
    if(!n.is_read) await api(`${base}/${n.id}/read`,{method:'PATCH'});
    window.dispatchEvent(new CustomEvent('synotech:notifications-refresh'));
    if(!admin&&n.resource_type==='lead'&&n.resource_id){navigate(`/client/leads?lead_id=${encodeURIComponent(n.resource_id)}`);return;}
    if(!admin&&n.resource_type==='conversation'&&n.resource_id){navigate(`/client/conversations?q=${encodeURIComponent(n.resource_id)}`);return;}
    reload();
  };
  const readAll=async()=>{setClearing(true);try{await api(`${base}/read-all`,{method:'PATCH'});window.dispatchEvent(new CustomEvent('synotech:notifications-read'));await reload()}finally{setClearing(false)}};
  const unreadCount=Number(data?.unread_count??(data?.results||[]).filter(n=>!n.is_read).length);
  return <><PageHeader title="Thông báo" description="Cập nhật lead mới, yêu cầu hỗ trợ, trạng thái dịch vụ và cảnh báo vận hành." actions={<button className="btn btn-secondary" disabled={clearing||unreadCount===0} onClick={readAll}><CheckCircle2 size={16}/>{clearing?'Đang đánh dấu...':`Đánh dấu đã đọc tất cả${unreadCount?` (${unreadCount})`:''}`}</button>}/>{loading?<LoadingState/>:error?<ErrorState message={error} retry={reload}/>:<div className="notification-list">{(data?.results||[]).map(n=><button key={n.id} className={n.is_read?'read':''} onClick={()=>read(n)}><span className="notification-icon"><Bell size={17}/></span><div><strong>{notificationTextVi(n.title)}</strong><p>{notificationTextVi(n.message)}</p><small>{formatDate(n.created_at)}</small></div>{!n.is_read&&<i/>}</button>)}</div>}</>;
}

export function AnalyticsPage(){
  const {clientId,withClient}=useOutletContext<DashboardOutletContext>();
  const [selectedFeedback,setSelectedFeedback]=useState<any|null>(null);
  const [reviewStatus,setReviewStatus]=useState('unreviewed');
  const [rootCause,setRootCause]=useState('');
  const [reviewNote,setReviewNote]=useState('');
  const [savingReview,setSavingReview]=useState(false);
  const {data,loading,error,reload}=useLoad(async()=>{
    const [quality,system,tasks,feedback,feedbackRows]=await Promise.all([
      api<ApiList<any>>(withClient('/v1/dashboard/classification-quality?limit=30')),
      api<any>(withClient('/v1/admin/analytics/system')),
      api<ApiList<any>>(withClient('/v1/admin/analytics/tasks')),
      api<any>(withClient('/v1/dashboard/feedback/summary?limit=20')),
      api<ApiList<any>>(withClient('/v1/admin/feedback?rating=negative&limit=200')),
    ]);
    return{quality:quality.results||[],system,tasks:tasks.results||[],feedback,feedbackRows:feedbackRows.results||[]};
  },[clientId]);
  useEffect(()=>{if(!selectedFeedback)return;setReviewStatus(selectedFeedback.review_status||'unreviewed');setRootCause(selectedFeedback.root_cause||'');setReviewNote(selectedFeedback.review_note||'')},[selectedFeedback]);
  const saveReview=async()=>{if(!selectedFeedback)return;setSavingReview(true);try{await api(withClient(`/v1/admin/feedback/${encodeURIComponent(selectedFeedback.id)}`),{method:'PATCH',body:JSON.stringify({review_status:reviewStatus,root_cause:rootCause||null,review_note:reviewNote})});setSelectedFeedback(null);reload()}finally{setSavingReview(false)}};
  if(loading)return <LoadingState/>;if(error)return <ErrorState message={error} retry={reload}/>;
  const overview=data?.feedback?.overview||data?.system?.feedback||{};
  const chartRows=(data?.feedback?.topics||[]).map((r:any)=>({label:topicLabel(r.topic),questions:Number(r.question_count||0),likes:Number(r.like_count||0),dislikes:Number(r.dislike_count||0)}));
  return <><PageHeader title="Phân tích chất lượng" description="Theo dõi câu hỏi, mức độ hài lòng, chất lượng phân loại và nguyên nhân cần cải thiện." actions={<button className="btn btn-secondary" onClick={reload}><RefreshCw size={16}/>Làm mới</button>}/>
  <div className="metrics-grid"><MetricCard label="Tổng câu hỏi" value={data?.system?.chats?.total_events||0}/><MetricCard label="Phiên hội thoại" value={data?.system?.chats?.total_sessions||0} tone="purple"/><MetricCard label="Hài lòng" value={overview.like_count||0} tone="green"/><MetricCard label="Không hài lòng" value={overview.dislike_count||0} tone="red"/><MetricCard label="Chưa xem xét" value={overview.unreviewed_dislike_count||0} tone="orange"/></div>
  <SectionCard title="Số câu hỏi và phản hồi theo chủ đề" description="Cột thể hiện số câu hỏi; hai đường thể hiện lượt hài lòng và không hài lòng của từng chủ đề."><TopicFeedbackChart data={chartRows}/></SectionCard>
  <SectionCard title="Phản hồi không hài lòng cần phân tích" description="Bấm vào từng dòng để xác định nguyên nhân và ghi nhận phương án cải thiện."><DataTable rows={data?.feedbackRows||[]} keyOf={(r:any)=>r.id} onRowClick={setSelectedFeedback} columns={[
    {key:'question',title:'Câu hỏi',render:(r:any)=>shortText(r.question_text,80)},
    {key:'group',title:'Nhóm nội dung',render:(r:any)=><span className="tag">{knowledgeGroupLabel(r.knowledge_group)}</span>},
    {key:'user_reason',title:'Lý do người dùng chọn',render:(r:any)=>issueTypeLabel(r.issue_type)},
    {key:'review',title:'Trạng thái xem xét',render:(r:any)=>feedbackReviewStatusLabel(r.review_status)},
    {key:'root',title:'Nguyên nhân xác định',render:(r:any)=>feedbackRootCauseLabel(r.root_cause)},
    {key:'time',title:'Thời gian',render:(r:any)=>formatDate(r.created_at)},
  ]}/></SectionCard>

  <Drawer open={!!selectedFeedback} title="Xem xét phản hồi không hài lòng" onClose={()=>setSelectedFeedback(null)} footer={<div className="button-row"><button className="btn btn-secondary" onClick={()=>setSelectedFeedback(null)}>Đóng</button><button className="btn btn-primary" disabled={savingReview} onClick={saveReview}><Save size={16}/>{savingReview?'Đang lưu...':'Lưu kết quả xem xét'}</button></div>}>
    {selectedFeedback&&<><div className="feedback-pair"><div><strong>Câu hỏi của người dùng</strong><div className="feedback-text">{selectedFeedback.question_text||'—'}</div></div><div><strong>Câu trả lời của chatbot</strong><div className="feedback-text">{selectedFeedback.answer_text||'—'}</div></div></div><div className="feedback-session-link"><div><span>Mã phiên hội thoại</span><strong className="mono">{selectedFeedback.conversation_session_id||selectedFeedback.session_id||'—'}</strong></div>{(selectedFeedback.conversation_session_id||selectedFeedback.session_id)&&<a className="btn btn-secondary" href={`/admin/conversations?q=${encodeURIComponent(selectedFeedback.conversation_session_id||selectedFeedback.session_id)}`}><MessageSquareText size={16}/>Mở toàn bộ hội thoại</a>}</div><div className="feedback-summary-grid"><div className="feedback-summary-item"><span>Nhóm nội dung</span><strong>{knowledgeGroupLabel(selectedFeedback.knowledge_group)}</strong></div><div className="feedback-summary-item"><span>Chủ đề</span><strong>{topicLabel(selectedFeedback.topic)}</strong></div><div className="feedback-summary-item"><span>Kênh</span><strong>{channelLabel(selectedFeedback.channel)}</strong></div><div className="feedback-summary-item"><span>Lý do người dùng chọn</span><strong>{issueTypeLabel(selectedFeedback.issue_type)}</strong></div></div><div className="feedback-review-grid"><label>Trạng thái xem xét<select value={reviewStatus} onChange={e=>setReviewStatus(e.target.value)}>{FEEDBACK_REVIEW_STATUS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label><label>Nguyên nhân xác định<select value={rootCause} onChange={e=>setRootCause(e.target.value)}><option value="">Chưa xác định</option>{FEEDBACK_ROOT_CAUSE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label><label className="full">Ghi chú và hướng xử lý<textarea rows={6} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Ghi rõ vấn đề, tài liệu cần bổ sung hoặc thay đổi cần thực hiện..."/></label></div></>}
  </Drawer></>;
}
export function ChannelsPage({admin=false}:{admin?:boolean}){
  const {clientId,withClient}=useOutletContext<DashboardOutletContext>();
  const summary=useLoad(()=>api<{success:boolean;total_questions:number;top_channel:string|null;results:ChannelSummary[]}>(withClient(admin?'/v1/admin/channels/summary':'/v1/dashboard/channels/summary')),[clientId,admin]);
  const integrations=useLoad(()=>admin?api<ApiList<ChannelIntegration>>(withClient('/v1/admin/channels')):Promise.resolve({success:true,results:[]} as ApiList<ChannelIntegration>),[clientId,admin]);
  const eventWebhooks=useLoad(()=>admin?api<ApiList<any>>(withClient('/v1/admin/event-webhooks')):Promise.resolve({success:true,results:[]} as ApiList<any>),[clientId,admin]);
  const labels:Record<string,string>={web_widget:'Website',messenger:'Messenger',zalo_oa:'Zalo OA'};
  const icons:Record<string,any>={web_widget:Globe2,messenger:Facebook,zalo_oa:MessageCircle};
  const [selected,setSelected]=useState<ChannelIntegration|null>(null);
  if(summary.loading)return <LoadingState/>;
  if(summary.error)return <ErrorState message={summary.error} retry={summary.reload}/>;
  const rows=summary.data?.results||[];
  return <><PageHeader title={admin?'Kênh tích hợp':'Kênh trò chuyện'} description={admin?'Kết nối Website, Facebook Messenger và Zalo OA cho khách hàng đang chọn.':'So sánh lượng người dùng và câu hỏi theo từng kênh.'} actions={<button className="btn btn-secondary" onClick={()=>{summary.reload();integrations.reload();eventWebhooks.reload()}}><RefreshCw size={16}/>Làm mới</button>}/>
  <div className="metrics-grid"><MetricCard label="Kênh nhiều câu hỏi nhất" value={summary.data?.top_channel?labels[summary.data.top_channel]:'Chưa có dữ liệu'} tone="purple"/><MetricCard label="Tổng câu hỏi" value={summary.data?.total_questions||0}/>{rows.map(r=><MetricCard key={r.channel} label={labels[r.channel]||r.channel} value={Number(r.question_count||0)} hint={`${Number(r.session_count||0)} phiên · ${Number(r.user_count||0)} người dùng`} tone={r.channel==='zalo_oa'?'green':r.channel==='messenger'?'purple':'orange'}/>)}</div>
  <SectionCard title="Phân bổ câu hỏi theo kênh" description="So sánh lượng tương tác trên Website, Facebook Messenger và Zalo OA."><MiniBarChart data={rows.map(r=>({label:labels[r.channel]||r.channel,value:Number(r.question_count||0)}))}/></SectionCard>
  {admin&&<SectionCard title="Cấu hình tích hợp" description="Chọn từng kênh để cấu hình. Thông tin bảo mật được mã hóa và không lưu trong trình duyệt.">{integrations.loading?<LoadingState/>:integrations.error?<ErrorState message={integrations.error} retry={integrations.reload}/>:<div className="channel-grid">{(integrations.data?.results||[]).map(item=>{const Icon=icons[item.channel]||RadioTower;const detail=item.channel==='web_widget'?'Cấu hình trang riêng và mã nhúng website':item.external_account_id||'Chưa cấu hình tài khoản';return <button className="channel-card" key={item.channel} onClick={()=>setSelected(item)}><Icon size={24}/><div><strong>{item.display_name}</strong><small>{detail}</small></div><StatusBadge value={item.status}/></button>})}</div>}</SectionCard>}
  {admin&&<SectionCard title="Webhook sự kiện" description="Gửi sự kiện lead và phản hồi chatbot sang hệ thống khác. Dashboard vẫn tạo thông báo và phát âm thanh cho Client Admin."><EventWebhookEditor clientId={clientId} withClient={withClient} rows={eventWebhooks.data?.results||[]} loading={eventWebhooks.loading} error={eventWebhooks.error} reload={eventWebhooks.reload}/></SectionCard>}
  <Drawer open={!!selected} title={selected?.display_name||'Cấu hình kênh'} onClose={()=>setSelected(null)}>{selected&&(selected.channel==='web_widget'?<WebsiteChannelEditor item={selected} clientId={clientId} withClient={withClient} onSaved={()=>{setSelected(null);integrations.reload();summary.reload()}}/>:<ChannelIntegrationEditor item={selected} endpoint={withClient(`/v1/admin/channels/${selected.channel}`)} onSaved={()=>{setSelected(null);integrations.reload();summary.reload()}}/>)}</Drawer></>
}


function EventWebhookEditor({clientId,withClient,rows,loading,error,reload}:{clientId:string;withClient:(path:string)=>string;rows:any[];loading:boolean;error:string;reload:()=>void}){
  const current=rows[0]||{};const [endpoint,setEndpoint]=useState('');const [secret,setSecret]=useState('');const [enabled,setEnabled]=useState(true);const [events,setEvents]=useState<string[]>(['feedback.positive','feedback.negative','lead.created']);const [saving,setSaving]=useState(false);const [saveError,setSaveError]=useState('');
  useEffect(()=>{setEndpoint(String(current.endpoint_url||''));setSecret('');setEnabled(String(current.status||'active')==='active');setEvents(Array.isArray(current.event_types)?current.event_types:['feedback.positive','feedback.negative','lead.created'])},[current.id,current.updated_at,clientId]);
  if(loading)return <LoadingState/>;if(error)return <ErrorState message={error} retry={reload}/>;
  const toggle=(value:string,checked:boolean)=>setEvents(v=>checked?[...new Set([...v,value])]:v.filter(x=>x!==value));
  const save=async()=>{setSaveError('');setSaving(true);try{await api(withClient('/v1/admin/event-webhooks'),{method:'PUT',body:JSON.stringify({id:current.id,endpoint_url:endpoint,status:enabled?'active':'disabled',event_types:events,description:'Thông báo sự kiện tuyển sinh',...(secret?{signing_secret:secret}:{})})});await reload()}catch(e){setSaveError(e instanceof Error?e.message:String(e))}finally{setSaving(false)}};
  const remove=async()=>{if(!current.id||!window.confirm('Xóa cấu hình webhook này?'))return;await api(withClient(`/v1/admin/event-webhooks/${encodeURIComponent(current.id)}`),{method:'DELETE'});setEndpoint('');await reload()};
  return <div className="form-grid"><label className="full">Địa chỉ nhận webhook<input value={endpoint} onChange={e=>setEndpoint(e.target.value)} placeholder="https://automation.truong.edu.vn/hooks/synotech"/></label><label className="full">Khóa ký webhook<input type="password" value={secret} onChange={e=>setSecret(e.target.value)} placeholder={current.has_secret?'Đã có khóa — chỉ nhập khi muốn thay đổi':'Nhập khóa bí mật tối thiểu 16 ký tự'}/><small className="field-hint">Bên nhận dùng khóa này để xác minh X-Synotech-Signature. Khóa được mã hóa và không hiển thị lại.</small></label><label>Trạng thái<select value={enabled?'active':'disabled'} onChange={e=>setEnabled(e.target.value==='active')}><option value="active">Hoạt động</option><option value="disabled">Đã tắt</option></select></label><div className="full webhook-event-options"><strong>Sự kiện gửi đi</strong><label><input type="checkbox" checked={events.includes('lead.created')} onChange={e=>toggle('lead.created',e.target.checked)}/> Thu thập lead thành công</label><label><input type="checkbox" checked={events.includes('feedback.positive')} onChange={e=>toggle('feedback.positive',e.target.checked)}/> Người dùng bấm hài lòng</label><label><input type="checkbox" checked={events.includes('feedback.negative')} onChange={e=>toggle('feedback.negative',e.target.checked)}/> Người dùng bấm không hài lòng</label><small className="field-hint">Webhook được ký bằng HMAC SHA-256 qua header X-Synotech-Signature. Việc gửi lại dùng outbox và exponential backoff.</small></div>{saveError&&<div className="form-error full">{saveError}</div>}<div className="button-row full"><button className="btn btn-primary" disabled={saving||!endpoint||!events.length||(!current.has_secret&&!secret)} onClick={save}><Save size={16}/>{saving?'Đang lưu...':'Lưu webhook'}</button>{current.id&&<button className="btn btn-secondary" onClick={remove}>Xóa</button>}</div></div>;
}

function ChannelIntegrationEditor({item,endpoint,onSaved}:{item:ChannelIntegration;endpoint:string;onSaved:()=>void}){
  const [status,setStatus]=useState(item.status||'disabled'); const [externalId,setExternalId]=useState(item.external_account_id||'');
  const [verifyToken,setVerifyToken]=useState(''); const [accessToken,setAccessToken]=useState(''); const [appSecret,setAppSecret]=useState(''); const [appId,setAppId]=useState(''); const [error,setError]=useState('');
  const save=async()=>{setError('');try{const credentials:any={};if(verifyToken)credentials.verify_token=verifyToken;if(accessToken)credentials.access_token=accessToken;if(appSecret)credentials.app_secret=item.channel==='zalo_oa'?undefined:appSecret;if(item.channel==='zalo_oa'&&appSecret)credentials.oa_secret_key=appSecret;if(appId)credentials.app_id=appId;await api(endpoint,{method:'PUT',body:JSON.stringify({display_name:item.display_name,status,external_account_id:externalId,config:{graph_api_version:'v23.0'},...(Object.keys(credentials).length?{credentials}:{})})});onSaved()}catch(e){setError(e instanceof Error?e.message:String(e))}};
  const webhook=item.channel==='messenger'?`https://gateway.synotech.io.vn/webhooks/messenger/${item.client_id}`:item.channel==='zalo_oa'?`https://gateway.synotech.io.vn/webhooks/zalo/${item.client_id}`:'https://chat.synotech.io.vn';
  return <div className="form-grid"><label className="full">Đường dẫn nhận dữ liệu<input readOnly value={webhook}/></label><label>Trạng thái<select value={status} onChange={e=>setStatus(e.target.value)}><option value="active">Hoạt động</option><option value="disabled">Đã tắt</option></select></label><label>Mã trang Page/OA<input value={externalId} onChange={e=>setExternalId(e.target.value)}/></label>{item.channel!=='web_widget'&&<><label className="full">Mã xác minh<input type="password" value={verifyToken} onChange={e=>setVerifyToken(e.target.value)} placeholder="Chỉ nhập khi tạo hoặc đổi mã xác minh"/></label><label className="full">Mã truy cập<input type="password" value={accessToken} onChange={e=>setAccessToken(e.target.value)} placeholder="Mã truy cập Page/OA"/></label><label>Mã ứng dụng<input value={appId} onChange={e=>setAppId(e.target.value)}/></label><label>{item.channel==='zalo_oa'?'Khóa bí mật OA':'Khóa bí mật ứng dụng'}<input type="password" value={appSecret} onChange={e=>setAppSecret(e.target.value)}/></label></>}{error&&<div className="form-error full">{error}</div>}<button className="btn btn-primary" onClick={save}><Save size={16}/>Lưu cấu hình</button></div>
}


function WebsiteChannelEditor({item,clientId,withClient,onSaved}:{item:ChannelIntegration;clientId:string;withClient:(path:string)=>string;onSaved:()=>void}){
  const surface=useLoad(()=>api<{success:boolean;surface:ChatSurfaceConfig}>(withClient('/v1/admin/chat-surface')),[clientId]);
  const [form,setForm]=useState<ChatSurfaceConfig>({client_id:clientId,mode:'full_page',public_slug:clientId,widget_enabled:0,full_page_enabled:1,header_style:'standard',background_type:'solid',background_value:'#f5f7fb',theme_json:{}});
  const [saveError,setSaveError]=useState('');
  const [saving,setSaving]=useState(false);
  useEffect(()=>{if(surface.data?.surface){const loaded=surface.data.surface;setForm({...loaded,theme_json:loaded.theme_json||{}})}},[surface.data]);
  const setSurface=(kind:'widget'|'full_page',enabled:boolean)=>{
    const widget=kind==='widget'?(enabled?1:0):Number(form.widget_enabled||0);
    const full=kind==='full_page'?(enabled?1:0):Number(form.full_page_enabled||0);
    const mode:ChatSurfaceConfig['mode']=widget&&full?'both':widget?'widget':'full_page';
    setForm({...form,widget_enabled:widget,full_page_enabled:full,mode});
  };
  const save=async()=>{
    setSaveError('');setSaving(true);
    try{
      const widgetEnabled=Number(form.widget_enabled||0)===1;
      const fullEnabled=Number(form.full_page_enabled||0)===1;
      if(!widgetEnabled&&!fullEnabled)throw new Error('Hãy bật ít nhất một hình thức Website: nhúng hoặc trang chatbot riêng.');
      const publicSlug=String(form.public_slug||clientId).trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');
      if(fullEnabled&&!publicSlug)throw new Error('Đường dẫn công khai không hợp lệ.');
      const mode:ChatSurfaceConfig['mode']=widgetEnabled&&fullEnabled?'both':widgetEnabled?'widget':'full_page';
      const payload:ChatSurfaceConfig={...form,mode,client_id:clientId,public_slug:publicSlug||clientId,widget_enabled:widgetEnabled?1:0,full_page_enabled:fullEnabled?1:0};
      await api(withClient('/v1/admin/channels/web_widget'),{method:'PUT',body:JSON.stringify({display_name:item.display_name||'Website',status:'active',external_account_id:null,config:{widget_enabled:widgetEnabled,full_page_enabled:fullEnabled}})});
      await api(withClient('/v1/admin/chat-surface'),{method:'PUT',body:JSON.stringify(payload)});
      onSaved();
    }catch(e){setSaveError(e instanceof Error?e.message:String(e));}
    finally{setSaving(false)}
  };
  const fullUrl=`https://chat.synotech.io.vn/chat/${encodeURIComponent(form.public_slug||clientId)}`;
  const embed=`<script src="https://chat.synotech.io.vn/widget-loader.js" data-client-id="${clientId}"></script>`;
  if(surface.loading)return <LoadingState/>;
  if(surface.error)return <ErrorState message={surface.error} retry={surface.reload}/>;
  return <div className="form-grid website-channel-editor">
    <div className="full surface-choice-title"><strong>Hình thức hiển thị chatbot</strong><small>Có thể bật đồng thời cả hai hình thức hoặc chỉ sử dụng một hình thức.</small></div>
    <div className="delivery-mode-grid">
      <label className={`delivery-mode-card ${Number(form.widget_enabled)===1?'active':''}`}><input type="checkbox" checked={Number(form.widget_enabled)===1} onChange={e=>setSurface('widget',e.target.checked)}/><span><strong>Nhúng vào website trường</strong><small>Hiển thị chatbot trực tiếp trên website chính thức của trường bằng mã nhúng.</small></span></label>
      <label className={`delivery-mode-card ${Number(form.full_page_enabled)===1?'active':''}`}><input type="checkbox" checked={Number(form.full_page_enabled)===1} onChange={e=>setSurface('full_page',e.target.checked)}/><span><strong>Trang chatbot riêng</strong><small>Sử dụng trang chatbot độc lập theo đường dẫn riêng của từng trường.</small></span></label>
    </div>
    {Number(form.full_page_enabled)===1&&<><label>Đường dẫn công khai<input value={form.public_slug||clientId} onChange={e=>setForm({...form,public_slug:e.target.value})}/></label><label>Tên miền riêng (không bắt buộc)<input value={form.custom_domain||''} onChange={e=>setForm({...form,custom_domain:e.target.value})} placeholder="chat.ten-truong.edu.vn"/></label><label className="full">Màu/nền trang<input value={form.background_value||''} onChange={e=>setForm({...form,background_value:e.target.value})} placeholder="#f5f7fb hoặc URL ảnh"/></label><label className="full">Trang chatbot riêng<div className="surface-link"><input readOnly value={fullUrl}/><a className="btn btn-secondary" href={fullUrl} target="_blank" rel="noreferrer">Mở trang</a></div></label></>}
    {Number(form.widget_enabled)===1&&<label className="full">Mã nhúng website<div className="copy-code">{embed}</div><small className="field-hint">Thêm domain website trường vào danh sách domain được phép trước khi đưa vào production.</small></label>}
    {saveError&&<div className="form-error full">{saveError}</div>}
    <button className="btn btn-primary" onClick={save} disabled={saving}><Save size={16}/>{saving?'Đang lưu...':'Lưu cấu hình Website'}</button>
  </div>;
}

export function UsersPage(){
  const {user:currentUser}=useAuth();
  const users=useLoad(()=>api<ApiList<User & {id:string;status:string;client_id:string|null;must_change_password?:number}>>('/v1/admin/users'),[]);
  const clients=useLoad(()=>api<ApiList<Client>>('/v1/admin/clients'),[]);
  const [createOpen,setCreateOpen]=useState(false);
  const [selected,setSelected]=useState<any|null>(null);
  const [credential,setCredential]=useState<{title:string;username:string;password:string}|null>(null);
  const reload=()=>{users.reload();clients.reload()};
  const remove=async(row:any)=>{
    if(row.id===currentUser?.id)return;
    if(!window.confirm(`Xóa tài khoản ${row.username}? Thao tác này không thể hoàn tác.`))return;
    try{await api(`/v1/admin/users/${row.id}`,{method:'DELETE'});setSelected(null);users.reload();}catch(e){window.alert(e instanceof Error?e.message:String(e));}
  };
  return <>
    <PageHeader title="Người dùng" description="Thêm, cập nhật, vô hiệu hóa hoặc xóa tài khoản quản trị." actions={<button className="btn btn-primary" onClick={()=>setCreateOpen(true)}><UserPlus size={16}/>Thêm tài khoản</button>}/>
    {users.loading?<LoadingState/>:users.error?<ErrorState message={users.error} retry={users.reload}/>:<DataTable rows={users.data?.results||[]} keyOf={r=>String(r.id||r.userId||r.user_id||r.username)} onRowClick={setSelected} columns={[
      {key:'name',title:'Người dùng',render:r=><div><strong>{r.full_name}</strong><small className="table-sub">{r.email||r.username}</small></div>},
      {key:'username',title:'Tên đăng nhập',render:r=><span className="mono">{r.username}</span>},
      {key:'role',title:'Vai trò',render:r=><span className="tag">{r.role==='super_admin'?'Quản trị hệ thống':'Quản trị khách hàng'}</span>},
      {key:'client',title:'Khách hàng',render:r=>r.client_id||'Toàn hệ thống'},
      {key:'status',title:'Trạng thái',render:r=><StatusBadge value={r.status}/>},
      {key:'action',title:'Thao tác',render:r=><button className="table-action" onClick={e=>{e.stopPropagation();setSelected(r)}}>Chỉnh sửa</button>}
    ]}/>} 
    <Modal open={createOpen} title="Thêm tài khoản" onClose={()=>setCreateOpen(false)}><CreateUserForm clients={clients.data?.results||[]} onCreated={(result:any,username:string)=>{setCreateOpen(false);setCredential({title:'Tài khoản đã được tạo',username,password:result.initial_password});reload()}}/></Modal>
    <Drawer open={!!selected} title={selected?.full_name||'Tài khoản'} onClose={()=>setSelected(null)}>{selected&&<UserEditor key={selected.id} row={selected} clients={clients.data?.results||[]} isCurrent={selected.id===currentUser?.id} onSaved={(result:any)=>{if(result?.temporary_password)setCredential({title:'Mật khẩu tạm thời mới',username:selected.username,password:result.temporary_password});setSelected(null);users.reload()}} onDelete={()=>remove(selected)}/>}</Drawer>
    <Modal open={!!credential} title={credential?.title||''} onClose={()=>setCredential(null)} actions={<button className="btn btn-primary" onClick={()=>setCredential(null)}>Đóng</button>}>{credential&&<div className="credential-box"><p>Hãy gửi thông tin này cho người dùng qua kênh an toàn. Mật khẩu chỉ hiển thị tại đây một lần.</p><label>Tên đăng nhập<input readOnly value={credential.username}/></label><label>Mật khẩu tạm thời<div className="copy-field"><input readOnly value={credential.password}/><button className="btn btn-secondary" onClick={()=>navigator.clipboard.writeText(credential.password)}>Sao chép</button></div></label></div>}</Modal>
  </>;
}

function CreateUserForm({clients,onCreated}:{clients:Client[];onCreated:(result:any,username:string)=>void}){
  const [form,setForm]=useState({full_name:'',username:'',email:'',role:'client_admin',client_id:String(clients[0]?.client_id||clients[0]?.id||''),password:'',can_view_pii:true});
  const [saving,setSaving]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{if(!form.client_id&&clients.length)setForm(v=>({...v,client_id:String(clients[0].client_id||clients[0].id||'')}));},[clients]);
  const submit=async()=>{setSaving(true);setError('');try{const result=await api<any>('/v1/admin/users',{method:'POST',body:JSON.stringify({...form,client_id:form.role==='client_admin'?form.client_id:null,password:form.password||undefined})});onCreated(result,form.username);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setSaving(false)}};
  return <div className="form-grid"><label>Họ tên<input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label><label>Tên đăng nhập<input value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/></label><label className="full">Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Vai trò<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="client_admin">Quản trị khách hàng</option><option value="super_admin">Quản trị hệ thống</option></select></label>{form.role==='client_admin'&&<label>Khách hàng<select value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}>{clients.map(c=><option key={c.client_id||c.id} value={c.client_id||c.id}>{c.display_name}</option>)}</select></label>}<label className="full">Mật khẩu ban đầu<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Để trống để hệ thống tự tạo"/></label><label className="check full"><input type="checkbox" checked={form.can_view_pii} onChange={e=>setForm({...form,can_view_pii:e.target.checked})}/>Cho phép xem thông tin liên hệ</label>{error&&<div className="form-error full">{error}</div>}<button className="btn btn-primary" disabled={saving} onClick={submit}>{saving?'Đang tạo...':'Tạo tài khoản'}</button></div>;
}

function UserEditor({row,clients,isCurrent,onSaved,onDelete}:{row:any;clients:Client[];isCurrent:boolean;onSaved:(result:any)=>void;onDelete:()=>void}){
  const [form,setForm]=useState({full_name:row.full_name||'',email:row.email||'',role:row.role||'client_admin',client_id:row.client_id||'',status:row.status||'active',can_view_pii:Number(row.can_view_pii)!==0,reset_password:false});
  const [saving,setSaving]=useState(false);const [error,setError]=useState('');
  const save=async()=>{setSaving(true);setError('');try{const result=await api<any>(`/v1/admin/users/${row.id}`,{method:'PATCH',body:JSON.stringify({...form,client_id:form.role==='client_admin'?form.client_id:null})});onSaved(result);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setSaving(false)}};
  return <div className="form-grid"><label className="full">Tên đăng nhập<input readOnly value={row.username}/></label><label>Họ tên<input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label><label>Email<input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Vai trò<select value={form.role} disabled={isCurrent} onChange={e=>setForm({...form,role:e.target.value})}><option value="client_admin">Quản trị khách hàng</option><option value="super_admin">Quản trị hệ thống</option></select></label>{form.role==='client_admin'&&<label>Khách hàng<select value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}>{clients.map(c=><option key={c.client_id||c.id} value={c.client_id||c.id}>{c.display_name}</option>)}</select></label>}<label>Trạng thái<select value={form.status} disabled={isCurrent} onChange={e=>setForm({...form,status:e.target.value})}><option value="active">Hoạt động</option><option value="disabled">Vô hiệu hóa</option><option value="invited">Chờ kích hoạt</option></select></label><label className="check"><input type="checkbox" checked={form.can_view_pii} onChange={e=>setForm({...form,can_view_pii:e.target.checked})}/>Cho phép xem thông tin liên hệ</label><label className="check full"><input type="checkbox" checked={form.reset_password} onChange={e=>setForm({...form,reset_password:e.target.checked})}/>Đặt lại mật khẩu và tạo mật khẩu tạm thời</label>{isCurrent&&<div className="quote-box full">Bạn không thể vô hiệu hóa, đổi vai trò hoặc xóa chính tài khoản đang đăng nhập.</div>}{error&&<div className="form-error full">{error}</div>}<div className="button-row full"><button className="btn btn-primary" disabled={saving} onClick={save}><Save size={16}/>Lưu thay đổi</button>{!isCurrent&&<button className="btn btn-danger" disabled={saving} onClick={onDelete}><Trash2 size={16}/>Xóa tài khoản</button>}</div></div>;
}

export function AuditPage(){const {clientId,withClient}=useOutletContext<DashboardOutletContext>();const {data,loading,error,reload}=useLoad(()=>api<ApiList<any>>(withClient('/v1/admin/audit-logs?limit=500')),[clientId]);return <><PageHeader title="Nhật ký thao tác" description="Lịch sử thao tác quản trị đối với khách hàng, tài khoản và tài liệu."/>{loading?<LoadingState/>:error?<ErrorState message={error} retry={reload}/>:<DataTable rows={data?.results||[]} keyOf={(r:any)=>r.id} columns={[{key:'time',title:'Thời gian',render:(r:any)=>formatDate(r.created_at)},{key:'actor',title:'Người thực hiện',render:(r:any)=>r.actor_name||'Hệ thống'},{key:'action',title:'Hành động',render:(r:any)=><b>{auditActionLabel(r.action)}</b>},{key:'resource',title:'Đối tượng',render:(r:any)=>`${auditResourceLabel(r.resource_type)}${r.resource_id?` · ${r.resource_id}`:''}`},{key:'client',title:'Khách hàng',render:(r:any)=>r.client_id||'—'}]}/>}</>}

export function SettingsPage(){const {data,loading,error,reload}=useLoad(()=>api<ApiList<any>>('/v1/admin/system-settings'),[]);const [key,setKey]=useState('dashboard.general');const [value,setValue]=useState('{}');const save=async()=>{await api('/v1/admin/system-settings',{method:'PATCH',body:JSON.stringify({setting_key:key,value:JSON.parse(value)})});reload()};return <><PageHeader title="Cấu hình hệ thống" description="Thiết lập chung cho màn quản trị và quy trình vận hành."/>{loading?<LoadingState/>:error?<ErrorState message={error} retry={reload}/>:<div className="two-column"><SectionCard title="Danh sách cấu hình"><DataTable rows={data?.results||[]} keyOf={(r:any)=>r.setting_key} columns={[{key:'key',title:'Mã cấu hình',render:(r:any)=><b className="mono">{r.setting_key}</b>},{key:'time',title:'Cập nhật',render:(r:any)=>formatDate(r.updated_at)}]}/></SectionCard><SectionCard title="Cập nhật cấu hình"><div className="form-grid"><label className="full">Mã cấu hình<input value={key} onChange={e=>setKey(e.target.value)}/></label><label className="full">Nội dung cấu hình<textarea className="code-editor" value={value} onChange={e=>setValue(e.target.value)} rows={15}/></label><button className="btn btn-primary" onClick={save}>Lưu cấu hình</button></div></SectionCard></div>}</>}

export function AccountPage(){
  const {user,logout}=useAuth();
  const navigate=useNavigate();
  const [oldPassword,setOldPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const save=async()=>{
    setError('');
    if(newPassword.length<12){setError('Mật khẩu mới phải có ít nhất 12 ký tự.');return;}
    if(newPassword!==confirmPassword){setError('Mật khẩu xác nhận chưa khớp.');return;}
    setSaving(true);
    try{
      await api('/v1/auth/change-password',{method:'POST',body:JSON.stringify({current_password:oldPassword,new_password:newPassword})});
      await logout();
      navigate('/login?passwordChanged=1',{replace:true});
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setSaving(false)}
  };
  return <><PageHeader title="Tài khoản" description="Thông tin tài khoản và bảo mật."/>{user?.must_change_password&&<div className="account-warning"><AlertCircle size={18}/><div><strong>Bạn cần đổi mật khẩu trước khi tiếp tục.</strong><span>Đây là mật khẩu tạm thời được cấp khi tạo hoặc đặt lại tài khoản.</span></div></div>}<div className="two-column"><SectionCard title="Thông tin"><div className="detail-list"><div><span>Họ tên</span><b>{user?.full_name}</b></div><div><span>Tên đăng nhập</span><b>{user?.username}</b></div><div><span>Vai trò</span><b>{user?.role==='super_admin'?'Quản trị hệ thống':'Quản trị khách hàng'}</b></div><div><span>Khách hàng</span><b>{user?.client_id||'Toàn hệ thống'}</b></div></div></SectionCard><SectionCard title="Đổi mật khẩu"><div className="form-grid"><label className="full">Mật khẩu hiện tại<input type="password" autoComplete="current-password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)}/></label><label className="full">Mật khẩu mới<input type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><label className="full">Nhập lại mật khẩu mới<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label><small className="field-hint full">Mật khẩu cần có ít nhất 12 ký tự. Sau khi đổi, bạn sẽ đăng nhập lại bằng mật khẩu mới.</small>{error&&<div className="form-error full">{error}</div>}<button className="btn btn-primary" disabled={saving||!oldPassword||!newPassword||!confirmPassword} onClick={save}><KeyRound size={16}/>{saving?'Đang đổi...':'Đổi mật khẩu'}</button></div></SectionCard></div></>;
}

const DEFAULT_SUGGESTIONS = [
  'Trường đang tuyển sinh những ngành nào?',
  'Học phí các ngành hiện nay là bao nhiêu?',
  'Điều kiện xét tuyển vào trường là gì?',
  'Hồ sơ đăng ký xét tuyển gồm những gì?',
  'Các phương thức xét tuyển hiện nay là gì?',
  'Thời gian nhận hồ sơ tuyển sinh khi nào?',
  'Chỉ tiêu tuyển sinh từng ngành là bao nhiêu?',
  'Trường có chính sách học bổng nào?',
  'Thông tin liên hệ của trường là gì?',
  'Sinh viên được hỗ trợ việc làm như thế nào?',
  'Em muốn được tư vấn trực tiếp thì liên hệ ở đâu?',
  'Quy trình nhập học gồm những bước nào?'
];

function AssetUploadField({label,value,clientId,type,onChange,help}:{label:string;value?:string;clientId:string;type:'logo'|'favicon'|'background';onChange:(url:string)=>void;help:string}){
  const [uploading,setUploading]=useState(false); const [error,setError]=useState('');
  const change=async(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0]; if(!file)return;setUploading(true);setError('');try{const result=await uploadAsset(file,clientId,type);onChange(result.url)}catch(err){setError(err instanceof Error?err.message:String(err))}finally{setUploading(false);e.target.value=''}};
  return <label className="asset-upload-field"><span>{label}</span><div className="asset-upload-box">{value?<img src={value} alt={label}/>:<ImageIcon size={28}/>}<div><b>{uploading?'Đang tải lên...':'Chọn ảnh từ máy'}</b><small>{help}</small></div><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon" onChange={change} disabled={uploading}/><UploadCloud size={18}/></div>{value&&<div className="asset-url-preview" title={value}>{value}</div>}{error&&<small className="field-error">{error}</small>}</label>
}

export function TenantProductizationPage(){
  const {clientId,withClient}=useOutletContext<DashboardOutletContext>();
  const themeLoad=useLoad(()=>api<any>(withClient('/v1/admin/chatbot-theme')),[clientId]);
  const handoffLoad=useLoad(()=>api<any>(withClient('/v1/admin/contact-handoff')),[clientId]);
  const defaultTheme:any={chatbot_name:'Trợ lý tuyển sinh',school_display_name:'',support_text:'Hỗ trợ tư vấn 24/7',greeting_text:'',legal_notice:'Thông tin có tính chất tham khảo. Vui lòng đối chiếu thông báo chính thức của nhà trường.',primary_color:'#0f766e',secondary_color:'#2563eb',background_color:'#f8fafc',text_color:'#111827',font_family:'Inter, system-ui, sans-serif',font_size_px:16,border_radius_px:16,suggested_questions:DEFAULT_SUGGESTIONS};
  const [theme,setTheme]=useState<any>(defaultTheme);
  const [handoff,setHandoff]=useState<any>({lead_form_enabled:1}); const [saving,setSaving]=useState(false);
  useEffect(()=>{const legacy='Ký túc xá và chỗ ở cho sinh viên ra sao?';const replacement='Thông tin liên hệ của trường là gì?';const raw=themeLoad.data?.theme?.suggested_questions?.length?themeLoad.data.theme.suggested_questions:DEFAULT_SUGGESTIONS;const normalized=(Array.isArray(raw)?raw:DEFAULT_SUGGESTIONS).map((item:any)=>{const text=typeof item==='string'?item:item?.text;return text===legacy?replacement:item});setTheme(themeLoad.data?.theme?{...defaultTheme,...themeLoad.data.theme,suggested_questions:normalized}:{...defaultTheme,suggested_questions:normalized})},[themeLoad.data,clientId]);
  useEffect(()=>{setHandoff(handoffLoad.data?.handoff||{lead_form_enabled:1})},[handoffLoad.data,clientId]);
  const save=async()=>{setSaving(true);try{await api(withClient('/v1/admin/chatbot-theme'),{method:'PUT',body:JSON.stringify(theme)});await api(withClient('/v1/admin/contact-handoff'),{method:'PUT',body:JSON.stringify(handoff)});themeLoad.reload();handoffLoad.reload()}finally{setSaving(false)}};
  const suggestions=Array.isArray(theme.suggested_questions)?theme.suggested_questions:DEFAULT_SUGGESTIONS;
  return <><PageHeader title="Thương hiệu chatbot & chuyển tư vấn" description="Cấu hình riêng cho từng trường. Ảnh được lưu trên Cloudflare R2, không cần sửa mã nguồn hoặc triển khai lại." actions={<button className="btn btn-primary" disabled={saving} onClick={save}><Save size={16}/>{saving?'Đang lưu...':'Lưu cấu hình'}</button>}/>
  <div className="two-column productization-grid"><SectionCard title="Nhận diện và giao diện"><div className="form-grid">
    <label>Tên chatbot<input placeholder="Ví dụ: Trợ lý tuyển sinh AI" value={theme.chatbot_name||''} onChange={e=>setTheme({...theme,chatbot_name:e.target.value})}/></label><label>Tên trường hiển thị<input placeholder="Ví dụ: Cao đẳng Y Phú Thọ" value={theme.school_display_name||''} onChange={e=>setTheme({...theme,school_display_name:e.target.value})}/></label>
    <label className="full">Lời chào<textarea rows={3} placeholder="Lời chào hiển thị khi người dùng mở chatbot" value={theme.greeting_text||''} onChange={e=>setTheme({...theme,greeting_text:e.target.value})}/></label><label className="full">Thông báo pháp lý<textarea rows={2} placeholder="Ví dụ: Vui lòng đối chiếu thông báo chính thức của nhà trường" value={theme.legal_notice||''} onChange={e=>setTheme({...theme,legal_notice:e.target.value})}/></label>
    <AssetUploadField label="Logo trường" value={theme.logo_url} clientId={clientId} type="logo" help="PNG, JPG hoặc WebP; tối đa 8 MB" onChange={url=>setTheme({...theme,logo_url:url})}/><AssetUploadField label="Biểu tượng tab trình duyệt" value={theme.favicon_url} clientId={clientId} type="favicon" help="Nên dùng ảnh vuông 64×64 px trở lên" onChange={url=>setTheme({...theme,favicon_url:url})}/><AssetUploadField label="Ảnh nền toàn màn hình web chatbot riêng" value={theme.background_url} clientId={clientId} type="background" help="Ảnh phủ toàn màn hình (background-size: cover); khuyến nghị tối thiểu 1920×1080 px" onChange={url=>setTheme({...theme,background_url:url})}/><label>Dòng hỗ trợ<input placeholder="Ví dụ: Hỗ trợ tư vấn 24/7" value={theme.support_text||''} onChange={e=>setTheme({...theme,support_text:e.target.value})}/></label>
    <label>Cỡ chữ<input type="number" min={12} max={22} value={theme.font_size_px||16} onChange={e=>setTheme({...theme,font_size_px:Number(e.target.value)})}/></label><label>Bo góc<input type="number" min={0} max={40} value={theme.border_radius_px||16} onChange={e=>setTheme({...theme,border_radius_px:Number(e.target.value)})}/></label>
  </div></SectionCard><SectionCard title="Câu hỏi gợi ý"><p className="muted">Có sẵn 12 câu mẫu; hệ thống chọn 3 câu phù hợp sau mỗi câu trả lời.</p>{suggestions.map((q:any,i:number)=><div className="inline-edit" key={i}><input placeholder={`Câu hỏi gợi ý ${i+1}`} value={typeof q==='string'?q:q.text||''} onChange={e=>{const next=[...suggestions];next[i]=e.target.value;setTheme({...theme,suggested_questions:next})}}/><button className="icon-btn" onClick={()=>setTheme({...theme,suggested_questions:suggestions.filter((_:any,j:number)=>j!==i)})}><Trash2 size={15}/></button></div>)}{suggestions.length<12&&<button className="btn btn-secondary" onClick={()=>setTheme({...theme,suggested_questions:[...suggestions,'']})}><Plus size={16}/>Thêm câu hỏi</button>}</SectionCard></div>
  <SectionCard title="Thu lead và chuyển sang tư vấn viên"><div className="form-grid"><label>Hotline<input placeholder="Ví dụ: 0210 123 4567" value={handoff.hotline||''} onChange={e=>setHandoff({...handoff,hotline:e.target.value})}/></label><label>Email<input placeholder="Ví dụ: tuyensinh@tentruong.edu.vn" value={handoff.email||''} onChange={e=>setHandoff({...handoff,email:e.target.value})}/></label><label>Zalo<input placeholder="Dán đường dẫn Zalo OA của trường" value={handoff.zalo_url||''} onChange={e=>setHandoff({...handoff,zalo_url:e.target.value})}/></label><label>Messenger<input placeholder="Dán đường dẫn Facebook Messenger" value={handoff.messenger_url||''} onChange={e=>setHandoff({...handoff,messenger_url:e.target.value})}/></label><label>Website<input placeholder="Ví dụ: https://tentruong.edu.vn" value={handoff.website_url||''} onChange={e=>setHandoff({...handoff,website_url:e.target.value})}/></label><label>Giờ làm việc<input placeholder="Ví dụ: 07:30–17:00, Thứ Hai–Thứ Sáu" value={handoff.working_hours||''} onChange={e=>setHandoff({...handoff,working_hours:e.target.value})}/></label><label className="full">Thông báo ngoài giờ<textarea placeholder="Ví dụ: Nhà trường đã nhận được yêu cầu và sẽ liên hệ trong giờ làm việc gần nhất." value={handoff.outside_hours_message||''} onChange={e=>setHandoff({...handoff,outside_hours_message:e.target.value})}/></label><label className="checkbox-label"><input type="checkbox" checked={!!handoff.lead_form_enabled} onChange={e=>setHandoff({...handoff,lead_form_enabled:e.target.checked?1:0})}/>Cho phép để lại thông tin tư vấn</label></div></SectionCard></>;
}

export function AiObservabilityPage({admin=false}:{admin?:boolean}){
  const {clientId,withClient}=useOutletContext<DashboardOutletContext>(); const [days,setDays]=useState(30);
  const quality=useLoad(()=>api<any>(withClient(`/v1/dashboard/ai-quality?days=${days}`)),[clientId,days]);
  const cost=useLoad(()=>api<any>(withClient(`/v1/dashboard/ai-cost?days=${days}`)),[clientId,days]);
  const governance=useLoad(()=>api<any>(withClient('/v1/admin/ai-governance')),[clientId]);
  const health=useLoad(()=>api<any>(withClient('/v1/dashboard/health')),[clientId]);
  const usage=useLoad(()=>api<any>(withClient('/v1/dashboard/source-usage?limit=100')),[clientId]);
  const gaps=useLoad(()=>api<any>(withClient('/v1/dashboard/knowledge-gaps?limit=100')),[clientId]);
  const [modelKey,setModelKey]=useState('google:gemini-2.5-flash-lite'); const [savingModel,setSavingModel]=useState(false);
  useEffect(()=>{const selected=governance.data?.selected_model||cost.data?.selected_model;if(selected?.provider&&selected?.model_name)setModelKey(`${selected.provider}:${selected.model_name}`)},[governance.data,cost.data]);
  const catalog=governance.data?.catalog||cost.data?.catalog||[];
  const feedback=quality.data?.feedback||{}; const total=Number(feedback.total||0); const positive=Number(feedback.positive||0); const totals=cost.data?.totals||{}; const cache=quality.data?.cache||{};
  const runHealth=async()=>{await api(withClient('/v1/dashboard/health/check'),{method:'POST',body:'{}'});health.reload()};
  const updateGap=async(id:string,status:string)=>{await api(withClient(`/v1/dashboard/knowledge-gaps/${encodeURIComponent(id)}`),{method:'PATCH',body:JSON.stringify({status})});gaps.reload()};
  const saveModel=async()=>{const [provider,model_name]=modelKey.split(':');setSavingModel(true);try{await api(withClient('/v1/admin/ai-governance'),{method:'PUT',body:JSON.stringify({model_provider:provider,model_name,monthly_budget_usd:Number(governance.data?.budget?.monthly_budget_usd||0),warning_percent:Number(governance.data?.budget?.warning_percent||80),hard_limit_enabled:Number(governance.data?.budget?.hard_limit_enabled||0)})});governance.reload();cost.reload()}finally{setSavingModel(false)}};
  return <><PageHeader title="Chất lượng AI & vận hành" description="Theo dõi sức khỏe hệ thống, token và chi phí thực tế từ Dify theo giờ, ngày và tháng." actions={<div className="button-row"><select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>7 ngày</option><option value={30}>30 ngày</option><option value={90}>90 ngày</option></select><button className="btn btn-secondary" onClick={runHealth}><RefreshCw size={16}/>Kiểm tra hệ thống</button></div>}/>
  <SectionCard title="Mô hình tính chi phí mặc định"><div className="button-row"><select value={modelKey} onChange={e=>setModelKey(e.target.value)}>{catalog.map((m:any)=><option key={`${m.provider}:${m.model_name}`} value={`${m.provider}:${m.model_name}`}>{m.display_name} · ${m.input_price_per_million}/1M vào · ${m.output_price_per_million}/1M ra</option>)}</select><button className="btn btn-primary" onClick={saveModel} disabled={savingModel}>{savingModel?'Đang lưu...':'Lưu mô hình'}</button></div><p className="muted">Mô hình thực tế vẫn được chọn trong Dify. Cấu hình này chỉ dùng để gắn tên và tính chi phí khi Dify trả token nhưng không trả model hoặc giá.</p></SectionCard>
  {(quality.loading||cost.loading)?<LoadingState/>:(quality.error||cost.error)?<ErrorState message={quality.error||cost.error}/>:<><div className="metric-grid"><MetricCard label="Tổng đánh giá" value={total}/><MetricCard label="Tỷ lệ hài lòng" value={total?`${Math.round(positive/total*100)}%`:'—'}/><MetricCard label="Token đã dùng" value={Number(totals.input_tokens||0)+Number(totals.output_tokens||0)}/><MetricCard label="Chi phí ước tính" value={`$${Number(totals.estimated_cost_usd||0).toFixed(6)}`}/><MetricCard label="Lượt gọi AI" value={Number(totals.call_count||0)}/><MetricCard label="Tỷ lệ cache hit" value={`${Number(cache.hit_rate||0).toFixed(1)}%`}/><MetricCard label="Lượt gọi AI đã tiết kiệm" value={Number(cache.hit||0)}/></div>
  <div className="two-column"><SectionCard title="Token và chi phí theo ngày"><DataTable rows={cost.data?.daily||[]} keyOf={(r:any)=>r.day} columns={[{key:'day',title:'Ngày',render:(r:any)=>r.day},{key:'calls',title:'Lượt gọi',render:(r:any)=>r.call_count},{key:'input',title:'Token vào',render:(r:any)=>r.input_tokens},{key:'output',title:'Token ra',render:(r:any)=>r.output_tokens},{key:'cost',title:'Chi phí',render:(r:any)=>`$${Number(r.estimated_cost_usd||0).toFixed(6)}`}]}/></SectionCard><SectionCard title="Chi phí theo mô hình"><DataTable rows={cost.data?.models||[]} keyOf={(r:any)=>`${r.provider}-${r.model_name}`} columns={[{key:'model',title:'Mô hình',render:(r:any)=><div><b>{r.model_name}</b><small className="table-sub">{r.provider}</small></div>},{key:'calls',title:'Lượt gọi',render:(r:any)=>r.call_count},{key:'tokens',title:'Token',render:(r:any)=>Number(r.input_tokens||0)+Number(r.output_tokens||0)},{key:'cost',title:'Chi phí',render:(r:any)=>`$${Number(r.estimated_cost_usd||0).toFixed(6)}`}]}/></SectionCard></div>
  <div className="two-column"><SectionCard title="48 giờ gần nhất"><DataTable rows={cost.data?.hourly||[]} keyOf={(r:any)=>r.bucket} columns={[{key:'bucket',title:'Giờ',render:(r:any)=>r.bucket},{key:'calls',title:'Lượt gọi',render:(r:any)=>r.call_count},{key:'tokens',title:'Token',render:(r:any)=>Number(r.input_tokens||0)+Number(r.output_tokens||0)},{key:'cost',title:'Chi phí',render:(r:any)=>`$${Number(r.estimated_cost_usd||0).toFixed(8)}`}]}/></SectionCard><SectionCard title="Theo tháng"><DataTable rows={cost.data?.monthly||[]} keyOf={(r:any)=>r.month} columns={[{key:'month',title:'Tháng',render:(r:any)=>r.month},{key:'calls',title:'Lượt gọi',render:(r:any)=>r.call_count},{key:'tokens',title:'Token',render:(r:any)=>Number(r.input_tokens||0)+Number(r.output_tokens||0)},{key:'cost',title:'Chi phí',render:(r:any)=>`$${Number(r.estimated_cost_usd||0).toFixed(6)}`}]}/></SectionCard></div></>}
  <SectionCard title="Health Check" description="Kiểm tra D1, R2 và Dify của khách hàng hiện tại.">{health.loading?<LoadingState/>:<DataTable rows={health.data?.results||[]} keyOf={(r:any)=>r.component} columns={[{key:'component',title:'Thành phần',render:(r:any)=>String(r.component).toUpperCase()},{key:'status',title:'Trạng thái',render:(r:any)=><StatusBadge value={r.status}/>},{key:'latency',title:'Độ trễ',render:(r:any)=>r.latency_ms!=null?`${r.latency_ms} ms`:'—'},{key:'time',title:'Lần kiểm tra',render:(r:any)=>formatDate(r.checked_at)}]}/>}</SectionCard>
  <SectionCard title="Mức độ sử dụng nguồn" description="Tài liệu nào đang được chatbot trích dẫn hoặc người dùng mở xem.">{usage.loading?<LoadingState/>:<DataTable rows={usage.data?.results||[]} keyOf={(r:any)=>r.source_id} columns={[{key:'source',title:'Tài liệu',render:(r:any)=><div><strong>{r.title}</strong><small className="table-sub mono">{r.source_id}</small></div>},{key:'group',title:'Nhóm',render:(r:any)=>knowledgeGroupLabel(r.knowledge_group)},{key:'uses',title:'Lượt dùng',render:(r:any)=>r.usage_count||0},{key:'score',title:'Điểm TB',render:(r:any)=>r.avg_score!=null?`${Math.round(Number(r.avg_score)*100)}%`:'—'},{key:'last',title:'Dùng gần nhất',render:(r:any)=>formatDate(r.last_used_at)}]}/>}</SectionCard>
  <SectionCard title="AI Knowledge Gap" description="Những câu hỏi hệ thống chưa có tài liệu phù hợp; dùng danh sách này để lập kế hoạch bổ sung Kho tri thức.">{gaps.loading?<LoadingState/>:<DataTable rows={gaps.data?.results||[]} keyOf={(r:any)=>r.id} columns={[{key:'question',title:'Câu hỏi mẫu',render:(r:any)=><div><strong>{r.sample_question}</strong><small className="table-sub">{r.reason} · {knowledgeGroupLabel(r.knowledge_group)}</small></div>},{key:'count',title:'Số lần gặp',render:(r:any)=>r.occurrence_count},{key:'action',title:'Gợi ý xử lý',render:(r:any)=>r.suggested_action||'Bổ sung tài liệu phù hợp'},{key:'status',title:'Trạng thái',render:(r:any)=><select value={r.status} onChange={e=>updateGap(r.id,e.target.value)}><option value="open">Cần xử lý</option><option value="planned">Đã lên kế hoạch</option><option value="resolved">Đã bổ sung</option><option value="ignored">Bỏ qua</option></select>}]}/>}</SectionCard></>;
}
