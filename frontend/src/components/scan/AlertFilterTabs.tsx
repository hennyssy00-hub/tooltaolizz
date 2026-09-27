interface AlertFilterTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: { all: number; critical: number; high: number; medium: number; low: number };
}

export function AlertFilterTabs({ activeTab, onTabChange, counts }: AlertFilterTabsProps) {
  const tabs = [
    { id: 'all', label: 'Tất cả', count: counts.all, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'critical', label: 'Nguy hiểm', count: counts.critical, color: 'text-critical', bg: 'bg-critical/10' },
    { id: 'high', label: 'Cao', count: counts.high, color: 'text-suspicious', bg: 'bg-suspicious/10' },
    { id: 'medium', label: 'Trung bình', count: counts.medium, color: 'text-watch', bg: 'bg-watch/10' },
    { id: 'low', label: 'Thấp', count: counts.low, color: 'text-safe', bg: 'bg-safe/10' },
  ];

  return (
    <div className="flex gap-2 border-b border-slate-800 mb-6 pb-px">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.id 
              ? 'border-blue-500 text-slate-100 bg-slate-800/50 rounded-t-lg' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
          }`}
        >
          {tab.label}
          <span className={`px-2 py-0.5 rounded-full text-xs ${tab.bg} ${tab.color}`}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}
