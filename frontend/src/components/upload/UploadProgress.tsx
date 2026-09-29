'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Circle, Loader2, AlertCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UploadProgressProps {
  scanId: string;
  isComplete?: boolean;
  currentStep?: number;
  statusMessage?: string;
  error?: string | null;
  onRetry?: () => void;
  onBack?: () => void;
}

export function UploadProgress({ scanId, isComplete, currentStep = 0, statusMessage, error, onRetry, onBack }: UploadProgressProps) {
  const router = useRouter();

  useEffect(() => {
    if (isComplete && scanId && !error) {
      const timer = setTimeout(() => {
        router.push(`/scans/${scanId}`);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, scanId, error, router]);

  const steps = [
    { label: 'Đọc và phân tích file', desc: 'Trích xuất dữ liệu, hỗ trợ đồng thời nhiều file/đài...' },
    { label: 'Chuẩn hóa dữ liệu', desc: 'Áp dụng mapping 6 cột vàng và làm sạch dữ liệu cược...' },
    { label: 'Chạy thuật toán đối đả 15 quy tắc', desc: 'Quét 内对打 (nội bộ) và 外对打 (liên đài), kiểm tra cùng tay...' },
    { label: 'Tổng hợp báo cáo kết quả', desc: 'Khởi tạo chi tiết các cặp đối đầu và chuyển hướng...' },
  ];

  if (error) {
    return (
      <div className="card max-w-2xl mx-auto py-8 text-center border-red-500/40 bg-red-950/20">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-critical">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-red-300">Quá trình quét gặp sự cố</h2>
        <div className="max-w-md mx-auto my-4 p-3 bg-red-900/30 border border-red-800/60 rounded-lg text-sm text-red-200 text-left">
          <p className="font-semibold text-red-300 mb-1">Chi tiết lỗi từ máy chủ:</p>
          <p className="font-mono text-xs">{error}</p>
        </div>
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
          Vui lòng kiểm tra lại định dạng file hoặc các cột vàng đã chọn để đảm bảo dữ liệu hợp lệ.
        </p>
        <div className="flex justify-center gap-4">
          {onRetry && (
            <button onClick={onRetry} className="btn-primary flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Thử quét lại
            </button>
          )}
          {onBack && (
            <button onClick={onBack} className="btn-secondary flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Quay lại nạp file khác
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Đang xử lý dữ liệu...</h2>
        {statusMessage ? (
          <p className="text-blue-400 font-mono text-xs mt-2 bg-blue-950/40 border border-blue-800/50 py-1.5 px-3 rounded-lg max-w-md mx-auto truncate">
            ⚡ {statusMessage}
          </p>
        ) : (
          <p className="text-slate-400 mt-2 text-sm">Vui lòng không đóng trình duyệt trong quá trình này.</p>
        )}
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        {steps.map((s, idx) => {
          const isCompleted = currentStep > idx || isComplete;
          const isCurrent = currentStep === idx && !isComplete;
          
          return (
            <div key={idx} className={`flex items-start gap-4 ${isCompleted ? 'opacity-100' : isCurrent ? 'opacity-100' : 'opacity-40'}`}>
              <div className="mt-1">
                {isCompleted ? (
                  <CheckCircle className="w-6 h-6 text-safe" />
                ) : isCurrent ? (
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-600" />
                )}
              </div>
              <div>
                <h4 className={`font-medium ${isCurrent ? 'text-blue-400' : isCompleted ? 'text-safe' : 'text-slate-200'}`}>{s.label}</h4>
                <p className="text-sm text-slate-500">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
