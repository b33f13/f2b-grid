import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, colorClass }) => {
  return (
    <div className={`bg-[#0a0a0f] border border-[#1a2332] rounded p-4 flex items-center gap-4 hover:border-${colorClass.replace('text-', '')} transition-colors group`}>
      <div className={`p-3 rounded bg-[#111620] group-hover:bg-[#1a2332] transition-colors ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-gray-500 text-xs font-mono mb-1">{title}</div>
        <div className={`text-2xl font-bold font-mono ${colorClass}`}>{value}</div>
      </div>
    </div>
  );
};
