
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue: string;
  variant: 'green' | 'orange' | 'blue' | 'purple' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, variant }) => {
  const styles = {
    green: {
      border: 'border-emerald-500/20',
      glow: 'shadow-[0_0_30px_rgba(16,185,129,0.03)]',
      title: 'text-emerald-500/80',
      highlight: 'text-emerald-400',
      gradient: 'bg-emerald-500/5'
    },
    orange: {
      border: 'border-amber-500/20',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.03)]',
      title: 'text-amber-500/80',
      highlight: 'text-amber-400',
      gradient: 'bg-amber-500/5'
    },
    blue: {
      border: 'border-blue-500/20',
      glow: 'shadow-[0_0_30px_rgba(59,130,246,0.03)]',
      title: 'text-blue-500/80',
      highlight: 'text-blue-400',
      gradient: 'bg-blue-500/5'
    },
    purple: {
      border: 'border-purple-500/20',
      glow: 'shadow-[0_0_30px_rgba(168,85,247,0.03)]',
      title: 'text-purple-500/80',
      highlight: 'text-purple-400',
      gradient: 'bg-purple-500/5'
    },
    red: {
      border: 'border-rose-500/20',
      glow: 'shadow-[0_0_30px_rgba(244,63,94,0.03)]',
      title: 'text-rose-500/80',
      highlight: 'text-rose-400',
      gradient: 'bg-rose-500/5'
    }
  };

  const style = styles[variant];

  return (
    <div className={`p-6 rounded-2xl border ${style.border} ${style.glow} ${style.gradient} flex flex-col justify-between h-[140px] transition-transform hover:scale-[1.02]`}>
      <div className={`text-[11px] font-black uppercase tracking-[0.2em] ${style.title}`}>
        {label}
      </div>
      
      <div className="mt-auto">
        <div className="text-4xl font-black text-white tracking-tighter leading-none mb-1">
          {value}
        </div>
        <div className={`text-[11px] font-bold ${style.highlight} flex items-center gap-1`}>
          {subValue}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
