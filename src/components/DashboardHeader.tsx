
import React from 'react';
import { Activity, Bell, Search, Pause, Settings } from 'lucide-react';

interface DashboardHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenSettings: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ activeTab, onTabChange, onOpenSettings }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'raw-materials', label: 'Raw Materials' },
    { id: 'data-entry', label: 'Data Entry' },
    { id: 'wip', label: 'WIP' },
    { id: 'finished-goods', label: 'Finished Goods' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'production', label: 'Production' },
    { id: 'alerts', label: 'Alerts' },
  ];

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-[#0a0f1d] border-b border-slate-800/40 sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1e40af] rounded-lg flex items-center justify-center">
            <Activity className="text-white" size={18} />
          </div>
          <span className="text-xl font-black tracking-tighter text-white">TPW</span>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-[#1e293b] text-[#3b82f6]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 rounded-full px-4 py-1.5">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Live Sync</span>
          </div>
          <button 
            onClick={onOpenSettings}
            className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
            title="System Settings"
          >
            <Settings size={14} />
          </button>
        </div>

        <div className="flex items-center gap-3 ml-4">
          <div className="text-right">
            <div className="text-[13px] font-bold text-white leading-tight">Raju Admin</div>
            <div className="text-[11px] text-slate-500 font-medium">Super User</div>
          </div>
          <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-700">
             <img src="https://picsum.photos/100/100?random=1" alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
