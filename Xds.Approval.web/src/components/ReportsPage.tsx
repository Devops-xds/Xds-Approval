import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentRequest } from '@/lib/api';
import KpiCards, { KpiCardItem } from './reports/KpiCards';
import VolumeChart from './reports/VolumeChart';
import StatusPieChart from './reports/StatusPieChart';
import AmountBarChart from './reports/AmountBarChart';
import {
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  Filter,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { formatCurrencyAmount, formatCurrencyTotals } from '@/lib/currency';

interface ReportsPageProps {
  requests: PaymentRequest[];
  isLoading: boolean;
  onRefresh: () => void;
}

type PresetRange = '1m' | '3m' | '6m' | '12m' | 'all' | 'custom';

const ReportsPage: React.FC<ReportsPageProps> = ({ requests, isLoading, onRefresh }) => {
  const { colorTheme } = useAppContext();
  const { user } = useAuth();
  const role = user?.role || 'User';
  const now = new Date();
  const [presetRange, setPresetRange] = useState<PresetRange>('12m');
  const [customFrom, setCustomFrom] = useState(format(subMonths(now, 12), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(now, 'yyyy-MM-dd'));

  const { dateFrom, dateTo } = useMemo(() => {
    if (presetRange === 'custom') {
      return {
        dateFrom: new Date(customFrom),
        dateTo: new Date(customTo + 'T23:59:59'),
      };
    }
    if (presetRange === 'all' && requests.length > 0) {
      const dates = requests.map((r) => new Date(r.createdAt).getTime());
      return {
        dateFrom: startOfMonth(new Date(Math.min(...dates))),
        dateTo: endOfMonth(now),
      };
    }
    const monthsBack = presetRange === '1m' ? 1 : presetRange === '3m' ? 3 : presetRange === '6m' ? 6 : 12;
    return {
      dateFrom: startOfMonth(subMonths(now, monthsBack)),
      dateTo: endOfMonth(now),
    };
  }, [presetRange, customFrom, customTo, requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const d = new Date(r.createdAt);
      return d >= dateFrom && d <= dateTo;
    });
  }, [requests, dateFrom, dateTo]);

  const kpis = useMemo(() => {
    const total = filteredRequests.length;
    const totalAmount = filteredRequests.reduce((sum, r) => sum + r.amount, 0);
    const totalAmountLabel = formatCurrencyTotals(filteredRequests.map((request) => ({ amount: request.amount, currency: request.currency })));

    const finalSigned = filteredRequests.filter((r) => r.status === 'Approved');
    const finalSignedAmount = finalSigned.reduce((sum, r) => sum + r.amount, 0);
    const finalSignedAmountLabel = formatCurrencyTotals(finalSigned.map((request) => ({ amount: request.amount, currency: request.currency })));

    const avgDaysBetween = (items: PaymentRequest[], startSelector: (request: PaymentRequest) => string | undefined, endSelector: (request: PaymentRequest) => string | undefined) => {
      const durations = items
        .map((request) => {
          const start = startSelector(request);
          const end = endSelector(request);
          if (!start || !end) return null;

          return differenceInDays(new Date(end), new Date(start));
        })
        .filter((value): value is number => value !== null);

      if (durations.length === 0) {
        return null;
      }

      return durations.reduce((sum, value) => sum + value, 0) / durations.length;
    };

    if (role === 'Finance') {
      const awaitingPreparation = filteredRequests.filter((r) => r.status === 'CEOApproved');
      const preparedPipeline = filteredRequests.filter((r) => r.status === 'FinancePrepared' || r.status === 'FinanceAuthorized' || r.status === 'Approved');
      const awaitingPreparationAmountLabel = formatCurrencyTotals(awaitingPreparation.map((request) => ({ amount: request.amount, currency: request.currency })));
      const preparedPipelineAmountLabel = formatCurrencyTotals(preparedPipeline.map((request) => ({ amount: request.amount, currency: request.currency })));
      const prepLeadTime = avgDaysBetween(preparedPipeline, (r) => r.createdAt, (r) => r.preparedAt);
      const endToEndLeadTime = avgDaysBetween(finalSigned, (r) => r.createdAt, (r) => r.approvedAt ?? r.updatedAt);
      const throughputRate = total > 0 ? (preparedPipeline.length / total) * 100 : 0;

      const cards: KpiCardItem[] = [
        {
          label: 'Awaiting preparation',
          value: awaitingPreparation.length,
          subtitle: `${awaitingPreparationAmountLabel} waiting for Finance`,
          icon: 'file',
          gradient: 'from-amber-500 to-orange-500',
          text: 'text-amber-700',
        },
        {
          label: 'Prepared pipeline',
          value: preparedPipeline.length,
          subtitle: `${preparedPipelineAmountLabel} already handled by Finance`,
          icon: 'trend',
          gradient: 'from-emerald-500 to-green-500',
          text: 'text-emerald-700',
        },
        {
          label: 'Finance completion',
          value: `${throughputRate.toFixed(1)}%`,
          subtitle: 'share of requests prepared by Finance',
          icon: 'rate',
          gradient: 'from-emerald-500 to-emerald-600',
          text: 'text-emerald-700',
        },
        {
          label: 'Average prep delay',
          value: prepLeadTime === null ? 'N/A' : `${prepLeadTime.toFixed(1)} d`,
          subtitle: 'CEO approval to PV preparation',
          icon: 'time',
          gradient: 'from-slate-500 to-slate-700',
          text: 'text-slate-700',
        },
        {
          label: 'Ready for payment',
          value: finalSigned.length,
          subtitle: `${finalSignedAmountLabel} finally signed by CEO`,
          icon: 'done',
          gradient: 'from-emerald-500 to-green-500',
          text: 'text-emerald-700',
        },
        {
          label: 'End-to-end lead time',
          value: endToEndLeadTime === null ? 'N/A' : `${endToEndLeadTime.toFixed(1)} d`,
          subtitle: 'request creation to final CEO signature',
          icon: 'money',
          gradient: 'from-emerald-600 to-green-600',
          text: 'text-emerald-700',
        },
      ];

      return { cards };
    }

    if (role === 'HeadOfFinance') {
      const awaitingReview = filteredRequests.filter((r) => r.status === 'FinancePrepared');
      const reviewed = filteredRequests.filter((r) => r.status === 'FinanceAuthorized' || r.status === 'Approved');
      const awaitingReviewAmountLabel = formatCurrencyTotals(awaitingReview.map((request) => ({ amount: request.amount, currency: request.currency })));
      const reviewedAmountLabel = formatCurrencyTotals(reviewed.map((request) => ({ amount: request.amount, currency: request.currency })));
      const reviewLeadTime = avgDaysBetween(reviewed, (r) => r.preparedAt, (r) => r.authorizedAt);
      const signoffLeadTime = avgDaysBetween(finalSigned.filter((r) => r.authorizedAt), (r) => r.authorizedAt, (r) => r.approvedAt ?? r.updatedAt);
      const reviewRate = total > 0 ? (reviewed.length / total) * 100 : 0;

      const cards: KpiCardItem[] = [
        {
          label: 'Awaiting review',
          value: awaitingReview.length,
          subtitle: `${awaitingReviewAmountLabel} waiting for Finance Manager review`,
          icon: 'file',
          gradient: 'from-amber-500 to-orange-500',
          text: 'text-amber-700',
        },
        {
          label: 'Reviewed requests',
          value: reviewed.length,
          subtitle: `${reviewedAmountLabel} reviewed by Finance Manager`,
          icon: 'done',
          gradient: 'from-emerald-500 to-green-500',
          text: 'text-emerald-700',
        },
        {
          label: 'Review completion',
          value: `${reviewRate.toFixed(1)}%`,
          subtitle: 'share of requests reviewed by Finance Manager',
          icon: 'rate',
          gradient: 'from-emerald-500 to-emerald-600',
          text: 'text-emerald-700',
        },
        {
          label: 'Average review delay',
          value: reviewLeadTime === null ? 'N/A' : `${reviewLeadTime.toFixed(1)} d`,
          subtitle: 'PV preparation to Finance Manager authorization',
          icon: 'time',
          gradient: 'from-slate-500 to-slate-700',
          text: 'text-slate-700',
        },
        {
          label: 'Signed for payment',
          value: finalSigned.length,
          subtitle: `${finalSignedAmountLabel} returned after CEO signature`,
          icon: 'money',
          gradient: 'from-emerald-500 to-green-500',
          text: 'text-emerald-700',
        },
        {
          label: 'Post-review signoff delay',
          value: signoffLeadTime === null ? 'N/A' : `${signoffLeadTime.toFixed(1)} d`,
          subtitle: 'Finance Manager authorization to final CEO signature',
          icon: 'trend',
          gradient: 'from-emerald-600 to-green-600',
          text: 'text-emerald-700',
        },
      ];

      return { cards };
    }

    const completed = filteredRequests.filter((r) => r.status === 'Approved');
    const completedAmount = completed.reduce((sum, r) => sum + r.amount, 0);
    const inProgress = filteredRequests.filter((r) =>
      r.status === 'Pending' ||
      r.status === 'CEOApproved' ||
      r.status === 'FinancePrepared' ||
      r.status === 'FinanceAuthorized'
    );
    const inProgressAmountLabel = formatCurrencyTotals(inProgress.map((request) => ({ amount: request.amount, currency: request.currency })));
    const decided = filteredRequests.filter((r) => r.status === 'Approved' || r.status === 'Rejected');
    const approvalRate = decided.length > 0 ? (completed.length / decided.length) * 100 : 0;
    const avgProcessingDays = avgDaysBetween(completed, (r) => r.createdAt, (r) => r.approvedAt ?? r.updatedAt);

    const cards: KpiCardItem[] = [
      {
        label: 'Total requests',
        value: total,
        subtitle: 'for the selected period',
        icon: 'file',
        gradient: 'from-slate-500 to-slate-600',
        text: 'text-slate-700',
      },
      {
        label: 'Total amount',
        value: totalAmountLabel,
        subtitle: 'all requests',
        icon: 'money',
        gradient: 'from-emerald-600 to-emerald-700',
        text: 'text-emerald-700',
      },
      {
        label: 'Approval rate',
        value: `${approvalRate.toFixed(1)}%`,
        subtitle: 'approved / total decided',
        icon: 'rate',
        gradient: 'from-emerald-500 to-emerald-600',
        text: 'text-emerald-700',
      },
      {
        label: 'Average processing time',
        value: avgProcessingDays === null ? 'N/A' : `${avgProcessingDays.toFixed(1)} d`,
        subtitle: 'created -> CEO final signature',
        icon: 'time',
        gradient: 'from-slate-500 to-slate-700',
        text: 'text-slate-700',
      },
      {
        label: 'Processed amount',
        value: finalSignedAmountLabel,
        subtitle: 'completed payments',
        icon: 'done',
        gradient: 'from-emerald-500 to-green-600',
        text: 'text-emerald-700',
      },
      {
        label: 'Pending amount',
        value: inProgressAmountLabel,
        subtitle: 'currently in progress',
        icon: 'trend',
        gradient: 'from-emerald-500 to-green-600',
        text: 'text-emerald-700',
      },
    ];

    return { cards };
  }, [filteredRequests, role]);

  const presets: { value: PresetRange; label: string }[] = [
    { value: '1m', label: '1 month' },
    { value: '3m', label: '3 months' },
    { value: '6m', label: '6 months' },
    { value: '12m', label: '12 months' },
    { value: 'all', label: 'All' },
    { value: 'custom', label: 'Custom' },
  ];

  const themeClasses: Record<string, {
    title: string;
    export: string;
    exportShadow: string;
    activeFilter: string;
    input: string;
    requesterIcon: string;
    requesterRate: string;
    requesterBar: string;
  }> = {
    emerald: {
      title: 'text-emerald-700',
      export: 'bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300',
      exportShadow: 'shadow-emerald-900/15',
      activeFilter: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      requesterIcon: 'from-emerald-600 to-green-600',
      requesterRate: 'text-emerald-700',
      requesterBar: 'from-emerald-600 via-emerald-500 to-green-500',
    },
    ocean: {
      title: 'text-emerald-700',
      export: 'bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300',
      exportShadow: 'shadow-emerald-900/15',
      activeFilter: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      requesterIcon: 'from-emerald-600 to-green-600',
      requesterRate: 'text-emerald-700',
      requesterBar: 'from-emerald-600 via-emerald-500 to-green-500',
    },
    sunset: {
      title: 'text-emerald-700',
      export: 'bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300',
      exportShadow: 'shadow-emerald-900/15',
      activeFilter: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      requesterIcon: 'from-emerald-600 to-green-600',
      requesterRate: 'text-emerald-700',
      requesterBar: 'from-emerald-600 via-emerald-500 to-green-500',
    },
  };

  const handleExportCSV = () => {
    if (filteredRequests.length === 0) return;
    const headers = ['Title', 'Amount', 'Currency', 'Status', 'Requester', 'Department', 'Created date'];
    const rows = filteredRequests.map((r) => [
      r.title,
      r.amount.toString(),
      r.currency,
      r.status,
      r.requesterName,
      r.requesterDepartment || '',
      format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm'),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-report-${format(dateFrom, 'yyyyMMdd')}-${format(dateTo, 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border border-slate-100 dark:border-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border border-slate-100 dark:border-slate-800" />
          <div className="h-80 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border border-slate-100 dark:border-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${themeClasses[colorTheme].title}`}>Reports & Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Detailed analysis of payment requests ·{' '}
            <span className="font-medium text-slate-700">{filteredRequests.length}</span> request{filteredRequests.length > 1 ? 's' : ''} in the selected period
          </p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredRequests.length === 0}
            className={`flex-1 sm:flex-none px-3.5 py-2 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg ${themeClasses[colorTheme].export} ${themeClasses[colorTheme].exportShadow}`}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-slate-500">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Period:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {presets.map((p) => (
              <button
                key={p.value}
                onClick={() => setPresetRange(p.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  presetRange === p.value
                    ? `border ${themeClasses[colorTheme].activeFilter}`
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {presetRange === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 w-full sm:w-auto sm:items-center ml-0 sm:ml-2">
              <div className="relative min-w-0">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className={`w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 ${themeClasses[colorTheme].input}`}
                />
              </div>
              <span className="hidden sm:block text-slate-400 text-sm text-center">—</span>
              <div className="relative min-w-0">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className={`w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 ${themeClasses[colorTheme].input}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Active range display */}
        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 dark:text-slate-500">
            From{' '}
            <span className="font-medium text-slate-600">
              {format(dateFrom, 'dd MMMM yyyy', { locale: enGB })}
            </span>{' '}
            to{' '}
            <span className="font-medium text-slate-600">
              {format(dateTo, 'dd MMMM yyyy', { locale: enGB })}
            </span>
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiCards
        cards={kpis.cards}
        currency="GHS"
      />

      {/* Top Requesters Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center text-white">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Top requesters</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Ranking by total amount</p>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No data for this period</p>
        ) : (
          <TopRequestersTable requests={filteredRequests} colorTheme={colorTheme} />
        )}
      </div>

      {/* Charts Row 1: Volume + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VolumeChart
            requests={filteredRequests}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        </div>
        <div>
          <StatusPieChart requests={filteredRequests} />
        </div>
      </div>

      {/* Charts Row 2: Amount Bar */}
      <AmountBarChart
        requests={filteredRequests}
        dateFrom={dateFrom}
        dateTo={dateTo}
        currency="GHS"
      />
    </div>
  );
};

// Inline sub-component: Top requesters table
const TopRequestersTable: React.FC<{ requests: PaymentRequest[]; colorTheme: 'emerald' | 'ocean' | 'sunset' }> = ({ requests, colorTheme }) => {
  const data = useMemo(() => {
    const map: Record<string, { name: string; department?: string; count: number; total: number; approved: number }> = {};
    requests.forEach((r) => {
      const key = r.requesterId || r.requesterName;
      if (!map[key]) {
        map[key] = {
          name: r.requesterName,
          department: r.requesterDepartment,
          count: 0,
          total: 0,
          approved: 0,
        };
      }
      map[key].count++;
      map[key].total += r.amount;
      if (r.status === 'Approved') {
        map[key].approved++;
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [requests]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GHS', minimumFractionDigits: 0 }).format(amount);

  const maxTotal = data.length > 0 ? data[0].total : 1;
  const themeClasses: Record<string, { icon: string; rate: string; bar: string }> = {
    emerald: {
      icon: 'from-emerald-600 to-green-600',
      rate: 'text-emerald-700',
      bar: 'from-emerald-600 via-emerald-500 to-green-500',
    },
    ocean: {
      icon: 'from-emerald-600 to-green-600',
      rate: 'text-emerald-700',
      bar: 'from-emerald-600 via-emerald-500 to-green-500',
    },
    sunset: {
      icon: 'from-emerald-600 to-green-600',
      rate: 'text-emerald-700',
      bar: 'from-emerald-600 via-emerald-500 to-green-500',
    },
  };

  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const pct = (item.total / maxTotal) * 100;
        const approvalPct = item.count > 0 ? ((item.approved / item.count) * 100).toFixed(0) : '0';
        return (
          <div key={i} className="group">
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${themeClasses[colorTheme].icon} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white text-xs font-bold">{item.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{item.name}</p>
                    {item.department && (
                      <p className="text-xs text-slate-400 truncate">{item.department}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className="text-xs text-slate-400">
                      {item.count} request{item.count > 1 ? 's' : ''}
                    </span>
                    <span className={`text-xs font-medium ${themeClasses[colorTheme].rate}`}>{approvalPct}% approved</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.total)}</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${themeClasses[colorTheme].bar} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReportsPage;
