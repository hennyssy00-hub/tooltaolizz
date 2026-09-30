'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X, Plus } from 'lucide-react';

interface FileDropzoneProps {
  onFilesAccepted: (files: { file: File; platform: string }[]) => void;
  onQuickScan?: (files: { file: File; platform: string }[]) => void;
  isLoading?: boolean;
}

export function FileDropzone({ onFilesAccepted, onQuickScan, isLoading = false }: FileDropzoneProps) {
  const [items, setItems] = useState<{ file: File; platform: string }[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems = acceptedFiles.map(file => ({ file, platform: 'MULTI' })); // Default to multi-provider aggregated
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    }
  });

  const removeFile = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updatePlatform = (index: number, platform: string) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index].platform = platform;
      return copy;
    });
  };

  return (
    <div className="space-y-4">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800 hover:border-slate-500'}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-blue-500' : 'text-slate-400'}`} />
        <p className="text-slate-200 font-medium mb-1">
          Kéo thả file vào đây, hoặc click để chọn file
        </p>
        <p className="text-slate-500 text-sm">
          Hỗ trợ: .csv, .xlsx, .xls
        </p>
      </div>

      {items.length > 0 && (
        <div className="space-y-3 mt-6">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-200">File đã chọn ({items.length} file):</h4>
            <span className="text-xs text-slate-400">
              Tổng dung lượng: {(items.reduce((acc, cur) => acc + cur.file.size, 0) / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>

          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-4 bg-slate-800 p-3 rounded-lg border border-slate-700">
              <FileIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{item.file.name}</p>
                <p className="text-xs text-slate-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <div className="w-64">
                <select 
                  className="input-field py-1.5 text-xs font-semibold bg-slate-800 border-slate-700 text-blue-400 focus:border-blue-500"
                  value={item.platform}
                  onChange={(e) => updatePlatform(index, e.target.value)}
                  disabled={isLoading}
                >
                  <option value="MULTI">🌐 Gộp tất cả sảnh (Tự động theo file)</option>
                  <option value="Evolution">Sảnh Evolution Gaming</option>
                  <option value="Sexy">Sảnh Sexy Gaming (AE)</option>
                  <option value="WM">Sảnh WM Casino</option>
                  <option value="AG">Sảnh Asia Gaming</option>
                  <option value="Pragmatic">Sảnh Pragmatic Play</option>
                  <option value="BBIN">Sảnh BBIN</option>
                  <option value="Saba">Sảnh Thể Thao Saba</option>
                  <option value="CMD">Sảnh Thể Thao CMD368</option>
                  <option value="SBO">Sảnh Thể Thao SBOBET</option>
                  <option value="OTHER">Sảnh / Nền tảng khác...</option>
                </select>
                {item.platform === 'MULTI' && (
                  <p className="text-[10px] text-emerald-400 mt-1 truncate">
                    ✓ Tự động bóc tách từng sảnh theo cột trong file
                  </p>
                )}
              </div>
              <button 
                onClick={() => removeFile(index)}
                disabled={isLoading}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-critical transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-xs animate-pulse">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span>⚡ Hệ thống đang phân tích cấu trúc cột siêu tốc từ file {items[0]?.file.name}... Vui lòng đợi trong giây lát!</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            {onQuickScan && (
              <button 
                disabled={isLoading}
                className={`px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/30 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => onQuickScan(items)}
              >
                <span>⚡ Quét Nhanh Trực Tiếp</span>
              </button>
            )}

            <button 
              disabled={isLoading}
              className={`btn-primary flex items-center gap-2 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              onClick={() => onFilesAccepted(items)}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang phân tích cấu trúc...</span>
                </>
              ) : (
                <>
                  <span>Tiếp tục cấu hình</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowRightIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
}
