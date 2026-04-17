import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Clock, CheckCircle2, XCircle, Banknote } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  Pending: {
    label: 'Pending CEO Review',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  CEOApproved: {
    label: 'CEO Approved',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  FinancePrepared: {
    label: 'Prepared by Finance Manager',
    className: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    icon: <Banknote className="w-3.5 h-3.5" />,
  },
  FinanceAuthorized: {
    label: 'Authorized by Finance Manager',
    className: 'bg-teal-50 text-teal-800 border-teal-200',
    icon: <Banknote className="w-3.5 h-3.5" />,
  },
  Approved: {
    label: 'CEO Final Signed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  Rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { colorTheme } = useAppContext();
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: null,
  };

  const statusThemeOverrides: Record<string, Record<string, string>> = {
    ocean: {
      Approved: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      CEOApproved: 'bg-blue-50 text-blue-700 border-blue-200',
      FinancePrepared: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      FinanceAuthorized: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    sunset: {
      Approved: 'bg-teal-50 text-teal-700 border-teal-200',
      CEOApproved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      FinancePrepared: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      FinanceAuthorized: 'bg-teal-50 text-teal-700 border-teal-200',
    },
  };

  const className = statusThemeOverrides[colorTheme]?.[status] || config.className;

  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-full font-medium
        ${className}
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
      `}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

export default StatusBadge;
