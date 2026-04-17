import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { PaymentRequest } from '@/lib/api';
import { formatCurrencyAmount, normalizeCurrencyCode } from '@/lib/currency';
import { getPaymentTypeLabel } from '@/lib/payment';
import StatusBadge from './StatusBadge';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { enGB } from 'date-fns/locale';

interface DashboardProps {
  requests: PaymentRequest[];
  isLoading: boolean;
  onViewRequest: (id: string) => void;
  onNavigate: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ requests, isLoading, onViewRequest, onNavigate }) => {
  const { user } = useAuth();
  const { colorTheme } = useAppContext();
  const role = user?.role || 'User';
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === 'Pending').length;
    const approved = requests.filter((r) => r.status === 'Approved').length;
    const ceoApproved = requests.filter((r) => r.status === 'CEOApproved').length;
    const rejected = requests.filter((r) => r.status === 'Rejected').length;
    const financePrepared = requests.filter((r) => r.status === 'FinancePrepared').length;
    const financeAuthorized = requests.filter((r) => r.status === 'FinanceAuthorized').length;
    const totalAmount = requests.reduce((sum, r) => sum + r.amount, 0);
    const averageAmount = total > 0 ? totalAmount / total : 0;
    const approvedAmount = requests
      .filter((r) => r.status === 'Approved' || r.status === 'CEOApproved' || r.status === 'FinanceAuthorized' || r.status === 'FinancePrepared')
      .reduce((sum, r) => sum + r.amount, 0);
    const nearestDeadlineRequest = [...requests]
      .filter((r) => r.deadline && (r.status === 'Pending' || r.status === 'CEOApproved' || r.status === 'FinancePrepared' || r.status === 'FinanceAuthorized'))
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];

    return { total, pending, approved, ceoApproved, rejected, financePrepared, financeAuthorized, totalAmount, averageAmount, approvedAmount, nearestDeadlineRequest };
  }, [requests]);

  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [requests]);

  const summaryCurrency = useMemo(() => {
    const currencies = Array.from(new Set(requests.map((request) => normalizeCurrencyCode(request.currency))));
    return currencies.length === 1 ? currencies[0] : null;
  }, [requests]);

  const formatCurrency = (amount: number, currency = 'GHS') => {
    return formatCurrencyAmount(amount, currency);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy', { locale: enGB });
    } catch {
      return dateStr;
    }
  };

  const getWorkflowSummary = (request: PaymentRequest) => {
    if (request.status === 'FinancePrepared' && request.preparedByUserName) {
      return `Prepared by ${request.preparedByUserName}`;
    }

    if (request.status === 'FinanceAuthorized' && request.authorizedByUserName) {
      return `Authorized by ${request.authorizedByUserName}`;
    }

    if (request.status === 'CEOApproved' && request.approvedByUserName) {
      return `Initial CEO approval by ${request.approvedByUserName}`;
    }

    if ((request.status === 'Approved' || request.status === 'Rejected') && request.approvedByUserName) {
      return `${request.status === 'Approved' ? 'Final CEO signature' : request.status} by ${request.approvedByUserName}`;
    }

    return null;
  };

  const statCards = [
    ...(role === 'Finance' || role === 'HeadOfFinance'
      ? [
          {
            label: 'Total requests',
            value: stats.total,
            icon: <FileText className="w-5 h-5" />,
            color: 'from-slate-500 to-slate-600',
            bgLight: 'bg-slate-50',
            textColor: 'text-slate-600',
          },
          {
            label: 'CEO approved',
            value: stats.ceoApproved,
            icon: <CheckCircle2 className="w-5 h-5" />,
            color: 'from-emerald-500 to-green-500',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-600',
          },
          {
            label: 'Finance prepared',
            value: stats.financePrepared,
            icon: <Banknote className="w-5 h-5" />,
            color: 'from-emerald-500 to-green-500',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-700',
          },
          {
            label: 'Finance authorized',
            value: stats.financeAuthorized,
            icon: <Banknote className="w-5 h-5" />,
            color: 'from-emerald-600 to-green-600',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-700',
          },
          {
            label: 'Final signed',
            value: stats.approved,
            icon: <CheckCircle2 className="w-5 h-5" />,
            color: 'from-emerald-600 to-teal-600',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-700',
          },
          {
            label: 'Total amount',
            value: summaryCurrency ? formatCurrency(stats.totalAmount, summaryCurrency) : 'Multiple currencies',
            icon: <TrendingUp className="w-5 h-5" />,
            color: 'from-emerald-600 to-teal-600',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-700',
            isAmount: true,
          },
        ]
      : [
          {
            label: 'Total requests',
            value: stats.total,
            icon: <FileText className="w-5 h-5" />,
            color: 'from-slate-500 to-slate-600',
            bgLight: 'bg-slate-50',
            textColor: 'text-slate-600',
          },
          {
            label: 'Pending',
            value: stats.pending,
            icon: <Clock className="w-5 h-5" />,
            color: 'from-amber-500 to-orange-500',
            bgLight: 'bg-amber-50',
            textColor: 'text-amber-600',
          },
          {
            label: 'CEO approved',
            value: stats.ceoApproved,
            icon: <CheckCircle2 className="w-5 h-5" />,
            color: 'from-emerald-500 to-green-500',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-600',
          },
          {
            label: 'Rejected',
            value: stats.rejected,
            icon: <XCircle className="w-5 h-5" />,
            color: 'from-red-500 to-rose-500',
            bgLight: 'bg-red-50',
            textColor: 'text-red-600',
          },
          {
            label: 'Finance authorized',
            value: stats.financeAuthorized,
            icon: <Banknote className="w-5 h-5" />,
            color: 'from-emerald-600 to-green-600',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-700',
          },
          {
            label: 'Total amount',
            value: summaryCurrency ? formatCurrency(stats.totalAmount, summaryCurrency) : 'Multiple currencies',
            icon: <TrendingUp className="w-5 h-5" />,
            color: 'from-emerald-600 to-teal-600',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-700',
            isAmount: true,
          },
        ]),
    ...(role === 'CEO'
      ? [
          {
            label: 'Average amount',
            value: summaryCurrency ? formatCurrency(stats.averageAmount, summaryCurrency) : 'Multiple currencies',
            icon: <TrendingUp className="w-5 h-5" />,
            color: 'from-emerald-600 to-green-600',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-700',
            isAmount: true,
          },
          {
            label: 'Nearest deadline',
            value: stats.nearestDeadlineRequest?.deadline ? formatDate(stats.nearestDeadlineRequest.deadline) : 'No deadline',
            icon: <Calendar className="w-5 h-5" />,
            color: 'from-amber-500 to-orange-500',
            bgLight: 'bg-amber-50',
            textColor: 'text-amber-700',
          },
        ]
      : []),
  ];

  const bannerThemeClasses: Record<string, { shell: string; text: string; button: string; link: string }> = {
    emerald: {
      shell: 'from-emerald-700 via-emerald-600 to-green-600',
      text: 'text-emerald-50/80',
      button: 'bg-white text-emerald-700 hover:bg-emerald-50',
      link: 'text-emerald-700 hover:text-emerald-800',
    },
    ocean: {
      shell: 'from-emerald-700 via-emerald-600 to-green-600',
      text: 'text-emerald-50/80',
      button: 'bg-white text-emerald-700 hover:bg-emerald-50',
      link: 'text-emerald-700 hover:text-emerald-800',
    },
    sunset: {
      shell: 'from-emerald-700 via-emerald-600 to-green-600',
      text: 'text-emerald-50/80',
      button: 'bg-white text-emerald-700 hover:bg-emerald-50',
      link: 'text-emerald-700 hover:text-emerald-800',
    },
  };

  const bannerTheme = bannerThemeClasses[colorTheme];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded-lg w-64 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      {role === 'User' && (
        <div className={`bg-gradient-to-r ${bannerTheme.shell} rounded-2xl p-5 sm:p-6 text-white`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">New payment request</h2>
              <p className={`${bannerTheme.text} text-sm mt-1`}>
                Create a request that starts with an initial CEO review
              </p>
            </div>
            <button
              onClick={() => onNavigate('new-request')}
              className={`w-full sm:w-auto justify-center px-5 py-2.5 font-semibold rounded-xl transition-colors flex items-center gap-2 ${bannerTheme.button}`}
            >
              Create request
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {role === 'CEO' && (stats.pending > 0 || stats.financeAuthorized > 0) && (
        <div className={`bg-gradient-to-r ${bannerTheme.shell} rounded-2xl p-5 sm:p-6 text-white`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{stats.pending + stats.financeAuthorized} request{stats.pending + stats.financeAuthorized > 1 ? 's' : ''} awaiting CEO action</h2>
              <p className={`${bannerTheme.text} text-sm mt-1`}>
                New requests and authorized PVs are waiting for your action
              </p>
            </div>
            <button
              onClick={() => onNavigate('approvals')}
              className={`w-full sm:w-auto justify-center px-5 py-2.5 font-semibold rounded-xl transition-colors flex items-center gap-2 ${bannerTheme.button}`}
            >
              View requests
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {(role === 'Finance' || role === 'HeadOfFinance') && (stats.ceoApproved > 0 || stats.financePrepared > 0) && (
        <div className={`bg-gradient-to-r ${bannerTheme.shell} rounded-2xl p-5 sm:p-6 text-white`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{role === 'HeadOfFinance' ? stats.financePrepared : stats.ceoApproved} request{(role === 'HeadOfFinance' ? stats.financePrepared : stats.ceoApproved) > 1 ? 's' : ''} in finance workflow</h2>
              <p className={`${bannerTheme.text} text-sm mt-1`}>
                {role === 'HeadOfFinance' ? 'Prepared PVs are ready for Finance Manager review' : 'CEO-approved requests are ready for PV preparation'}
              </p>
            </div>
            <button
              onClick={() => onNavigate('finance')}
              className={`w-full sm:w-auto justify-center px-5 py-2.5 font-semibold rounded-xl transition-colors flex items-center gap-2 ${bannerTheme.button}`}
            >
              Open workflow
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-md shadow-slate-200/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{card.label}</p>
                <p className={`text-2xl font-bold mt-2 ${card.textColor} ${card.isAmount ? 'text-xl' : ''}`}>
                  {card.value}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Requests */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Recent requests</h3>
          <button
            onClick={() => onNavigate('requests')}
            className={`text-sm font-medium flex items-center gap-1 ${bannerTheme.link}`}
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recentRequests.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No requests yet</p>
            <p className="text-slate-400 text-sm mt-1">Requests will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentRequests.map((request) => (
              <button
                key={request.id}
                onClick={() => onViewRequest(request.id)}
                className="w-full p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 self-start sm:self-center ${
                  request.status === 'Pending' ? 'bg-amber-50 text-amber-500' :
                  request.status === 'CEOApproved' ? 'bg-emerald-50 text-emerald-500' :
                  request.status === 'FinancePrepared' ? 'bg-cyan-50 text-cyan-600' :
                  request.status === 'FinanceAuthorized' ? 'bg-teal-50 text-teal-600' :
                  request.status === 'Approved' ? 'bg-emerald-50 text-emerald-500' :
                  request.status === 'Rejected' ? 'bg-red-50 text-red-500' :
                  'bg-slate-50 text-slate-600'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{request.title}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {request.paymentType && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        {getPaymentTypeLabel(request.paymentType)}
                      </span>
                    )}
                    {request.deadline && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                        <Calendar className="w-3 h-3" />
                        Deadline {formatDate(request.deadline)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">{request.requesterName}</span>
                    {request.requesterDepartment && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-400">{request.requesterDepartment}</span>
                      </>
                    )}
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(request.createdAt)}
                    </span>
                  </div>
                  {getWorkflowSummary(request) && (
                    <p className="text-xs text-slate-400 mt-1">{getWorkflowSummary(request)}</p>
                  )}
                </div>
                <div className="w-full sm:w-auto sm:text-right flex-shrink-0 flex items-center justify-between sm:block">
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(request.amount, request.currency || 'GHS')}</p>
                  <div className="mt-0 sm:mt-1">
                    <StatusBadge status={request.status} size="sm" />
                  </div>
                </div>
                <ArrowRight className="hidden sm:block w-4 h-4 text-slate-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {role !== 'CEO' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Workflow</h3>
          <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:justify-between">
            {[
              { step: '1', label: 'Created', desc: 'User', icon: <FileText className="w-5 h-5" />, color: 'bg-slate-600' },
              { step: '2', label: 'Initial approval', desc: 'CEO', icon: <CheckCircle2 className="w-5 h-5" />, color: 'bg-amber-500' },
              { step: '3', label: 'Prepare PV', desc: 'Finance', icon: <Banknote className="w-5 h-5" />, color: 'bg-cyan-500' },
              { step: '4', label: 'Authorize PV', desc: 'Finance Manager', icon: <Banknote className="w-5 h-5" />, color: 'bg-teal-500' },
              { step: '5', label: 'Final sign', desc: 'CEO', icon: <CheckCircle2 className="w-5 h-5" />, color: 'bg-emerald-500' },
            ].map((item, i, arr) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center text-center min-w-[100px]">
                  <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-white mb-3`}>
                    {item.icon}
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-slate-300 hidden sm:block flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
