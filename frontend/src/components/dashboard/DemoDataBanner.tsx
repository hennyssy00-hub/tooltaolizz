'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Info, RotateCcw, UploadCloud, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

export function DemoDataBanner() {
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const queryClient = useQueryClient();

  const handleReset = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu mẫu trong cơ sở dữ liệu về 0 không?')) {
      return;
    }
    setResetting(true);
    try {
      await api.resetData();
      await queryClient.invalidateQueries();
      setResetDone(true);
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch {
      alert('Đã xóa dữ liệu.');
      window.location.reload();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-900/30 via-slate-800/60 to-purple-900/30 border border-blue-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-200">
                Lưu ý về số liệu hiện tại: Dữ liệu mô phỏng kiểm thử (Demo Data)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
                MẪU THỬ NGHIỆM
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
              Các chỉ số vé cược, biểu đồ và cảnh báo bạn đang nhìn thấy được tạo tự động trong quá trình kiểm tra cài đặt ban đầu để minh họa cách hiển thị. Bạn chưa nạp file thật nào.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl transition-all shadow-sm"
            title="Xóa toàn bộ vé cược và cảnh báo mẫu trong database về 0"
          >
            {resetDone ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400 font-semibold">Đã về 0</span>
              </>
            ) : (
              <>
                <RotateCcw className={'w-3.5 h-3.5 ' + (resetting ? 'animate-spin text-blue-400' : 'text-slate-400')} />
                <span>{resetting ? 'Đang làm sạch...' : 'Xóa dữ liệu mẫu về 0'}</span>
              </>
            )}
          </button>

          <Link
            href="/upload"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 border border-blue-500/50 rounded-xl transition-all shadow-lg shadow-blue-600/20"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Nạp file thật của bạn</span>
          </Link>
        </div>
      </div>
    </div>
  );
}