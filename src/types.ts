export type Role = 'super_admin' | 'client_admin';

export type User = {
  id?: string;
  userId?: string;
  user_id?: string;
  username: string;
  email?: string;
  full_name: string;
  role: Role;
  client_id: string | null;
  can_view_pii: boolean;
  must_change_password?: boolean;
};

export type TicketStatus =
  | 'new' | 'triaged' | 'in_progress' | 'waiting_client'
  | 'resolved' | 'rejected' | 'closed' | 'reopened' | 'cancelled';

export type Ticket = {
  id: string;
  ticket_code: string;
  client_id: string;
  client_name?: string;
  request_type: string;
  issue_type?: string | null;
  title: string;
  description?: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: TicketStatus;
  assigned_to_name?: string | null;
  assigned_to_user_id?: string | null;
  requested_by_name?: string;
  linked_session_id?: string | null;
  linked_chat_event_id?: string | null;
  question_snapshot?: string | null;
  answer_snapshot?: string | null;
  resolution_note?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
};

export type Conversation = {
  session_id: string;
  client_id: string;
  user_id?: string | null;
  channel: string;
  started_at: string;
  latest_event_at?: string | null;
  event_count: number;
  user_message_count: number;
  no_source_count: number;
  error_count: number;
  multi_intent_count: number;
  last_knowledge_group?: string | null;
  last_major?: string | null;
  latest_user_message?: string | null;
};

export type Lead = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  interested_major?: string | null;
  province?: string | null;
  lead_status: string;
  assigned_to?: string | null;
  created_at: string;
};

export type KbDocument = {
  id: string;
  client_id: string;
  document_name: string;
  source_id?: string | null;
  source_url?: string | null;
  knowledge_group?: string | null;
  year?: number | null;
  round_no?: number | null;
  actual_status?: string | null;
  indexing_status?: string | null;
  metadata_check_status: string;
  sync_status: string;
  chunk_count?: number | null;
  updated_at: string;
};

export type Client = {
  client_id?: string;
  id?: string;
  client_code?: string;
  display_name: string;
  short_name?: string | null;
  status: string;
  plan_code?: string;
  contract_end_at?: string | null;
  monthly_question_limit?: number;
  question_count?: number;
  website_url?: string | null;
  province?: string | null;
  primary_color?: string | null;
};

export type NotificationItem = {
  id: string;
  title: string;
  message?: string | null;
  notification_type: string;
  resource_type?: string | null;
  resource_id?: string | null;
  is_read: number;
  created_at: string;
};

export type ApiList<T> = { success: boolean; results: T[] };


export type AdmissionRound = {
  id: string;
  client_id: string;
  year: number;
  round_no: number;
  round_name: string;
  status: 'upcoming'|'open'|'closed'|'cancelled';
  starts_at?: string|null;
  ends_at?: string|null;
  is_current: number;
  updated_at?: string;
};

export type AdmissionBenchmark = {
  id: string;
  client_id: string;
  year: number;
  round_no: number;
  major_code: string;
  major_name: string;
  block_code: string;
  method_code: string;
  min_score: number;
  status: 'active'|'inactive'|'archived';
  source_id?: string|null;
  note?: string|null;
  updated_at?: string;
};

export type ChannelSummary = { channel:'web_widget'|'messenger'|'zalo_oa'; session_count:number; user_count:number; question_count:number; latest_message_at?:string|null; };
export type ChannelIntegration = { id?:string; client_id:string; channel:'web_widget'|'messenger'|'zalo_oa'; display_name:string; status:string; external_account_id?:string|null; config?:Record<string,unknown>; has_credentials?:number; last_webhook_at?:string|null; last_message_at?:string|null; last_error?:string|null; };

export type ChatSurfaceConfig = {
  client_id:string; mode:'widget'|'full_page'; public_slug:string; custom_domain?:string|null;
  widget_enabled:number; full_page_enabled:number; header_style:string; background_type:string;
  background_value?:string|null; theme_json?:Record<string,unknown>; updated_at?:string;
};
