import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useModules } from '../../context/ModulesContext';
import {
  LayoutDashboard, FolderOpen, Users,
  BookOpen, GitCompare, HardHat, Package, Zap,
  FileText, Calculator,
  TrendingUp, GitPullRequest, ClipboardList, BarChart2, GanttChartSquare,
  Settings, LogOut, Moon, Sun, ShieldCheck,
  Receipt, UserCog, Library, Layers, CheckSquare, MessageSquare,
  Lock, LayoutGrid, History, Sliders, Upload,
} from 'lucide-react';

import { SUPER_EMAILS, DEV_EMAIL } from '../../constants';
import Logo from '../Logo';

const PLAN_RANK = { free: 0, basic: 1, premium: 2 };

const NAV_GROUPS = [
  {
    items: [
      { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard', clientHidden: true },
      { to: '/app/projects',  icon: FolderOpen,      label: 'Projects',  module: 'projects', clientHidden: true },
      { to: '/app/contacts',  icon: Users,           label: 'Contacts',  module: 'contacts', clientHidden: true },
    ],
  },
  {
    heading: 'Pricing Libraries',
    clientHidden: true,
    items: [
      { to: '/app/qs-prices',          icon: BookOpen,       label: 'QS Prices',          plan: 'basic',   module: 'qs-prices' },
      { to: '/app/qs-comparison',      icon: GitCompare,     label: 'QS Comparison',      plan: 'basic',   module: 'qs-comparison' },
      { to: '/app/artisan-prices',     icon: HardHat,        label: 'Artisan Rates',      plan: 'basic',   module: 'artisan-prices' },
      { to: '/app/materials',          icon: Package,        label: 'Materials',          plan: 'basic',   module: 'materials' },
      { to: '/app/price-intelligence', icon: Zap,            label: 'Price Intelligence', plan: 'premium', module: 'price-intelligence' },
    ],
  },
  {
    heading: 'BOQ & Invoices',
    clientHidden: true,
    items: [
      { to: '/app/boq',                  icon: Layers,     label: 'BOQ Builder',         module: 'boq' },
      { to: '/app/estimator',            icon: Calculator, label: 'Project Estimator',   module: 'estimator' },
      { to: '/app/estimates',            icon: FileText,   label: 'Estimate History',    plan: 'basic',    module: 'estimates' },
      { to: '/app/historical-projects',  icon: History,    label: 'Historical Projects', plan: 'basic',    module: 'estimates' },
      { to: '/app/simulator',            icon: Sliders,    label: 'Cost Simulator',      plan: 'premium',  module: 'estimator' },
      { to: '/app/invoices',             icon: FileText,   label: 'Invoices',            module: 'invoices' },
    ],
  },
  {
    heading: 'Client Portal',
    clientOnly: true,
    items: [
      { to: '/app/client-portal',   icon: LayoutDashboard, label: 'My Projects' },
      { to: '/app/client-boq',      icon: CheckSquare,     label: 'BOQ Approval' },
      { to: '/app/client-invoices', icon: FileText,        label: 'My Invoices' },
      { to: '/app/client-comments', icon: MessageSquare,   label: 'Comments' },
    ],
  },
  {
    heading: 'Documents',
    items: [
      { to: '/app/documents', icon: Library, label: 'Document Library', module: 'documents' },
    ],
  },
  {
    heading: 'Execution',
    items: [
      { to: '/app/programme',      icon: GanttChartSquare, label: 'Programme of Works', plan: 'basic', module: 'programme' },
      { to: '/app/progress',       icon: TrendingUp,     label: 'Progress Tracker', plan: 'premium', module: 'progress' },
      { to: '/app/change-orders',  icon: GitPullRequest, label: 'Change Orders',    plan: 'premium', module: 'change-orders' },
      { to: '/app/site-reports',   icon: ClipboardList,  label: 'Site Reports',     plan: 'premium', module: 'site-reports' },
      { to: '/app/expenses',       icon: Receipt,        label: 'Expense Tracker',  plan: 'premium', module: 'expenses', clientHidden: true },
      { to: '/app/analytics',      icon: BarChart2,      label: 'Analytics',        plan: 'premium', module: 'analytics', clientHidden: true },
    ],
  },
  {
    heading: 'Admin',
    items: [
      { to: '/app/team',          icon: UserCog,    label: 'Team Management', adminOnly: true },
      { to: '/app/master-import', icon: Upload,     label: 'Master Import',    adminOnly: true },
      { to: '/app/settings',      icon: Settings,   label: 'Company Settings', clientHidden: true },
    ],
  },
];

const ROLE_LABEL = {
  admin:           'Administrator',
  qs:              'Quantity Surveyor',
  project_manager: 'Project Manager',
  client:          'Client',
};

const ROLE_COLOR = {
  admin:           'bg-blue-500',
  qs:              'bg-purple-500',
  project_manager: 'bg-green-500',
  client:          'bg-orange-500',
};

const linkCls = (isActive) =>
  `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-blue-600 text-white' : 'text-blue-200 hover:bg-primary-800 hover:text-white'
  }`;

export default function Sidebar({ onClose }) {
  const { user, logout }             = useAuth();
  const { dark, toggle: toggleDark } = useTheme();
  const { activeModules }            = useModules();
  const navigate                     = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); onClose?.(); };

  return (
    <aside className="w-64 h-screen bg-primary-900 text-white flex flex-col">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-primary-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <Logo size={36} />
          <div className="leading-tight">
            <p className="text-sm font-bold leading-tight">SquareMetre</p>
            <p className="text-xs text-blue-300">BOQ and Project Management</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto min-h-0 space-y-4">
        {NAV_GROUPS.map((group, gi) => {
          const isClient = user?.role === 'client';
          if (group.clientHidden && isClient) return null;
          if (group.clientOnly && !isClient) return null;
          const visibleItems = group.items.filter((item) => {
            if (item.adminOnly && user?.role !== 'admin') return false;
            if (item.clientHidden && isClient) return false;
            if (item.module && !activeModules.includes(item.module)) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={gi}>
              {group.heading && (
                <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400 select-none">
                  {group.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map(({ to, icon: Icon, label, plan: requiredPlan }) => {
                  const trialDaysLeft = user?.createdAt
                    ? Math.max(0, Math.ceil((new Date(user.createdAt).getTime() + 7 * 86400000 - Date.now()) / 86400000))
                    : 0;
                  const isLocked = requiredPlan &&
                    user?.email !== DEV_EMAIL &&
                    trialDaysLeft === 0 &&
                    (PLAN_RANK[user?.plan || 'free'] < PLAN_RANK[requiredPlan]);
                  if (isLocked) {
                    return (
                      <div key={to}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-blue-400/50 cursor-not-allowed select-none">
                        <Icon size={15} className="shrink-0" />
                        <span className="flex-1">{label}</span>
                        <Lock size={11} className="shrink-0 opacity-60" />
                      </div>
                    );
                  }
                  return (
                    <NavLink key={to} to={to} onClick={onClose}
                      className={({ isActive }) => linkCls(isActive)}>
                      <Icon size={15} className="shrink-0" />
                      {label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Owner Dashboard link — super users only */}
      {SUPER_EMAILS.includes(user?.email) && (
        <div className="px-2 pb-1 shrink-0">
          <NavLink to="/app/owner" onClick={onClose}
            className={({ isActive }) => `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-blue-200 hover:bg-primary-800 hover:text-white'}`}>
            <LayoutGrid size={15} className="shrink-0" />
            Owner Dashboard
          </NavLink>
        </div>
      )}

      {/* Launch Waitlist link — super users + dev account only */}
      {(SUPER_EMAILS.includes(user?.email) || user?.email === DEV_EMAIL) && (
        <div className="px-2 pb-1 shrink-0">
          <NavLink to="/app/waitlist" onClick={onClose}
            className={({ isActive }) => `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-blue-200 hover:bg-primary-800 hover:text-white'}`}>
            <Users size={15} className="shrink-0" />
            Launch Waitlist
          </NavLink>
        </div>
      )}

      {/* Trial countdown */}
      {user?.email !== DEV_EMAIL && (PLAN_RANK[user?.plan || 'free'] === 0) && (() => {
        const daysLeft = user?.createdAt
          ? Math.max(0, Math.ceil((new Date(user.createdAt).getTime() + 7 * 86400000 - Date.now()) / 86400000))
          : 0;
        if (daysLeft === 0) return null;
        const urgent = daysLeft <= 3;
        return (
          <div className={`mx-2 mb-2 px-3 py-2 rounded-lg text-xs ${urgent ? 'bg-amber-500/20 text-amber-300' : 'bg-primary-800 text-blue-300'}`}>
            <p className="font-semibold">Free Trial</p>
            <p>{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining</p>
          </div>
        );
      })()}

      {/* Footer */}
      <div className="px-2 py-3 border-t border-primary-800 shrink-0">
        <NavLink to="/app/profile" className="px-2 py-2 mb-1.5 flex items-center gap-2.5 rounded-lg hover:bg-primary-800 transition-colors">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className={`w-8 h-8 rounded-full ${ROLE_COLOR[user?.role] ?? 'bg-gray-500'} flex items-center justify-center shrink-0 text-white font-bold text-sm`}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <div className="flex items-center gap-1">
              <ShieldCheck size={10} className="text-blue-400 shrink-0" />
              <p className="text-xs text-blue-300 truncate">{ROLE_LABEL[user?.role] ?? user?.role}</p>
            </div>
          </div>
        </NavLink>

        <button onClick={toggleDark}
          className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-sm text-blue-200 hover:bg-primary-800 hover:text-white transition-colors mb-0.5">
          {dark ? <Sun size={15} /> : <Moon size={15} />}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-sm text-blue-200 hover:bg-primary-800 hover:text-white transition-colors">
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </aside>
  );
}
