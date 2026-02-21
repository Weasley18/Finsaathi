import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles, LayoutDashboard, Users, Shield, BarChart3, LogOut, Target,
  MessageSquare, BookOpen, Building2, Package, Activity, GraduationCap,
  PieChart, Calculator, Bell, TrendingUp, Cpu, Smartphone, Brain
} from 'lucide-react';
import { getAuthToken, setAuthToken, api } from './api';
import i18n from './i18n';
import './index.css';

// Pages
import LoginPage from './pages/LoginPage';
import UserDashboard from './pages/UserDashboard';
import ChatPage from './pages/ChatPage';
import GoalsPage from './pages/GoalsPage';
import LearnPage from './pages/LearnPage';
import HealthScorePage from './pages/HealthScorePage';
import ProfilePage from './pages/ProfilePage';
import AdvisorDashboard from './pages/advisor/Dashboard';
import ClientHealth from './pages/advisor/ClientHealth';
import CoPilotChat from './pages/advisor/CoPilotChat';
import AdvisorMessages from './pages/advisor/Messages';
import AdvisorChat from './pages/AdvisorChat';
import RecommendationsPage from './pages/RecommendationsPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminDashboard from './pages/admin/Dashboard';
import ContentManagement from './pages/admin/ContentManagement';
import AdvisorManagement from './pages/admin/AdvisorManagement';
import PendingApprovals from './pages/admin/PendingApprovals';
import PartnerDashboard from './pages/partner/Dashboard';
import PartnerProducts from './pages/partner/Products';
import WaitingRoom from './pages/WaitingRoom';
import OnboardingPage from './pages/OnboardingPage';
import PredictiveAnalysisPage from './pages/PredictiveAnalysisPage';
import TransactionImportPage from './pages/TransactionImportPage';

function Sidebar({ user, onLogout }) {
  const { t } = useTranslation();
  const role = user?.role || 'END_USER';

  const navItems = [
    // ─── End User Routes ─────────────────────────────
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['END_USER'] },
    { to: '/chat', icon: MessageSquare, label: 'AI Advisor', roles: ['END_USER'] },
    { to: '/advisor-chat', icon: Users, label: 'My Advisor', roles: ['END_USER'] },
    { to: '/recommendations', icon: TrendingUp, label: 'Recommendations', roles: ['END_USER'] },
    { to: '/goals', icon: Target, label: 'Savings Goals', roles: ['END_USER'] },
    { to: '/health', icon: Activity, label: 'Health Score', roles: ['END_USER'] },
    { to: '/learn', icon: GraduationCap, label: 'Learn', roles: ['END_USER'] },
    { to: '/analysis', icon: Brain, label: 'Predictive Analysis', roles: ['END_USER'] },
    { to: '/import-sms', icon: Smartphone, label: 'Import SMS', roles: ['END_USER'] },
    { to: '/notifications', icon: Bell, label: 'Notifications', roles: ['END_USER'] },
    { to: '/profile', icon: Users, label: 'Profile', roles: ['END_USER'] },

    // ─── Advisor Routes ──────────────────────────────
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADVISOR'] },
    { to: '/advisor', icon: Users, label: 'Client Panel', roles: ['ADVISOR'] },
    { to: '/advisor/copilot', icon: Cpu, label: 'AI Co-Pilot', roles: ['ADVISOR'] },
    { to: '/advisor/messages', icon: MessageSquare, label: 'Messages', roles: ['ADVISOR'] },
    { to: '/notifications', icon: Bell, label: 'Notifications', roles: ['ADVISOR'] },
    { to: '/profile', icon: Users, label: 'Profile', roles: ['ADVISOR'] },

    // ─── Admin Routes ────────────────────────────────
    { to: '/admin', icon: LayoutDashboard, label: 'Platform Overview', roles: ['ADMIN'] },
    { to: '/admin/approvals', icon: Shield, label: 'Pending Approvals', roles: ['ADMIN'] },
    { to: '/admin/advisors', icon: Shield, label: 'Advisor Mgmt', roles: ['ADMIN'] },
    { to: '/admin/content', icon: BookOpen, label: 'Content CMS', roles: ['ADMIN'] },
    { to: '/notifications', icon: Bell, label: 'Notifications', roles: ['ADMIN'] },

    // ─── Partner Routes ──────────────────────────────
    { to: '/partner', icon: Building2, label: 'Partner Dashboard', roles: ['PARTNER'] },
    { to: '/partner/products', icon: Package, label: 'Products', roles: ['PARTNER'] },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><Sparkles size={20} /></div>
        <h1>FinSaathi</h1>
      </div>

      <nav className="sidebar-nav">
        {navItems
          .filter(item => item.roles.includes(role))
          .map(item => (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-item" style={{ marginBottom: 8 }}>
          <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {user?.role?.replace('_', ' ') || 'User'}
            </div>
          </div>
        </div>
        <button className="nav-item" onClick={onLogout} style={{ color: 'var(--error)' }}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}

function ProtectedLayout({ user, onLogout }) {
  if (!getAuthToken()) return <Navigate to="/login" replace />;

  const isPending = user?.approvalStatus === 'PENDING' && (user?.role === 'ADVISOR' || user?.role === 'PARTNER');

  if (isPending) {
    return (
      <Routes>
        <Route path="/waiting-room" element={<WaitingRoom user={user} onLogout={onLogout} />} />
        <Route path="*" element={<Navigate to="/waiting-room" replace />} />
      </Routes>
    );
  }

  const isNewUser = !user?.name;

  if (isNewUser) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="main-content">
        <Routes>
          {/* End User */}
          <Route path="/" element={<UserDashboard />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/health" element={<HealthScorePage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/analysis" element={<PredictiveAnalysisPage />} />
          <Route path="/import-sms" element={<TransactionImportPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/advisor-chat" element={<AdvisorChat />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Advisor */}
          <Route path="/advisor" element={<AdvisorDashboard />} />
          <Route path="/advisor/client/:id" element={<ClientHealth />} />
          <Route path="/advisor/copilot" element={<CoPilotChat />} />
          <Route path="/advisor/messages" element={<AdvisorMessages />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/approvals" element={<PendingApprovals />} />
          <Route path="/admin/content" element={<ContentManagement />} />
          <Route path="/admin/advisors" element={<AdvisorManagement />} />

          {/* Partner */}
          <Route path="/partner" element={<PartnerDashboard />} />
          <Route path="/partner/products" element={<PartnerProducts />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getAuthToken()) {
      api.getMe().then(data => {
        const u = data.user || data;
        setUser(u);
        // Sync i18n language with user preference
        if (u.language && u.language !== 'en') {
          i18n.changeLanguage(u.language);
        }
        setLoading(false);
      }).catch(() => {
        setAuthToken(null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          getAuthToken() ? <Navigate to="/" replace /> : <LoginPage />
        } />
        <Route path="/*" element={
          <ProtectedLayout user={user} onLogout={handleLogout} />
        } />
      </Routes>
    </BrowserRouter>
  );
}
