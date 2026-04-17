import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { PaymentRequest } from '@/lib/api';
import { formatCurrencyAmount } from '@/lib/currency';
import StatusBadge from './StatusBadge';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { enGB } from 'date-fns/locale';

interface PaymentRequestListProps {
  requests: PaymentRequest[];
  isLoading: boolean;
  onViewRequest: (id: string) => void;
  title?: string;
  filterStatus?: string;
}

type SortField = 'createdAt' | 'amount' | 'title' | 'status';
type SortDir = 'asc' | 'desc';

const PaymentRequestList: React.FC<PaymentRequestListProps> = ({
  requests,
  isLoading,
  onViewRequest,
  title = 'Payment requests',
  filterStatus,
}) => {
  const { colorTheme } = useAppContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(filterStatus || 'all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filteredRequests = useMemo(() => {
    let result = [...requests];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.requesterName?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'amount':
          cmp = a.amount - b.amount;
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [requests, search, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredRequests.length / perPage);
  const paginatedRequests = filteredRequests.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />;
    return sortDir === 'asc' ? (
      <ArrowUp className={`w-3.5 h-3.5 ${themeClasses.sortIcon}`} />
    ) : (
      <ArrowDown className={`w-3.5 h-3.5 ${themeClasses.sortIcon}`} />
    );
  };

  const formatCurrency = (amount: number, currency = 'GHS') => {
    return formatCurrencyAmount(amount, currency);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: enGB });
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

  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'Pending', label: 'Pending' },
    { value: 'CEOApproved', label: 'CEO Approved' },
    { value: 'FinancePrepared', label: 'Finance Prepared' },
    { value: 'FinanceAuthorized', label: 'Finance Manager Authorized' },
    { value: 'Approved', label: 'Final CEO Signed' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  const themeClasses: Record<string, {
    sortIcon: string;
    input: string;
    activeFilter: string;
    title: string;
    rowHover: string;
    activePage: string;
  }> = {
    emerald: {
      sortIcon: 'text-emerald-600',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      activeFilter: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      title: 'text-emerald-700',
      rowHover: 'hover:bg-emerald-50/40',
      activePage: 'bg-emerald-50 text-emerald-700',
    },
    ocean: {
      sortIcon: 'text-emerald-600',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      activeFilter: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      title: 'text-emerald-700',
      rowHover: 'hover:bg-emerald-50/40',
      activePage: 'bg-emerald-50 text-emerald-700',
    },
    sunset: {
      sortIcon: 'text-emerald-600',
      input: 'focus:ring-emerald-500/20 focus:border-emerald-600',
      activeFilter: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      title: 'text-emerald-700',
      rowHover: 'hover:bg-emerald-50/40',
      activePage: 'bg-emerald-50 text-emerald-700',
    },
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 rounded-lg w-48 animate-pulse" />
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-xl mb-2 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${themeClasses[colorTheme].title}`}>{title}</h1>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by title, requester..."
              className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${themeClasses[colorTheme].input}`}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {statuses.map((s) => (
              <button
                key={s.value}
                onClick={() => { setStatusFilter(s.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  statusFilter === s.value
                    ? `border ${themeClasses[colorTheme].activeFilter}`
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {paginatedRequests.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No requests found</p>
            <p className="text-slate-400 text-sm mt-1">
              {search ? 'Try changing your search criteria' : 'Requests will appear here'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-3.5">
                      <button onClick={() => toggleSort('title')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200">
                        Title <SortIcon field="title" />
                      </button>
                    </th>
                    <th className="text-left px-5 py-3.5">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Requester</span>
                    </th>
                    <th className="text-left px-5 py-3.5">
                      <button onClick={() => toggleSort('amount')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200">
                        Amount <SortIcon field="amount" />
                      </button>
                    </th>
                    <th className="text-left px-5 py-3.5">
                      <button onClick={() => toggleSort('status')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200">
                        Status <SortIcon field="status" />
                      </button>
                    </th>
                    <th className="text-left px-5 py-3.5">
                      <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200">
                        Date <SortIcon field="createdAt" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedRequests.map((request) => (
                    <tr
                      key={request.id}
                      onClick={() => onViewRequest(request.id)}
                      className={`${themeClasses[colorTheme].rowHover} cursor-pointer transition-colors`}
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{request.title}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm text-slate-600 dark:text-slate-300">{request.requesterName}</p>
                          {request.requesterDepartment && (
                            <>
                              <span className="text-slate-300">·</span>
                              <p className="text-xs text-slate-400">{request.requesterDepartment}</p>
                            </>
                          )}
                        </div>
                        {getWorkflowSummary(request) && (
                          <p className="text-xs text-slate-400 mt-1">{getWorkflowSummary(request)}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(request.amount, request.currency || 'GHS')}</p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={request.status} size="sm" />
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(request.createdAt)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-50">
              {paginatedRequests.map((request) => (
                <button
                  key={request.id}
                  onClick={() => onViewRequest(request.id)}
                  className={`w-full p-4 ${themeClasses[colorTheme].rowHover} transition-colors text-left`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{request.title}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{request.requesterName}</p>
                        {request.requesterDepartment && (
                          <>
                            <span className="text-slate-300">·</span>
                            <p className="text-xs text-slate-400">{request.requesterDepartment}</p>
                          </>
                        )}
                      </div>
                      {getWorkflowSummary(request) && (
                        <p className="text-xs text-slate-400 mt-1">{getWorkflowSummary(request)}</p>
                      )}
                    </div>
                    <StatusBadge status={request.status} size="sm" />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(request.amount, request.currency || 'GHS')}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(request.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {filteredRequests.length} result{filteredRequests.length > 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                        page === p
                          ? themeClasses[colorTheme].activePage
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentRequestList;
