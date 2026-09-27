'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import Link from 'next/link';
import { 
  Eye, Download, PlayCircle, Trash2, Search, RefreshCw, 
  Dices, Trophy, AlertTriangle, FileSpreadsheet
} from 'lucide-react';

export default function ScansPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'alert_only' | 'casino' | 'sports'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['scans'],
    queryFn: () => api.getScans(1, 50),
    refetchOnWindowFocus: false,
  });

  const handleDeleteScan = async (scanId: string) => {
    try {
      setDeletingId(scanId);
      await api.deleteScan(scanId);
      setConfirmDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ['scans'] });
      await refetch();
    } catch (err: any) {
      console.error('Lỗi khi xóa phiên quét:', err);
      alert('Không thể xóa phiên quét: ' + (err?.response?.data?.detail || err?.message || 'Lỗi server'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadExcel = (scanId: string) => {
    const url = `/api/reports/scan/${scanId}/excel`;
    window.open(url, '_blank');
  };

  const filteredScans = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((scan) => {
      // Search term filter
      const matchesSearch = 
        !searchTerm.trim() ||
        scan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scan.platforms.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())) ||
        scan.id.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Status / Category filter
      if (statusFilter === 'alert_only') {
        return scan.totalAlerts > 0;
      }
      if (statusFilter === 'casino') {
        return (scan.category || 'CASINO').toUpperCase() === 'CASINO';
      }
      if (statusFilter === 'sports') {
        return (scan.category || '').toUpperCase() === 'SPORTS';
      }
      return true;
    });
  }, [data, searchTerm, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <LoadingSpinner size={44} />
        <p className="text-slate-400 text-sm animate-pulse">Đang tải lịch sử đối soát...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            Lịch sử các phiên đối soát
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
            Tổng hợp các đợt quét dữ liệu cược Casino & Thể thao, phát hiện gian lận và xuất báo cáo.
          </p>
        </div>

        <Link 
          href="/upload" 
          className="btn-primary flex items-center justify-center gap-2 self-start md:self-auto shadow-lg shadow-blue-600/20"
        >
          <span>+ Bắt đầu phiên quét mới</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-800/40 border border-slate-700/60">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên phiên, sảnh, mã..."
            className="input-field pl-9 py-2 text-sm w-full bg-slate-900/80 border-slate-700 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'alert_only', label: 'Có vi phạm' },
            { id: 'casino', label: 'Live Casino' },
            { id: 'sports', label: 'Thể thao' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scans Table */}
      <div className="card p-0 overflow-hidden border border-slate-700/80 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-medium">Phiên quét / Lô đối soát</th>
                <th className="px-4 py-3.5 font-medium">Thời gian</th>
                <th className="px-4 py-3.5 font-medium">Lĩnh vực</th>
                <th className="px-4 py-3.5 font-medium">Sảnh tích hợp</th>
                <th className="px-4 py-3.5 font-medium text-right">Tổng vé cược</th>
                <th className="px-4 py-3.5 font-medium text-right">Cảnh báo gian lận</th>
                <th className="px-4 py-3.5 font-medium text-center">Trạng thái</th>
                <th className="px-5 py-3.5 font-medium text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredScans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-500">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <p className="text-slate-300 font-medium">Chưa tìm thấy phiên quét nào phù hợp</p>
                      <p className="text-xs text-slate-500">
                        {searchTerm ? 'Thử tìm với từ khóa khác hoặc xóa bộ lọc' : 'Hãy tải lên file Excel vé cược để bắt đầu phân tích'}
                      </p>
                      <Link href="/upload" className="btn-primary inline-flex text-xs px-4 py-2 mt-2">
                        + Tải lên dữ liệu mới
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredScans.map((scan) => {
                  const isSports = (scan.category || '').toUpperCase() === 'SPORTS';
                  return (
                    <tr key={scan.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-100 flex items-center gap-2">
                          <Link href={`/scans/${scan.id}`} className="hover:text-blue-400 transition-colors">
                            {scan.name}
                          </Link>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          ID: {scan.id.slice(0, 13)}...
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">
                        {formatDateTime(scan.date)}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {isSports ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Trophy className="w-3 h-3" /> Thể thao
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Dices className="w-3 h-3" /> Live Casino
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex gap-1 flex-wrap max-w-xs">
                          {scan.platforms.map((p) => (
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
                        {scan.totalBets ? scan.totalBets.toLocaleString('vi-VN') : '0'}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {scan.totalAlerts > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-bold text-xs">
                            <AlertTriangle className="w-3 h-3" />
                            {scan.totalAlerts}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">0 vi phạm</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {scan.status === 'completed' ? (
                          <Badge variant="success">Hoàn tất</Badge>
                        ) : scan.status === 'processing' ? (
                          <Badge variant="warning" className="animate-pulse">Đang quét...</Badge>
                        ) : (
                          <Badge variant="danger">Lỗi dữ liệu</Badge>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {scan.status === 'completed' ? (
                            <>
                              <Link 
                                href={`/scans/${scan.id}`} 
                                className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/15 rounded-lg transition-colors" 
                                title="Xem chi tiết báo cáo"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>

                              <button 
                                onClick={() => handleDownloadExcel(scan.id)}
                                className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 rounded-lg transition-colors" 
                                title="Tải báo cáo Excel đối soát"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <Link 
                              href={`/scans/${scan.id}`} 
                              className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors" 
                              title="Xem tiến độ"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </Link>
                          )}

                          {/* Delete Action with Confirmation */}
                          {confirmDeleteId === scan.id ? (
                            <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/50 p-1 rounded-lg">
                              <button
                                onClick={() => handleDeleteScan(scan.id)}
                                disabled={deletingId === scan.id}
                                className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold rounded"
                              >
                                {deletingId === scan.id ? 'Đang xóa...' : 'Xóa'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-0.5 text-slate-400 hover:text-white text-[11px]"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(scan.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Xóa phiên quét này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
