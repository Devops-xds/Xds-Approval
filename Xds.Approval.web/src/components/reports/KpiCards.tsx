import React from 'react';
import { formatCurrencyAmount } from '@/lib/currency';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Banknote,
  FileText,
  Percent,
} from 'lucide-react';

type KpiIcon = 'file' | 'money' | 'rate' | 'time' | 'done' | 'trend';

export interface KpiCardItem {
  label: string;
  value: string | number;
  subtitle: string;
  icon: KpiIcon;
  gradient: string;
  text: string;
}

interface KpiCardsProps {
  cards: KpiCardItem[];
  currency: string;
}

const KpiCards: React.FC<KpiCardsProps> = ({
  currency,
  cards,
}) => {
  const iconMap: Record<KpiIcon, React.ReactNode> = {
    file: <FileText className="w-5 h-5" />,
    money: <Banknote className="w-5 h-5" />,
    rate: <Percent className="w-5 h-5" />,
    time: <Clock className="w-5 h-5" />,
    done: <CheckCircle2 className="w-5 h-5" />,
    trend: <TrendingUp className="w-5 h-5" />,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 hover:shadow-lg hover:shadow-slate-100/80 dark:hover:shadow-black/20 transition-all duration-300 group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{card.label}</p>
              <p className={`text-2xl font-bold mt-1.5 ${card.text} truncate`}>{card.value}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{card.subtitle}</p>
            </div>
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-slate-200/50 group-hover:scale-110 transition-transform duration-300`}
            >
              {iconMap[card.icon]}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default KpiCards;
