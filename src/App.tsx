import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { DashboardLayout } from './layout';
import {
  AccountPage, AdminOverviewPage, AdmissionDataPage, AnalyticsPage, AuditPage, ChatbotOperationsPage, ClientOverviewPage,
  ClientsPage, ConversationsPage, KnowledgeBasePage, LeadsPage, LoginPage, NotificationsPage,
  ReportsPage, SettingsPage, TicketsPage, UsersPage, ChannelsPage, TenantProductizationPage, AiObservabilityPage
} from './pages';
import { LoadingState } from './components';

function Protected({ role }: { role?: 'super_admin'|'client_admin' }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="full-loader"><LoadingState label="Đang kiểm tra phiên đăng nhập..."/></div>;
  if (!user) return <Navigate to="/login" replace/>;
  if (role && user.role !== role) return <Navigate to={user.role==='super_admin'?'/admin/overview':'/client/overview'} replace/>;
  const accountPath = user.role==='super_admin'?'/admin/account':'/client/account';
  if (user.must_change_password && location.pathname !== accountPath) return <Navigate to={accountPath} replace/>;
  return <DashboardLayout/>;
}

export default function App(){
  return <Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route element={<Protected role="client_admin"/>}>
      <Route path="/client/overview" element={<ClientOverviewPage/>}/>
      <Route path="/client/conversations" element={<ConversationsPage/>}/>
      <Route path="/client/channels" element={<ChannelsPage/>}/>
      <Route path="/client/tickets" element={<TicketsPage/>}/>
      <Route path="/client/leads" element={<LeadsPage/>}/>
      <Route path="/client/reports" element={<ReportsPage/>}/>
      <Route path="/client/notifications" element={<NotificationsPage/>}/>
      <Route path="/client/account" element={<AccountPage/>}/>
    </Route>
    <Route element={<Protected role="super_admin"/>}>
      <Route path="/admin/overview" element={<AdminOverviewPage/>}/>
      <Route path="/admin/clients" element={<ClientsPage/>}/>
      <Route path="/admin/chatbot" element={<ChatbotOperationsPage/>}/><Route path="/admin/productization" element={<TenantProductizationPage/>}/>
      <Route path="/admin/channels" element={<ChannelsPage admin/>}/>
      <Route path="/admin/admission" element={<AdmissionDataPage/>}/>
      <Route path="/admin/knowledge" element={<KnowledgeBasePage/>}/>
      <Route path="/admin/conversations" element={<ConversationsPage admin/>}/>
      <Route path="/admin/tickets" element={<TicketsPage admin/>}/>
      <Route path="/admin/analytics" element={<AnalyticsPage/>}/><Route path="/admin/ai-observability" element={<AiObservabilityPage admin/>}/>
      <Route path="/admin/users" element={<UsersPage/>}/>
      <Route path="/admin/audit" element={<AuditPage/>}/>
      <Route path="/admin/settings" element={<SettingsPage/>}/>
      <Route path="/admin/account" element={<AccountPage/>}/>
    </Route>
    <Route path="*" element={<RootRedirect/>}/>
  </Routes>;
}
function RootRedirect(){const {user}=useAuth();return <Navigate to={user?.role==='super_admin'?'/admin/overview':user?'/client/overview':'/login'} replace/>}
