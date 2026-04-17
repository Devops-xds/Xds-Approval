import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { api, AuditLog, AuditLogFilters } from '@/lib/api';
import {
  ClipboardList,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  Banknote,
  Paperclip,
  X,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { toast } from 'sonner';

interface AuditLogViewProps {
  onViewRequest: (id: string) => void;
}

const AuditLogView: React.FC<AuditLogViewProps> = ({ onViewRequest }) => {
  const { colorTheme } = useAppContext();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const filters: AuditLogFilters = {};
      if (actionFilter !== 'all') filters.action = actionFilter;
      if (dateFrom) filters.fromUtc = new Date(dateFrom).toISOString();
      if (dateTo) filters.toUtc = new Date(dateTo).toISOString();
      const data = await api.getAuditLogs(filters);
      setLogs(data);
    } catch (err: any) {
      toast.error('Loading error', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (log) =>
        log.userName?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: enGB });
    } catch {
      return dateStr;
    }
  };

  const actionIcons: Record<string, React.ReactNode> = {
    Created: <FileText className="w-4 h-4" />,
    'CEO Approved Request': <CheckCircle2 className="w-4 h-4" />,
    'CEO Signed PV': <CheckCircle2 className="w-4 h-4" />,
    Approved: <CheckCircle2 className="w-4 h-4" />,
    'CEO Rejected': <XCircle className="w-4 h-4" />,
    Rejected: <XCircle className="w-4 h-4" />,
    'Finance Prepared PV': <Banknote className="w-4 h-4" />,
    'Finance Manager Authorized PV': <Banknote className="w-4 h-4" />,
    'Upload Attachment': <Paperclip className="w-4 h-4" />,
    AttachmentUploaded: <Paperclip className="w-4 h-4" />,
  };

  const actionColors: Record<string, string> = {
    Created: 'bg-slate-600',
    'CEO Approved Request': 'bg-emerald-500',
    'CEO Signed PV': 'bg-emerald-700',
    Approved: 'bg-emerald-500',
    'CEO Rejected': 'bg-red-500',
    Rejected: 'bg-red-500',
    'Finance Prepared PV': 'bg-emerald-500',
    'Finance Manager Authorized PV': 'bg-green-500',
    'Upload Attachment': 'bg-emerald-500',
    AttachmentUploaded: 'bg-emerald-500',
  };

  const actionLabels: Record<string, string> = {
    Created: 'Created',
    'CEO Approved Request': 'CEO approved request',
    'CEO Signed PV': 'CEO signed PV',
    Approved: 'Approved',
    'CEO Rejected': 'CEO rejected',
    Rejected: 'Rejected',
    'Finance Prepared PV': 'Finance prepared PV',
    'Finance Manager Authorized PV': 'Finance Manager authorized PV',
    'Upload Attachment': 'Attachment uploaded',
    AttachmentUploaded: 'Attachment uploaded',
    all: 'All',
  };

  const actions = ['all', 'Created', 'CEO Approved Request', 'Finance Prepared PV', 'Finance Manager Authorized PV', 'CEO Signed PV', 'CEO Rejected', 'Upload Attachment'];
  const themeClasses: Record<string, {
    title: string;
    input: string;
    filterButton: string;
    activeAction: string;
    rowHover: string;
    viewLink: string;
  }> = {
    emerald: {
      title: 'text-emerald-700',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      filterButton: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      activeAction: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      rowHover: 'hover:bg-emerald-50/40',
      viewLink: 'text-emerald-700 hover:text-emerald-800',
    },
    ocean: {
      title: 'text-emerald-700',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      filterButton: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      activeAction: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      rowHover: 'hover:bg-emerald-50/40',
      viewLink: 'text-emerald-700 hover:text-emerald-800',
    },
    sunset: {
      title: 'text-emerald-700',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      filterButton: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      activeAction: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      rowHover: 'hover:bg-emerald-50/40',
      viewLink: 'text-emerald-700 hover:text-emerald-800',
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className={`text-2xl font-bold ${themeClasses[colorTheme].title}`}>Audit log</h1>
        <button
          onClick={loadLogs}
          className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${themeClasses[colorTheme].input}`}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 ${themeClasses[colorTheme].input}`}
              placeholder="From"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={`px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 ${themeClasses[colorTheme].input}`}
              placeholder="To"
            />
            <button
              onClick={loadLogs}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${themeClasses[colorTheme].filterButton}`}
            >
              Filter
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {actions.map((action) => (
            <button
              key={action}
              onClick={() => { setActionFilter(action); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                actionFilter === action
                  ? themeClasses[colorTheme].activeAction
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
              }`}
            >
              {actionLabels[action] || action}
            </button>
          ))}
        </div>
      </div>

      {/* Log List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No logs found</p>
            <p className="text-slate-400 text-sm mt-1">Actions will be recorded here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-4 transition-colors ${themeClasses[colorTheme].rowHover}`}
              >
                <div className="flex gap-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white ${actionColors[log.action] || 'bg-slate-400'}`}>
                    {actionIcons[log.action] || <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {actionLabels[log.action] || log.action}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">by {log.userName}</span>
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{log.details}</p>
                    )}
                    <button
                      onClick={() => onViewRequest(log.paymentRequestId)}
                      className={`text-xs font-medium mt-1.5 inline-flex items-center gap-1 ${themeClasses[colorTheme].viewLink}`}
                    >
                      <FileText className="w-3 h-3" />
                      View request
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogView;
