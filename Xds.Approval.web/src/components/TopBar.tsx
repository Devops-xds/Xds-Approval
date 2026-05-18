import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useTheme } from '@/components/theme-provider';
import { PaymentRequest } from '@/lib/api';
import { ViewType } from './Sidebar';
import { Bell, Moon, Sun } from 'lucide-react';
import { format } from 'date-fns';
import { enGB } from 'date-fns/locale';

interface TopBarProps {
  currentView: ViewType;
  sidebarOpen: boolean;
  requests: PaymentRequest[];
  onViewRequest: (id: string) => void;
}

interface NotificationItem {
  id: string;
  requestId: string;
  title: string;
  description: string;
  createdAt: string;
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

const TopBar: React.FC<TopBarProps> = ({ currentView, requests, onViewRequest }) => {
  const { user } = useAuth();
  const { cycleColorTheme } = useAppContext();
  const { theme, setTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

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

  const notificationStorageKey = useMemo(() => {
    if (!user) {
      return null;
    }

    return `pv-notifications-read:${user.role}:${user.username}`;
  }, [user]);

  const notifications = useMemo(() => {
    if (!user) {
      return [];
    }

    if (user.role === 'CEO') {
      return requests
        .filter((request) => request.status === 'FinancePrepared')
        .map<NotificationItem>((request) => ({
          id: `finance-prepared:${request.id}:ceo`,
          requestId: request.id,
          title: 'PV ready to review',
          description: `${request.title} has been prepared by Finance and is ready to view.`,
          createdAt: request.preparedAt || request.updatedAt || request.createdAt,
        }));
    }

    if (user.role === 'User') {
      return requests
        .filter((request) => request.status === 'FinancePrepared')
        .map<NotificationItem>((request) => ({
          id: `finance-prepared:${request.id}:requester`,
          requestId: request.id,
          title: 'PV created',
          description: `Finance has prepared the PV for ${request.title}.`,
          createdAt: request.preparedAt || request.updatedAt || request.createdAt,
        }));
    }

    return [];
  }, [requests, user]);

  useEffect(() => {
    if (!notificationStorageKey) {
      setReadNotificationIds([]);
      return;
    }

    try {
      const stored = window.localStorage.getItem(notificationStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      setReadNotificationIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setReadNotificationIds([]);
    }
  }, [notificationStorageKey]);

  const unreadNotifications = notifications.filter((item) => !readNotificationIds.includes(item.id));

  const markNotificationsAsRead = (notificationIds: string[]) => {
    if (!notificationStorageKey || notificationIds.length === 0) {
      return;
    }

    const merged = Array.from(new Set([...readNotificationIds, ...notificationIds]));
    setReadNotificationIds(merged);
    window.localStorage.setItem(notificationStorageKey, JSON.stringify(merged));
  };

  const handleToggleNotifications = () => {
    const nextOpen = !showNotifications;
    setShowNotifications(nextOpen);

    if (nextOpen) {
      markNotificationsAsRead(unreadNotifications.map((item) => item.id));
    }
  };

  const handleOpenRequest = (requestId: string) => {
    setShowNotifications(false);
    onViewRequest(requestId);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: enGB });
    } catch {
      return dateStr;
    }
  };

  return (
    <header className="h-16 bg-white/95 dark:bg-slate-950/95 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between pl-16 pr-3 sm:px-6 sticky top-0 z-30 backdrop-blur">
      <div className="min-w-0 flex items-center gap-3">
        <h2 className="truncate text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
          {headerTitle}
        </h2>
      </div>

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

        <button
          onClick={cycleColorTheme}
          className="hidden sm:flex relative w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 items-center justify-center text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
          title="Green theme"
        >
          <span className="h-3 w-3 rounded-full bg-emerald-600" />
        </button>

        <div className="relative">
          <button
            onClick={handleToggleNotifications}
            className="hidden sm:flex relative w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-900 items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-semibold flex items-center justify-center">
                {unreadNotifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[320px] rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
              </div>

              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500">
                  No new workflow notifications.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleOpenRequest(item.requestId)}
                        className="w-full px-4 py-3 text-left border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                          </div>
                          {!readNotificationIds.includes(item.id) && (
                            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">{formatDate(item.createdAt)}</p>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
