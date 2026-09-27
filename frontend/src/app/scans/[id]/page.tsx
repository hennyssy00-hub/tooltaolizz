'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ScanSummaryBar } from '@/components/scan/ScanSummaryBar';
import { AlertFilterTabs } from '@/components/scan/AlertFilterTabs';
import { EvidencePair } from '@/components/scan/EvidencePair';
import { FraudTimeline } from '@/components/scan/FraudTimeline';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function ScanDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('all');
  
  const { data: scan, isLoading: scanLoading, refetch: refetchScan } = useQuery({
    queryKey: ['scan', params.id],
    queryFn: () => api.getScanDetail(params.id),
  });

  const { data: alertsRes, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['scan-alerts', params.id],
    queryFn: () => api.getScanAlerts(params.id, {}),
  });

  if (scanLoading || alertsLoading) {
    return (
      <div className="mt-20 flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size={40} />
        <p className="text-sm text-slate-400">Đang tải chi tiết phiên đối soát...</p>
      </div>
    );
  }

  const safeScan = scan || {
    id: params.id,
    name: 'Phiên đối soát',
    date: new Date().toISOString(),
    platforms: ['Tất cả sảnh'],
    totalBets: 0,
    totalAlerts: 0,
    status: 'completed' as const,
    criticalAlerts: 0,
    highAlerts: 0,
    mediumAlerts: 0,
    lowAlerts: 0
  };

  const safeAlerts = Array.isArray(alertsRes?.data) ? alertsRes.data : [];

  const counts = {
    all: safeScan.totalAlerts ?? safeAlerts.length,
    critical: safeScan.criticalAlerts ?? 0,
    high: safeScan.highAlerts ?? 0,
    medium: safeScan.mediumAlerts ?? 0,
    low: safeScan.lowAlerts ?? 0,
  };

  const filteredAlerts = activeTab === 'all' 
    ? safeAlerts 
    : safeAlerts.filter(a => (a?.severity || '').toLowerCase() === activeTab.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link 
          href="/upload" 
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại Tải lên file mới
        </Link>
        <button 
          onClick={() => { refetchScan(); refetchAlerts(); }}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors px-2.5 py-1.5 rounded-lg bg-slate-850 border border-slate-750"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Làm mới
        </button>
      </div>

      <ScanSummaryBar scan={safeScan} />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="card">
            <AlertFilterTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
              counts={counts} 
            />
            
            <div className="space-y-6">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert, idx) => (
                  <EvidencePair key={alert?.id || idx} alert={alert} />
                ))
              ) : (
                <div className="py-16 text-center text-slate-400">
                  <p className="text-base font-medium text-slate-300 mb-1">
                    {activeTab === 'all' ? 'Chưa phát hiện hành vi gian lận nào trong phiên này' : 'Không có cảnh báo nào trong mức độ này'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Hệ thống đã rà soát toàn bộ các ván cược đối đầu và chỉ số bất thường.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="xl:col-span-1">
          <div className="sticky top-24">
            <FraudTimeline alerts={safeAlerts} />
          </div>
        </div>
      </div>
    </div>
  );
}
