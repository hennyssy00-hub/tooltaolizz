'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getRiskColor, getRiskIcon, formatCurrency } from '@/lib/utils';
import { ShieldBan, User, Activity, AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function AccountDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['account', params.id],
    queryFn: () => api.getAccountDetail(params.id),
  });

  if (isLoading || !data) return <div className="mt-20"><LoadingSpinner size={40} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-3">
            <User className="w-6 h-6 text-slate-400" /> 
            {data.playerId}
          </h2>
          <div className="flex gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium border ${getRiskColor(data.riskLevel)}`}>
              {getRiskIcon(data.riskLevel)} Mức độ: {data.riskLevel.toUpperCase()}
            </span>
            <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-300 font-medium">
              Risk Score: {data.riskScore} / 100
            </span>
          </div>
        </div>
        
        <button className="btn-primary bg-critical hover:bg-critical/90 flex items-center gap-2">
          <ShieldBan className="w-4 h-4" /> Đưa vào Danh sách đen
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-slate-800/50">
          <p className="text-sm text-slate-400 mb-1">Tổng vé cược</p>
          <p className="text-2xl font-bold text-slate-100">{data.totalBets.toLocaleString()}</p>
        </div>
        <div className="card bg-slate-800/50">
          <p className="text-sm text-slate-400 mb-1">Tỷ lệ thắng</p>
          <p className="text-2xl font-bold text-slate-100">{(data.winRate * 100).toFixed(1)}%</p>
        </div>
        <div className="card bg-slate-800/50">
          <p className="text-sm text-slate-400 mb-1">Cược trung bình</p>
          <p className="text-2xl font-bold text-slate-100">{formatCurrency(data.avgStake)}</p>
        </div>
        <div className="card bg-critical/10 border-critical/20">
          <p className="text-sm text-critical/80 mb-1">Số cảnh báo liên quan</p>
          <p className="text-2xl font-bold text-critical">{data.totalAlerts}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-slate-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" /> Lịch sử điểm rủi ro (10 ngày)
          </h3>
          <div className="h-64 flex items-end gap-2 pt-10">
            {data.history.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full bg-slate-800 rounded-t relative h-full flex items-end justify-center">
                  <div 
                    className={`w-full rounded-t transition-all ${h.riskScore > 80 ? 'bg-critical' : h.riskScore > 60 ? 'bg-suspicious' : 'bg-blue-500'}`}
                    style={{ height: `${h.riskScore}%` }}
                  ></div>
                  <span className="absolute -top-6 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {h.riskScore}
                  </span>
                </div>
                <span className="text-xs text-slate-500 rotate-45 origin-left">{h.date.split('-')[2]}/{h.date.split('-')[1]}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-medium text-slate-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-watch" /> Cảnh báo gần đây
          </h3>
          <div className="text-slate-400 text-sm text-center py-10">
            Mục này đang hiển thị dữ liệu giả định. Vui lòng kết nối backend để xem chi tiết.
          </div>
        </div>
      </div>
    </div>
  );
}
