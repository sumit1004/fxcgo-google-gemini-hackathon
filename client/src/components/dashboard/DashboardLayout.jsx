import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  GitBranch, 
  TrendingUp, 
  FileCheck2, 
  MapPin, 
  CloudRain, 
  DollarSign, 
  FolderArchive, 
  Bookmark, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Shield,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/dashboard.css';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { section: 'OPERATIONS' },
    { name: 'Dashboard Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Create Trade Request', path: '/dashboard/create-trade', icon: PlusCircle },
    { name: 'Trade & Workflow Queue', path: '/dashboard/trades', icon: GitBranch },

    { section: 'RISK & HEDGING' },
    { name: 'Currency Risk Exposure', path: '/dashboard/currency-risk', icon: TrendingUp },
    { name: 'Forward Contracts', path: '/dashboard/forward-contracts', icon: FileCheck2 },

    { section: 'LOGISTICS INTELLIGENCE' },
    { name: 'Route Optimization & Map', path: '/dashboard/routes', icon: MapPin },
    { name: 'Marine Weather Reports', path: '/dashboard/weather', icon: CloudRain },
    { name: 'Freight Cost Benchmarks', path: '/dashboard/freight', icon: DollarSign },

    { section: 'COMPLIANCE & REPORTS' },
    { name: 'Document Management', path: '/dashboard/documents', icon: FolderArchive },
    { name: 'Saved Intelligence Reports', path: '/dashboard/reports', icon: Bookmark },
    { name: 'Settings & Security', path: '/dashboard/settings', icon: Settings },
  ];

  // Helper to get active page title
  const getPageInfo = () => {
    const path = location.pathname;
    if (path === '/dashboard') return { title: 'Operational Command Terminal', subtitle: 'Real-time trade risk posture and active portfolio overview' };
    if (path.includes('/create-trade')) return { title: 'Initiate Trade Request', subtitle: 'Submit cargo logistics, currency parameters, and risk boundaries' };
    if (path.includes('/trades/')) return { title: 'Trade Analysis & Agent Pipeline', subtitle: 'Sequential execution: Agent 1 (Currency) → Agent 2 (Logistics)' };
    if (path.includes('/trades')) return { title: 'Trade Management Queue', subtitle: 'All active, completed, and pending trade workflows' };
    if (path.includes('/currency-risk')) return { title: 'Foreign Exchange Risk Matrix', subtitle: 'Currency exposure curves and Agent 1 forecasting integration' };
    if (path.includes('/forward-contracts')) return { title: 'Forward Contract Hedging', subtitle: 'Active, mature, and drafted foreign exchange forward contracts' };
    if (path.includes('/routes')) return { title: 'Maritime Route Intelligence', subtitle: 'Global waypoint routing, choke-point avoidance, and port transit' };
    if (path.includes('/weather')) return { title: 'Maritime Weather & Storm Alerts', subtitle: 'Live maritime conditions, severe swell risks, and delay projections' };
    if (path.includes('/freight')) return { title: 'Freight Cost & Mode Analysis', subtitle: 'Ocean freight vs Air freight rate benchmarking' };
    if (path.includes('/documents')) return { title: 'Document Vault & Customs', subtitle: 'Customs checklists, bills of lading, and certificate repository' };
    if (path.includes('/reports')) return { title: 'Saved Intelligence Reports', subtitle: 'Exportable trade analyses and audit-ready risk documentation' };
    if (path.includes('/settings')) return { title: 'Settings & Preferences', subtitle: 'Organization configuration, alert thresholds, and security' };
    return { title: 'FXCGO Terminal', subtitle: 'Trade Intelligence Platform' };
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="dashboard-root">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            FXC<span>GO</span>
          </div>
          <button 
            className="mobile-close-btn"
            style={{ display: 'none', color: '#FFF' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, idx) => {
            if (item.section) {
              return (
                <div key={idx} className="nav-section-label">
                  {item.section}
                </div>
              );
            }
            const Icon = item.icon;
            const isExact = item.path === '/dashboard';
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={isExact}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Info & Company ID */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name" title={user?.fullName}>
              {user?.fullName || 'Operator'}
            </div>
            <div className="user-company-id">
              {user?.companyId || 'FX-PENDING'} • {user?.accountType || 'EXPORTER'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{ color: 'var(--sidebar-muted)', padding: '6px', cursor: 'pointer' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ display: 'none', cursor: 'pointer', color: 'var(--deep-teal)' }}
              className="mobile-menu-trigger"
            >
              <Menu size={24} />
            </button>
            <div className="header-title-wrap">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>

          <div className="header-actions">
            <button
              onClick={() => navigate('/dashboard/create-trade')}
              className="btn-lime"
              style={{ padding: '0.6rem 1.1rem', fontSize: '0.85rem' }}
            >
              <PlusCircle size={16} />
              <span>Initiate Trade</span>
            </button>

            <NavLink
              to="/"
              target="_blank"
              className="btn-outline"
              style={{ padding: '0.6rem 0.9rem', fontSize: '0.82rem' }}
              title="Visit Landing Page"
            >
              <span>Site</span>
              <ExternalLink size={14} />
            </NavLink>
          </div>
        </header>

        {/* Page Content */}
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
