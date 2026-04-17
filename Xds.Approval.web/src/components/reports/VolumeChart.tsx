import React, { useState, useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { PaymentRequest } from '@/lib/api';
import { format, eachMonthOfInterval, eachWeekOfInterval } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { BarChart3, TrendingUp } from 'lucide-react';

interface VolumeChartProps {
  requests: PaymentRequest[];
  dateFrom: Date;
  dateTo: Date;
}

type Granularity = 'monthly' | 'weekly';

const VolumeChart: React.FC<VolumeChartProps> = ({ requests, dateFrom, dateTo }) => {
  const [granularity, setGranularity] = useState<Granularity>('monthly');

  const data = useMemo(() => {
    if (requests.length === 0) return [];

    const interval = { start: dateFrom, end: dateTo };

    if (granularity === 'monthly') {
      const months = eachMonthOfInterval(interval);
      return months.map((monthStart) => {
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
        const count = requests.filter((r) => {
          const d = new Date(r.createdAt);
          return d >= monthStart && d <= monthEnd;
        }).length;
        return {
          name: format(monthStart, 'MMM yyyy', { locale: enGB }),
          requests: count,
        };
      });
    } else {
      const weeks = eachWeekOfInterval(interval, { weekStartsOn: 1 });
      return weeks.map((weekStart) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59);
        const count = requests.filter((r) => {
          const d = new Date(r.createdAt);
          return d >= weekStart && d <= weekEnd;
        }).length;
        return {
          name: `W${format(weekStart, 'w', { locale: enGB })} ${format(weekStart, 'MMM', { locale: enGB })}`,
          requests: count,
        };
      });
    }
  }, [requests, dateFrom, dateTo, granularity]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/50 px-4 py-3">
        <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
        <p className="text-sm font-bold text-emerald-700">
          {payload[0].value} request{payload[0].value > 1 ? 's' : ''}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center text-white">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Request volume</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Trend over time</p>
          </div>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setGranularity('monthly')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              granularity === 'monthly'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setGranularity('weekly')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              granularity === 'weekly'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Weekly
          </button>
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
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              allowDecimals={false}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="requests"
              stroke="#059669"
              strokeWidth={2.5}
              fill="url(#colorVolume)"
              dot={{ r: 4, fill: '#15803d', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#15803d', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default VolumeChart;
