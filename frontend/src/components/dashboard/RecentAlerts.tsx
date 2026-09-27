'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getAlertTypeLabel, getSeverityColor, formatDateTime } from '@/lib/utils';
import { Badge } from '../common/Badge';
import { ShieldAlert, ArrowRight, User, Dices, Trophy } from 'lucide-react';
import Link from 'next/link';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { usePlatform } from '@/context/PlatformContext';

export function RecentAlerts() {
  const { category } = usePlatform();

  const { data, isLoading } = useQuery({
    queryKey: ['recent-alerts', category],
    queryFn: () => api.getRecentAlerts(category),
  });

  if (isLoading || !data) return <div className="h-64 flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-100">
            Cảnh báo rủi ro mới nhất
          </h3>
          <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
            {category === 'sports' ? 'Thể Thao' : category === 'casino' ? 'Casino' : 'Toàn bộ'}
          </span>
        </div>
        <Link href="/alerts" className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
          Xem tất cả cảnh báo <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-3.5">
        {data.map((alert) => {
          const isSportsAlert = alert.category === 'SPORTS' || alert.type.startsWith('sports');
          return (
            <div 
              key={alert.id} 
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/60 hover:border-slate-600 transition-all flex items-start gap-4 shadow-sm"
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${getSeverityColor(alert.severity).split(' ')[1]}`}>
                <ShieldAlert className={`w-5 h-5 ${getSeverityColor(alert.severity).split(' ')[0]}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100 text-sm">{getAlertTypeLabel(alert.type)}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1 ${
                      isSportsAlert 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                    }`}>
                      {isSportsAlert ? <Trophy className="w-2.5 h-2.5" /> : <Dices className="w-2.5 h-2.5" />}
                      {isSportsAlert ? 'Thể Thao' : 'Casino'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{formatDateTime(alert.timestamp)}</span>
                </div>
                
                <div className="flex items-center gap-2 mb-2.5 text-xs text-slate-300">
                  <span className="font-medium text-slate-200">{alert.gameType}</span>
                  <span>•</span>
                  <span className="truncate text-slate-400">
                    {alert.eventName ? alert.eventName : `Ván: ${alert.roundId}`}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/50">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{alert.playerIds.join(' ↔ ')}</span>
                  </div>
                  <Badge variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'default'}>
                    Risk: {alert.riskScore}/100
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
