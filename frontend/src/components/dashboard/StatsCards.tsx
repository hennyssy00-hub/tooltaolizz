'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Receipt, AlertTriangle, Users, Activity } from 'lucide-react';
import { usePlatform } from '@/context/PlatformContext';

export function StatsCards() {
  const { category } = usePlatform();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats', category],
    queryFn: () => api.getDashboardStats(category),
  });

  if (isLoading || !data) return <div className="h-32 flex items-center justify-center card"><LoadingSpinner /></div>;

  const domainLabel = category === 'sports' ? ' (Thể Thao)' : category === 'casino' ? ' (Casino)' : '';

  const cards = [
    { label: `Tổng vé cược${domainLabel}`, value: data.totalBets.toLocaleString('vi-VN'), icon: Receipt, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Cảnh báo đỏ (Critical)', value: data.criticalAlerts.toString(), icon: AlertTriangle, color: 'text-critical', bg: 'bg-critical/10' },
    { label: 'Tài khoản nghi vấn', value: data.suspiciousAccounts.toString(), icon: Users, color: 'text-suspicious', bg: 'bg-suspicious/10' },
    { label: 'Risk Score TB', value: data.avgRiskScore.toString(), icon: Activity, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, i) => (
        <div key={i} className="card flex items-center p-6 transition-all duration-200 hover:border-slate-600">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mr-4 ${card.bg}`}>
            <card.icon className={`w-7 h-7 ${card.color}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">{card.label}</p>
            <h4 className="text-2xl font-bold text-slate-100">{card.value}</h4>
          </div>
        </div>
      ))}
    </div>
  );
}
