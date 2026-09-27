'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getRiskColor, getRiskIcon, formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import Link from 'next/link';
import { 
  Search, RefreshCw, Ban, ShieldCheck, UserX, 
  ExternalLink, ArrowUpDown, AlertCircle, Users
} from 'lucide-react';

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'suspicious' | 'watch' | 'safe'>('all');
  const [blacklistFilter, setBlacklistFilter] = useState<'all' | 'blacklisted' | 'active'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.getAccounts({ limit: 100 }),
    refetchOnWindowFocus: false,
  });

  const handleToggleBlacklist = async (playerId: string, currentlyBlacklisted: boolean) => {
    if (currentlyBlacklisted) {
      if (!confirm(`Xác nhận MỞ KHÓA tài khoản "${playerId}" khỏi Danh Sách Đen?`)) return;
      try {
        setActionInProgress(playerId);
        await api.removeFromBlacklist(playerId);
        alert(`Đã gỡ bỏ ${playerId} khỏi Danh Sách Đen!`);
        await queryClient.invalidateQueries({ queryKey: ['accounts'] });
        await queryClient.invalidateQueries({ queryKey: ['blacklist'] });
        await refetch();
      } catch (err: any) {
        console.error('Lỗi khi gỡ blacklist:', err);
        alert('Không thể gỡ bỏ: ' + (err?.response?.data?.detail || err?.message || 'Lỗi server'));
      } finally {
        setActionInProgress(null);
      }
    } else {
      const reason = prompt(`Nhập lý do đưa "${playerId}" vào Danh Sách Đen:`, 'Phát hiện cược đối đầu / bào hoàn trả');
      if (!reason) return;
      try {
        setActionInProgress(playerId);
        await api.addToBlacklist(playerId, reason);
        alert(`Đã thêm ${playerId} vào Danh Sách Đen thành công!`);
        await queryClient.invalidateQueries({ queryKey: ['accounts'] });
        await queryClient.invalidateQueries({ queryKey: ['blacklist'] });
        await refetch();
      } catch (err: any) {
        console.error('Lỗi khi thêm blacklist:', err);
        alert('Không thể thêm vào danh sách đen: ' + (err?.response?.data?.detail || err?.message || 'Lỗi server'));
      } finally {
        setActionInProgress(null);
      }
    }
  };

  const filteredAccounts = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((acc) => {
      // Search
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        acc.playerId.toLowerCase().includes(searchLower) ||
        (acc.platforms && acc.platforms.some((p) => p.toLowerCase().includes(searchLower)));

      if (!matchesSearch) return false;

      // Risk level
      if (riskFilter !== 'all' && acc.riskLevel.toLowerCase() !== riskFilter) {
        return false;
      }

      // Blacklist filter
      if (blacklistFilter === 'blacklisted' && !acc.isBlacklisted) return false;
      if (blacklistFilter === 'active' && acc.isBlacklisted) return false;

      return true;
    });
  }, [data, searchTerm, riskFilter, blacklistFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <LoadingSpinner size={44} />
        <p className="text-slate-400 text-sm animate-pulse">Đang tải hồ sơ rủi ro tài khoản...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            Hồ Sơ Rủi Ro Người Chơi
            <button 
              onClick={() => refetch()} 
              disabled={isFetching}
              title="Làm mới dữ liệu"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Đánh giá điểm rủi ro người chơi, phát hiện thợ cược chéo, kiểm soát và khóa tài khoản vi phạm.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/alerts" className="btn-secondary text-xs flex items-center gap-1.5">
            <span>Trung Tâm Cảnh Báo</span>
          </Link>
          <Link href="/upload" className="btn-primary text-xs flex items-center gap-1.5">
            <span>+ Quét Dữ Liệu Mới</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 space-y-4 bg-slate-800/40 border border-slate-700/60">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Player ID, sảnh..."
              className="input-field pl-9 py-2 text-sm w-full bg-slate-900/80 border-slate-700 focus:border-blue-500"
            />
          </div>

          {/* Risk Level Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Phân loại:</span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'critical', label: 'Nguy hiểm', color: 'text-red-400' },
              { id: 'suspicious', label: 'Nghi vấn', color: 'text-amber-400' },
              { id: 'watch', label: 'Theo dõi', color: 'text-yellow-400' },
              { id: 'safe', label: 'An toàn', color: 'text-emerald-400' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRiskFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  riskFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Blacklist Status Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700/60">
          <span className="text-xs text-slate-400 mr-2">Trạng thái tài khoản:</span>
          {[
            { id: 'all', label: 'Tất cả tài khoản' },
            { id: 'blacklisted', label: 'Đang bị khóa (Blacklist)' },
            { id: 'active', label: 'Bình thường' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setBlacklistFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                blacklistFilter === tab.id
                  ? 'bg-slate-700 text-white font-medium ring-1 ring-slate-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto text-xs text-slate-400">
            Hiển thị <span className="font-semibold text-slate-200">{filteredAccounts.length}</span> tài khoản
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="card p-0 overflow-hidden border border-slate-700/80 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-medium">Tài khoản (Player ID)</th>
                <th className="px-4 py-3.5 font-medium">Mức độ rủi ro</th>
                <th className="px-4 py-3.5 font-medium">Điểm rủi ro</th>
                <th className="px-4 py-3.5 font-medium">Sảnh tham gia</th>
                <th className="px-4 py-3.5 font-medium text-right">Tổng vé cược</th>
                <th className="px-4 py-3.5 font-medium text-right">Số cảnh báo</th>
                <th className="px-4 py-3.5 font-medium text-center">Trạng thái</th>
                <th className="px-5 py-3.5 font-medium text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-500">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-slate-300 font-medium">Chưa có tài khoản nào theo bộ lọc</p>
                      <p className="text-xs text-slate-500">
                        Hãy nạp thêm dữ liệu cược để hệ thống tự động tổng hợp hồ sơ.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const isBlacklisted = Boolean(acc.isBlacklisted);
                  return (
                    <tr key={acc.playerId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/accounts/${acc.playerId}`} 
                            className="font-mono font-semibold text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1.5"
                          >
                            {acc.playerId}
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </Link>
                        </div>
                        {isBlacklisted && acc.blacklistReason && (
                          <div className="text-[11px] text-red-400 mt-0.5 line-clamp-1 max-w-xs" title={acc.blacklistReason}>
                            Lý do: {acc.blacklistReason}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${getRiskColor(acc.riskLevel)}`}>
                          {getRiskIcon(acc.riskLevel)} {acc.riskLevel.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 text-right font-mono font-bold text-xs">{acc.riskScore}</span>
                          <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                acc.riskScore >= 80 
                                  ? 'bg-red-500' 
                                  : acc.riskScore >= 60 
                                  ? 'bg-amber-500' 
                                  : acc.riskScore >= 30 
                                  ? 'bg-yellow-500' 
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, acc.riskScore))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex gap-1 flex-wrap max-w-xs">
                          {acc.platforms.map((p) => (
                            <span 
                              key={p} 
                              className="px-2 py-0.5 bg-slate-800/80 border border-slate-700/60 rounded text-[11px] text-slate-300 font-medium"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right font-mono font-medium">
                        {acc.totalBets ? acc.totalBets.toLocaleString('vi-VN') : '0'}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {acc.totalAlerts > 0 ? (
                          <span className="font-bold text-red-400 font-mono text-xs">
                            {acc.totalAlerts}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">0</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {isBlacklisted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                            <Ban className="w-3 h-3" /> Đã Khóa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" /> Bình thường
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Link 
                            href={`/accounts/${acc.playerId}`} 
                            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/15 rounded-lg transition-colors text-xs font-medium"
                            title="Xem lịch sử cược & đối soát"
                          >
                            Chi tiết
                          </Link>

                          <button
                            onClick={() => handleToggleBlacklist(acc.playerId, isBlacklisted)}
                            disabled={actionInProgress === acc.playerId}
                            className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 ${
                              isBlacklisted
                                ? 'text-emerald-400 hover:bg-emerald-500/15'
                                : 'text-red-400 hover:bg-red-500/15'
                            }`}
                            title={isBlacklisted ? 'Mở khóa tài khoản' : 'Khóa & Đưa vào Blacklist'}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">
                              {isBlacklisted ? 'Mở khóa' : 'Khóa'}
                            </span>
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

