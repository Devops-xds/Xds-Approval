import React, { useMemo } from 'react';
import { formatCurrencyAmount } from '@/lib/currency';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PaymentRequest } from '@/lib/api';
import { eachMonthOfInterval, format } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { BarChart3 } from 'lucide-react';

interface AmountBarChartProps {
  requests: PaymentRequest[];
  dateFrom: Date;
  dateTo: Date;
  currency: string;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  CEOApproved: '#10b981',
  FinancePrepared: '#22c55e',
  FinanceAuthorized: '#15803d',
  Approved: '#10b981',
  Rejected: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  Pending: 'Pending',
  CEOApproved: 'CEO Approved',
  FinancePrepared: 'Finance Prepared',
  FinanceAuthorized: 'Finance Authorized',
  Approved: 'Finalized',
  Rejected: 'Rejected',
};

const AmountBarChart: React.FC<AmountBarChartProps> = ({ requests, dateFrom, dateTo, currency }) => {
  const data = useMemo(() => {
    if (requests.length === 0) return [];

    const months = eachMonthOfInterval({ start: dateFrom, end: dateTo });
    return months.map((monthStart) => {
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
      const monthReqs = requests.filter((r) => {
        const d = new Date(r.createdAt);
        return d >= monthStart && d <= monthEnd;
      });

      const entry: Record<string, any> = {
        name: format(monthStart, 'MMM yyyy', { locale: enGB }),
      };

      ['Pending', 'CEOApproved', 'FinancePrepared', 'FinanceAuthorized', 'Approved', 'Rejected'].forEach((status) => {
        entry[status] = monthReqs
          .filter((r) => r.status === status)
          .reduce((sum, r) => sum + r.amount, 0);
      });

      entry.total = monthReqs.reduce((sum, r) => sum + r.amount, 0);
      return entry;
    });
  }, [requests, dateFrom, dateTo]);

  const formatAmount = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toString();
  };

  const formatCurrency = (amount: number) =>
    formatCurrencyAmount(amount, currency);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/50 px-4 py-3 min-w-[180px]">
        <p className="text-xs text-slate-500 font-medium mb-2">{label}</p>
        {payload.map((p: any) =>
          p.value > 0 ? (
            <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.fill }} />
                <span className="text-xs text-slate-600">{STATUS_LABELS[p.dataKey] || p.dataKey}</span>
              </div>
              <span className="text-xs font-semibold text-slate-900">{formatCurrency(p.value)}</span>
            </div>
          ) : null
        )}
        <div className="border-t border-slate-100 mt-2 pt-2 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Total</span>
          <span className="text-xs font-bold text-slate-900">{formatCurrency(total)}</span>
        </div>
      </div>
    );
  };

  const CustomLegend = ({ payload }: any) => (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-2">
      {payload?.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          {STATUS_LABELS[entry.value] || entry.value}
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center text-white">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Amounts by month</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">Breakdown by status ({currency})</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No data for this period</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe7e7" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6b7c7c' }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7c7c' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatAmount}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            {['Approved', 'FinanceAuthorized', 'FinancePrepared', 'CEOApproved', 'Pending', 'Rejected'].map((status) => (
              <Bar
                key={status}
                dataKey={status}
                stackId="amounts"
                fill={STATUS_COLORS[status]}
                radius={status === 'Rejected' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default AmountBarChart;
