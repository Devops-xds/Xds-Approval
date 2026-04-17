import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useTheme } from '@/components/theme-provider';
import { ViewType } from './Sidebar';
import { Bell, Moon, Sun } from 'lucide-react';

interface TopBarProps {
  currentView: ViewType;
  sidebarOpen: boolean;
}

const viewTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  requests: 'Payment requests',
  'new-request': 'New request',
  approvals: 'Approvals',
  finance: 'Finance processing',
  'audit-logs': 'Audit log',
  'verify-document': 'Document verification',
  reports: '',
  'request-detail': 'Request details',
};


const TopBar: React.FC<TopBarProps> = ({ currentView, sidebarOpen }) => {
  const { user } = useAuth();
  const { cycleColorTheme } = useAppContext();
  const { theme, setTheme } = useTheme();

  const greetingMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = (user?.fullName || user?.username || 'User').toUpperCase();
  const headerTitle = currentView === 'dashboard'
    ? `${greetingMessage()}, ${displayName}`
    : (viewTitles[currentView] || 'XDS Approval');

  return (
    <header className="h-16 bg-white/95 dark:bg-slate-950/95 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between pl-16 pr-3 sm:px-6 sticky top-0 z-30 backdrop-blur">
      {/* Left */}
      <div className="min-w-0 flex items-center gap-3">
        <h2 className="truncate text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
          {headerTitle}
        </h2>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <div className="flex h-11 items-center rounded-[18px] bg-[#d9d9df] dark:bg-slate-800 p-1">
          <button
            onClick={() => setTheme('light')}
            className={`flex h-9 items-center gap-2 rounded-[14px] px-4 text-sm font-semibold transition-all ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
            title="Light mode"
          >
            <Sun className="w-4 h-4" />
            <span>Light</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex h-9 items-center gap-2 rounded-[14px] px-4 text-sm font-semibold transition-all ${
              theme === 'dark'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
            title="Dark mode"
          >
            <Moon className="w-4 h-4" />
            <span>Dark</span>
          </button>
        </div>

        {/* Notifications */}
        <button
          onClick={cycleColorTheme}
          className="hidden sm:flex relative w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 items-center justify-center text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
          title="Green theme"
        >
          <span className="h-3 w-3 rounded-full bg-emerald-600" />
        </button>
        <button className="hidden sm:flex relative w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-900 items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          <Bell className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
