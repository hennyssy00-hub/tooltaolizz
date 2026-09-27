'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Circle, Loader2, AlertCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UploadProgressProps {
  scanId: string;
  error?: string | null;
  onRetry?: () => void;
  onBack?: () => void;
}

export function UploadProgress({ scanId, error, onRetry, onBack }: UploadProgressProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (error) return;
    const timer1 = setTimeout(() => setStep(1), 1200);
    const timer2 = setTimeout(() => setStep(2), 2400);
    const timer3 = setTimeout(() => setStep(3), 3600);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [error]);

  useEffect(() => {
    if (scanId && !error) {
      setStep(4);
      const timer = setTimeout(() => {
        router.push(`/scans/${scanId}`);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [scanId, error, router]);

  const steps = [
    { label: 'Đọc và phân tích file', desc: 'Kiểm tra định dạng và trích xuất dữ liệu...' },
    { label: 'Chuẩn hóa dữ liệu', desc: 'Áp dụng mapping 6 cột vàng và làm sạch dữ liệu...' },
    { label: 'Chạy thuật toán phát hiện', desc: 'Tìm kiếm mẫu cược chéo hai đầu, bao sân...' },
    { label: 'Tạo báo cáo kết quả', desc: 'Tổng hợp cảnh báo và chuyển đến giao diện đối soát...' },
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
        <p className="text-slate-400 mt-2">Vui lòng không đóng trình duyệt trong quá trình này.</p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        {steps.map((s, idx) => {
          const isCompleted = step > idx;
          const isCurrent = step === idx;
          
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
                <h4 className={`font-medium ${isCurrent ? 'text-blue-400' : 'text-slate-200'}`}>{s.label}</h4>
                <p className="text-sm text-slate-500">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
