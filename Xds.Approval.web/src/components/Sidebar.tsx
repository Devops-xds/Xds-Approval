import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  CheckCircle2,
  Banknote,
  ClipboardList,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  FileSearch,
  BarChart3,
} from 'lucide-react';

export type ViewType =
  | 'dashboard'
  | 'requests'
  | 'new-request'
  | 'approvals'
  | 'finance'
  | 'audit-logs'
  | 'verify-document'
  | 'reports'
  | 'request-detail';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  badge?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, onToggle }) => {
  const { user, logout } = useAuth();
  const { colorTheme } = useAppContext();
  const role = user?.role || 'User';

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      roles: ['User', 'CEO', 'Finance', 'HeadOfFinance'],
    },
    {
      id: 'requests',
      label: 'My requests',
      icon: <FileText className="w-5 h-5" />,
      roles: ['User', 'Finance', 'HeadOfFinance'],
    },
    {
      id: 'new-request',
      label: 'New request',
      icon: <PlusCircle className="w-5 h-5" />,
      roles: ['User'],
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: <CheckCircle2 className="w-5 h-5" />,
      roles: ['CEO'],
    },
    {
      id: 'finance',
      label: 'Finance workflow',
      icon: <Banknote className="w-5 h-5" />,
      roles: ['Finance', 'HeadOfFinance'],
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <BarChart3 className="w-5 h-5" />,
      roles: ['CEO', 'Finance', 'HeadOfFinance'],
    },
    {
      id: 'audit-logs',
      label: 'Audit log',
      icon: <ClipboardList className="w-5 h-5" />,
      roles: ['User', 'Finance', 'HeadOfFinance'],
    },
    {
      id: 'verify-document',
      label: 'Verify document',
      icon: <FileSearch className="w-5 h-5" />,
      roles: ['User', 'CEO', 'Finance', 'HeadOfFinance'],
    },
  ];


  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  const roleColors: Record<string, string> = {
    User: 'bg-emerald-500/10 text-emerald-300',
    CEO: 'bg-emerald-500/10 text-emerald-300',
    Finance: 'bg-emerald-500/10 text-emerald-400',
    HeadOfFinance: 'bg-green-500/10 text-green-300',
  };

  const roleLabels: Record<string, string> = {
    User: 'User',
    CEO: 'Chief Executive Officer',
    Finance: 'Finance Staff',
    HeadOfFinance: 'Finance Manager',
  };

  const sidebarThemeClasses: Record<string, { shell: string; avatar: string; active: string; activeIcon: string }> = {
    emerald: {
      shell: 'from-emerald-950 via-emerald-900 to-green-800',
      avatar: 'from-emerald-500 to-green-500',
      active: 'bg-emerald-500/12 text-emerald-300',
      activeIcon: 'text-emerald-300',
    },
    ocean: {
      shell: 'from-emerald-950 via-emerald-900 to-green-800',
      avatar: 'from-emerald-500 to-green-500',
      active: 'bg-emerald-500/12 text-emerald-300',
      activeIcon: 'text-emerald-300',
    },
    sunset: {
      shell: 'from-emerald-950 via-emerald-900 to-green-800',
      avatar: 'from-emerald-500 to-green-500',
      active: 'bg-emerald-500/12 text-emerald-300',
      activeIcon: 'text-emerald-300',
    },
  };

  const sidebarTheme = sidebarThemeClasses[colorTheme];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Mobile toggle button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gradient-to-b ${sidebarTheme.shell} z-50 transition-all duration-300 flex flex-col
          ${isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0 lg:w-20'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center flex-shrink-0 p-2">
                <img src={`${import.meta.env.BASE_URL}assets/xdslogo_green.png`} alt="XDS logo" className="max-h-full max-w-full object-contain" />
              </div>
              <span className={`text-white font-bold text-lg tracking-tight transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 lg:hidden'}`}>
                XDS Approval
              </span>
            </div>
            <button
              onClick={onToggle}
              className="hidden lg:flex w-7 h-7 rounded-lg bg-slate-800 items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${!isOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* User info */}
        <div className={`p-4 border-b border-slate-800 ${isOpen ? '' : 'lg:px-3'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${sidebarTheme.avatar} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white text-sm font-bold">
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </span>
            </div>
            <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 lg:hidden'}`}>
              <p className="text-white text-sm font-medium truncate">{user?.fullName || user?.username}</p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${roleColors[role]}`}>
                {roleLabels[role]}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (window.innerWidth < 1024) onToggle();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive
                    ? sidebarTheme.active
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }
                  ${!isOpen ? 'lg:justify-center lg:px-0' : ''}
                `}
                title={!isOpen ? item.label : undefined}
              >
                <span className={`flex-shrink-0 ${isActive ? sidebarTheme.activeIcon : ''}`}>
                  {item.icon}
                </span>
                <span className={`transition-opacity duration-200 whitespace-nowrap ${isOpen ? 'opacity-100' : 'opacity-0 lg:hidden'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200
              ${!isOpen ? 'lg:justify-center lg:px-0' : ''}
            `}
            title={!isOpen ? 'Sign out' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 lg:hidden'}`}>
              Sign out
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
