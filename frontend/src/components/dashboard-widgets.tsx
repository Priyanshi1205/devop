import React from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  Eye, 
  TrendingUp, 
  Activity, 
  Search, 
  Link, 
  MessageSquare, 
  CheckCircle, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface WidgetProps {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  subtitle: string;
  icon: 'seo' | 'geo' | 'visibility' | 'da' | 'traffic' | 'keywords' | 'health' | 'mentions' | 'competitor' | 'revenue';
}

const icons = {
  seo: ShieldCheck,
  geo: Sparkles,
  visibility: Eye,
  da: Link,
  traffic: TrendingUp,
  keywords: Search,
  health: Activity,
  mentions: MessageSquare,
  competitor: CheckCircle,
  revenue: DollarSign,
};

const colors = {
  seo: 'text-indigo-400 bg-indigo-500/10',
  geo: 'text-pink-400 bg-pink-500/10',
  visibility: 'text-purple-400 bg-purple-500/10',
  da: 'text-blue-400 bg-blue-500/10',
  traffic: 'text-emerald-400 bg-emerald-500/10',
  keywords: 'text-cyan-400 bg-cyan-500/10',
  health: 'text-teal-400 bg-teal-500/10',
  mentions: 'text-yellow-400 bg-yellow-500/10',
  competitor: 'text-rose-400 bg-rose-500/10',
  revenue: 'text-amber-400 bg-amber-500/10',
};

export const KpiWidget: React.FC<WidgetProps> = ({
  title,
  value,
  change,
  isPositive,
  subtitle,
  icon,
}) => {
  const IconComponent = icons[icon];
  const colorClass = colors[icon];

  return (
    <div className="glass-panel glass-card-hover p-5 rounded-2xl flex flex-col justify-between min-h-[140px] relative overflow-hidden">
      {/* Background radial accent glow */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full" />
      
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">{title}</span>
          <h3 className="text-2xl font-bold text-white mt-1 font-mono">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl ${colorClass}`}>
          <IconComponent className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 border-t border-slate-800/50 pt-3">
        <span className="text-[11px] text-slate-500 truncate mr-2">{subtitle}</span>
        <div className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          <span>{change}</span>
        </div>
      </div>
    </div>
  );
};
