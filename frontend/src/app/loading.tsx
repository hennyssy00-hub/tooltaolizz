import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function Loading() {
  return (
    <div className="h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size={48} />
        <p className="text-slate-400">Đang tải dữ liệu...</p>
      </div>
    </div>
  );
}
