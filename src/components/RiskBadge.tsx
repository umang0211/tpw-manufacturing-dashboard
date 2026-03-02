
import React from 'react';
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level: RiskLevel;
}

const RiskBadge: React.FC<RiskBadgeProps> = ({ level }) => {
  const styles = {
    [RiskLevel.CRITICAL]: 'text-rose-500 border-rose-500/50',
    [RiskLevel.HIGH]: 'text-orange-500 border-orange-500/50',
    [RiskLevel.MEDIUM]: 'text-amber-500 border-amber-500/50',
    [RiskLevel.LOW]: 'text-emerald-500 border-emerald-500/50',
    [RiskLevel.MONITOR]: 'text-slate-400 border-slate-600/50',
  };

  return (
    <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${styles[level] || styles[RiskLevel.LOW]}`}>
      {level.toUpperCase()}
    </span>
  );
};

export default RiskBadge;
