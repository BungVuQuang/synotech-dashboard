const humanize = (value?: string | null) => String(value || 'khac').replace(/_/g, ' ').trim();

const knowledgeGroups: Record<string, string> = {
  admission: 'Tuyển sinh',
  tuition: 'Học phí và lệ phí',
  major: 'Ngành và chương trình đào tạo',
  academic: 'Quy chế học tập',
  exam: 'Thi cử và đánh giá',
  graduation: 'Tốt nghiệp',
  clinical: 'Thực tập và lâm sàng',
  online_learning: 'Học trực tuyến',
  student_policy: 'Chính sách sinh viên',
  campus: 'Đời sống và cơ sở vật chất',
  contact: 'Thông tin liên hệ',
  direct_consultation: 'Tư vấn trực tiếp',
  legal_policy: 'Văn bản và quy định',
  fallback: 'Nội dung khác',
  multi: 'Câu hỏi nhiều nội dung',
  unknown: 'Chưa xác định',
  other: 'Nội dung khác',
};

const topics: Record<string, string> = {
  dang_ky_tin_chi: 'Đăng ký tín chỉ',
  ho_so_tuyen_sinh: 'Hồ sơ tuyển sinh',
  quy_dinh_ao_blouse: 'Quy định áo blouse',
  ao_blouse: 'Quy định áo blouse',
  phuc_khao: 'Phúc khảo',
  thoi_luong_hoc_truc_tuyen: 'Thời lượng học trực tuyến',
  dieu_kien_xet_tuyen: 'Điều kiện xét tuyển',
  phuong_thuc_xet_tuyen: 'Phương thức xét tuyển',
  chi_tieu_tuyen_sinh: 'Chỉ tiêu tuyển sinh',
  nganh_dao_tao: 'Ngành đào tạo',
  diem_chuan: 'Điểm chuẩn',
  hoc_phi: 'Học phí',
  hoc_phi_nganh: 'Học phí',
  le_phi: 'Học phí và lệ phí',
  hoc_bong: 'Học bổng',
  lich_thi: 'Lịch thi',
  quy_che_thi: 'Quy chế thi',
  tot_nghiep: 'Điều kiện tốt nghiệp',
  thuc_tap_lam_sang: 'Thực tập lâm sàng',
  chinh_sach_sinh_vien: 'Chính sách sinh viên',
  lien_he: 'Thông tin liên hệ',
  tu_van_truc_tiep: 'Tư vấn trực tiếp',
  dao_tao_truc_tuyen: 'Học trực tuyến',
  quy_dinh_noi_quy: 'Quy chế và nội quy',
  hoc_vu: 'Học vụ',
  co_hoi_viec_lam: 'Cơ hội việc làm',
  chuong_trinh_dao_tao: 'Chương trình đào tạo',
  khac: 'Nội dung khác',
  unknown: 'Chưa xác định',
};

const intents: Record<string, string> = {
  information: 'Tra cứu thông tin',
  compare: 'So sánh',
  eligibility: 'Kiểm tra điều kiện',
  procedure: 'Hướng dẫn thủ tục',
  deadline: 'Tra cứu thời hạn',
  score_check: 'Tra cứu điểm chuẩn',
  admission: 'Tư vấn tuyển sinh',
  fallback: 'Cần làm rõ',
  unknown: 'Chưa xác định',
};

const issueTypes: Record<string, string> = {
  wrong_answer: 'Câu trả lời không đúng',
  missing_source: 'Thiếu nguồn tham khảo',
  outdated_information: 'Thông tin đã cũ',
  wrong_citation: 'Nguồn trích dẫn không phù hợp',
  misclassification: 'Phân loại sai nội dung',
  no_response: 'Không trả lời được',
  ui_error: 'Lỗi hiển thị hoặc thao tác',
  knowledge_update: 'Cần bổ sung dữ liệu',
  other: 'Lý do khác',
};

const reviewStatuses: Record<string, string> = {
  unreviewed: 'Chưa xem xét',
  reviewing: 'Đang xem xét',
  needs_improvement: 'Cần cải thiện chatbot',
  not_chatbot_issue: 'Không phải lỗi chatbot',
  resolved: 'Đã xử lý',
};

const rootCauses: Record<string, string> = {
  wrong_answer: 'Chatbot trả lời sai',
  missing_knowledge: 'Kho tri thức còn thiếu',
  outdated_knowledge: 'Dữ liệu đã hết hiệu lực',
  retrieval_error: 'Tìm sai hoặc thiếu tài liệu',
  classification_error: 'Phân loại câu hỏi chưa đúng',
  ambiguous_question: 'Câu hỏi chưa rõ nghĩa',
  user_preference: 'Khác với kỳ vọng cá nhân',
  system_error: 'Lỗi hệ thống',
  other: 'Nguyên nhân khác',
};

const channelLabels: Record<string, string> = {
  web_widget: 'Website',
  messenger: 'Facebook Messenger',
  zalo_oa: 'Zalo OA',
};


const featureLabels: Record<string, string> = {
  chatbot: 'Chatbot',
  school_wide_rag: 'Tra cứu toàn trường',
  classification_analytics: 'Thống kê phân loại câu hỏi',
  knowledge_governance: 'Quản lý kho tri thức',
  rag_sources: 'Hiển thị nguồn tham khảo',
  unanswered_questions: 'Theo dõi câu hỏi chưa trả lời',
  lead_capture: 'Thu thập khách hàng tiềm năng',
  score_check: 'Tra cứu điểm chuẩn',
  dashboard: 'Trang quản trị',
};

const roleLabels: Record<string, string> = {
  super_admin: 'Quản trị hệ thống',
  client_admin: 'Quản trị khách hàng',
  user: 'Người dùng',
  assistant: 'Chatbot',
};

const auditActions: Record<string, string> = {
  create: 'Tạo mới', update: 'Cập nhật', delete: 'Xóa', upsert: 'Thêm hoặc cập nhật',
  enable: 'Bật', disable: 'Tắt', archive: 'Lưu trữ', un_archive: 'Khôi phục',
  sync: 'Đồng bộ', update_metadata: 'Cập nhật thông tin mô tả', review: 'Xem xét phản hồi',
  activate: 'Kích hoạt', test: 'Kiểm tra kết nối', reset_password: 'Đặt lại mật khẩu',
  change_password: 'Đổi mật khẩu', login: 'Đăng nhập', logout: 'Đăng xuất',
};

const auditResources: Record<string, string> = {
  chat_feedback: 'Phản hồi câu trả lời', dashboard_user: 'Tài khoản', client: 'Khách hàng',
  chatbot_runtime: 'Cấu hình chatbot', kb_document: 'Tài liệu kho tri thức',
  kb_dataset: 'Kho dữ liệu', knowledge_base: 'Kho tri thức', admission_round: 'Đợt tuyển sinh',
  admission_benchmark: 'Điểm chuẩn', channel_integration: 'Kênh tích hợp',
  system_setting: 'Cấu hình hệ thống', service_request: 'Phản hồi và yêu cầu',
};

export function knowledgeGroupLabel(value?: string | null) {
  const key = String(value || 'unknown').toLowerCase();
  return knowledgeGroups[key] || 'Nhóm nội dung khác';
}

export function topicLabel(value?: string | null) {
  const key = String(value || 'unknown').toLowerCase();
  return topics[key] || 'Chủ đề khác';
}

export function intentLabel(value?: string | null) {
  const key = String(value || 'unknown').toLowerCase();
  return intents[key] || 'Mục đích khác';
}

export function issueTypeLabel(value?: string | null) {
  const key = String(value || 'other').toLowerCase();
  return issueTypes[key] || 'Lý do khác';
}

export function feedbackReviewStatusLabel(value?: string | null) {
  const key = String(value || 'unreviewed').toLowerCase();
  return reviewStatuses[key] || 'Chưa xem xét';
}

export function feedbackRootCauseLabel(value?: string | null) {
  if (!value) return 'Chưa xác định';
  const key = String(value).toLowerCase();
  return rootCauses[key] || 'Nguyên nhân khác';
}

export function channelLabel(value?: string | null) {
  const key = String(value || 'web_widget').toLowerCase();
  return channelLabels[key] || 'Kênh khác';
}

export function featureLabel(value?: string | null) {
  const key = String(value || '').toLowerCase();
  return featureLabels[key] || 'Tính năng khác';
}

export function roleLabel(value?: string | null) {
  const key = String(value || '').toLowerCase();
  return roleLabels[key] || 'Vai trò khác';
}

export function auditActionLabel(value?: string | null) {
  const key = String(value || '').toLowerCase();
  return auditActions[key] || 'Thao tác hệ thống';
}

export function auditResourceLabel(value?: string | null) {
  const key = String(value || '').toLowerCase();
  return auditResources[key] || 'Dữ liệu hệ thống';
}

export const KNOWLEDGE_GROUP_OPTIONS = Object.entries(knowledgeGroups)
  .filter(([key]) => !['unknown', 'other', 'multi'].includes(key))
  .map(([value, label]) => ({ value, label }));

export const FEEDBACK_REVIEW_STATUS_OPTIONS = Object.entries(reviewStatuses).map(([value, label]) => ({ value, label }));
export const FEEDBACK_ROOT_CAUSE_OPTIONS = Object.entries(rootCauses).map(([value, label]) => ({ value, label }));
