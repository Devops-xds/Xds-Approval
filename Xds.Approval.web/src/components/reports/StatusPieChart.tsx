import React, { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Sector,
} from 'recharts';
import { PaymentRequest } from '@/lib/api';
import { PieChart as PieChartIcon } from 'lucide-react';

interface StatusPieChartProps {
  requests: PaymentRequest[];
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
  Approved: 'Final Signed',
  Rejected: 'Rejected',
};

const StatusPieChart: React.FC<StatusPieChartProps> = ({ requests }) => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        status,
      }))
      .sort((a, b) => b.value - a.value);
  }, [requests]);

  const total = requests.length;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/50 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[item.payload.status] || '#94a3b8' }}
          />
          <p className="text-xs text-slate-500 font-medium">{item.name}</p>
        </div>
        <p className="text-sm font-bold text-slate-900">
          {item.value} ({pct}%)
        </p>
      </div>
    );
  };

  const renderActiveShape = (props: any) => {
    const {
      cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value,
    } = props;
    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
    return (
      <g>
        <text x={cx} y={cy - 8} textAnchor="middle" fill="#163434" fontSize={22} fontWeight="bold">
          {value}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#6b7c7c" fontSize={12}>
          {pct}%
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={outerRadius + 8}
          outerRadius={outerRadius + 11}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.3}
        />
      </g>
    );
  };

  const CustomLegend = ({ payload }: any) => (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-2">
      {payload?.map((entry: any, i: number) => (
        <button
          key={i}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          onMouseEnter={() => setActiveIndex(i)}
          onMouseLeave={() => setActiveIndex(undefined)}
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </button>
      ))}
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center text-white">
          <PieChartIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Status breakdown</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">{total} request{total > 1 ? 's' : ''} in total</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <PieChartIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No data</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_COLORS[entry.status] || '#94a3b8'}
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default StatusPieChart;
