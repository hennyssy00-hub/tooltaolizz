'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateTime, getSeverityColor, getAlertTypeLabel } from '@/lib/utils';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import Link from 'next/link';
import { 
  ShieldAlert, Check, X, Search, RefreshCw, Ban, 
  ExternalLink, AlertTriangle, CheckCircle2, ShieldCheck, Dices
} from 'lucide-react';

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'dismissed'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['all-alerts'],
    queryFn: () => api.getAlerts({ limit: 100 }),
    refetchOnWindowFocus: false,
  });

  const handleUpdateStatus = async (alertId: string, status: string) => {
    try {
      setActionInProgress(alertId);
      await api.updateAlertStatus(alertId, status);
      await queryClient.invalidateQueries({ queryKey: ['all-alerts'] });
      await refetch();
    } catch (err: any) {
      console.error('Lỗi cập nhật cảnh báo:', err);
      alert('Không thể cập nhật: ' + (err?.response?.data?.detail || err?.message || 'Lỗi kết nối'));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAddToBlacklist = async (playerId: string, reason: string) => {
    if (!confirm(`Xác nhận đưa tài khoản "${playerId}" vào Danh Sách Đen (Blacklist)?`)) {
      return;
    }
    try {
      setActionInProgress(playerId);
      await api.addToBlacklist(playerId, reason || 'Phát hiện hành vi cược bất thường');
      alert(`Đã thêm ${playerId} vào Danh Sách Đen thành công!`);
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      await refetch();
    } catch (err: any) {
      console.error('Lỗi thêm blacklist:', err);
      alert('Không thể thêm vào danh sách đen: ' + (err?.response?.data?.detail || err?.message || 'Lỗi kết nối'));
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredAlerts = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((alert) => {
      // Search
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        alert.id.toLowerCase().includes(searchLower) ||
        (alert.roundId && alert.roundId.toLowerCase().includes(searchLower)) ||
        (alert.gameType && alert.gameType.toLowerCase().includes(searchLower)) ||
        alert.playerIds.some((pid) => pid.toLowerCase().includes(searchLower)) ||
        (alert.description && alert.description.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      // Severity
      if (severityFilter !== 'all' && alert.severity.toLowerCase() !== severityFilter) {
        return false;
      }

      // Status
      if (statusFilter !== 'all' && alert.status.toLowerCase() !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [data, searchTerm, severityFilter, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <LoadingSpinner size={44} />
        <p className="text-slate-400 text-sm animate-pulse">Đang tải danh sách cảnh báo vi phạm...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            Trung Tâm Xử Lý Cảnh Báo Gian Lận
            <button 
              onClick={() => refetch()} 
              disabled={isFetching}
              title="Làm mới cảnh báo"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Quản lý, xác minh và xử lý các hành vi cược đối đầu, bào cỏ, cày hoàn trả và hội nhóm.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/accounts" className="btn-secondary text-xs flex items-center gap-1.5">
            <span>Xem Danh Sách Tài Khoản</span>
          </Link>
          <Link href="/upload" className="btn-primary text-xs flex items-center gap-1.5">
            <span>+ Quét Dữ Liệu Mới</span>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4 space-y-4 bg-slate-800/40 border border-slate-700/60">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo User ID, Mã ván cược, trò chơi..."
              className="input-field pl-9 py-2 text-sm w-full bg-slate-900/80 border-slate-700 focus:border-blue-500"
            />
          </div>

          {/* Severity Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Mức độ:</span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'critical', label: 'Khẩn cấp', color: 'text-red-400' },
              { id: 'high', label: 'Nghi vấn cao', color: 'text-amber-400' },
              { id: 'medium', label: 'Trung bình', color: 'text-blue-400' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSeverityFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  severityFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700/60">
          <span className="text-xs text-slate-400 mr-2">Trạng thái xử lý:</span>
          {[
            { id: 'all', label: 'Tất cả trạng thái' },
            { id: 'pending', label: 'Chờ thẩm tra' },
            { id: 'confirmed', label: 'Đã xác nhận vi phạm' },
            { id: 'dismissed', label: 'Đã bỏ qua' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                statusFilter === tab.id
                  ? 'bg-slate-700 text-white font-medium ring-1 ring-slate-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto text-xs text-slate-400">
            Hiển thị <span className="font-semibold text-slate-200">{filteredAlerts.length}</span> cảnh báo
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="card p-0 overflow-hidden border border-slate-700/80 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-medium">Hành vi / Mức độ</th>
                <th className="px-4 py-3.5 font-medium">Tài khoản vi phạm</th>
                <th className="px-4 py-3.5 font-medium">Thông tin ván cược</th>
                <th className="px-4 py-3.5 font-medium">Thời gian</th>
                <th className="px-4 py-3.5 font-medium text-center">Risk Score</th>
                <th className="px-4 py-3.5 font-medium text-center">Trạng thái</th>
                <th className="px-5 py-3.5 font-medium text-center">Hành động xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                      </div>
                      <p className="text-slate-300 font-medium">Không có cảnh báo nào phù hợp</p>
                      <p className="text-xs text-slate-500">
                        Hệ thống hoạt động ổn định hoặc không có vi phạm theo bộ lọc hiện tại.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const isPending = alert.status === 'pending';
                  const isConfirmed = alert.status === 'confirmed';
                  const isDismissed = alert.status === 'dismissed';
                  const primaryPlayer = alert.playerIds[0] || 'Unknown';

                  return (
                    <tr key={alert.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-2 rounded-lg bg-slate-800/90 ${getSeverityColor(alert.severity).split(' ')[0]}`}>
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 text-sm">
                              {getAlertTypeLabel(alert.type)}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xs" title={alert.description}>
                              {alert.description || 'Phát hiện rủi ro cược đối kháng'}
                            </div>
                            {alert.scanId && alert.scanId !== 'live' && (
                              <Link 
                                href={`/scans/${alert.scanId}`}
                                className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-1"
                              >
                                Xem phiên đối soát <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          {alert.playerIds.map((pid) => (
                            <Link 
                              key={pid} 
                              href={`/accounts/${pid}`}
                              className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1"
                            >
                              {pid}
                            </Link>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs">
                        <div className="font-medium text-slate-200">{alert.gameType || 'Live Casino'}</div>
                        {alert.roundId && (
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            Ván: {alert.roundId}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">
                        {formatDateTime(alert.timestamp)}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span 
                          className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold font-mono ${
                            alert.riskScore >= 80 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : alert.riskScore >= 60 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {alert.riskScore}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {isConfirmed ? (
                          <Badge variant="danger">Đã xác nhận</Badge>
                        ) : isDismissed ? (
                          <Badge variant="default">Đã bỏ qua</Badge>
                        ) : (
                          <Badge variant="warning">Chờ xử lý</Badge>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(alert.id, 'CONFIRMED')}
                                disabled={actionInProgress === alert.id}
                                className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 rounded-lg transition-colors"
                                title="Xác nhận vi phạm"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(alert.id, 'DISMISSED')}
                                disabled={actionInProgress === alert.id}
                                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded-lg transition-colors"
                                title="Bỏ qua (Báo động giả)"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleAddToBlacklist(primaryPlayer, alert.description)}
                            disabled={actionInProgress === primaryPlayer}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/15 rounded-lg transition-colors"
                            title={`Khóa & Đưa ${primaryPlayer} vào Blacklist`}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

