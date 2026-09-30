'use client';

import { useState } from 'react';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { ColumnMapper } from '@/components/upload/ColumnMapper';
import { ScanConfig } from '@/components/upload/ScanConfig';
import { UploadProgress } from '@/components/upload/UploadProgress';
import { api } from '@/lib/api';
import { usePlatform } from '@/context/PlatformContext';
import { Dices, Trophy } from 'lucide-react';

type Step = 'upload' | 'mapping' | 'config' | 'processing';

export default function UploadPage() {
  const { category: globalCategory, setCategory: setGlobalCategory } = usePlatform();
  const [selectedCategory, setSelectedCategory] = useState<'casino' | 'sports'>(
    globalCategory === 'sports' ? 'sports' : 'casino'
  );
  const [step, setStep] = useState<Step>('upload');
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; platform: string }[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [scanId, setScanId] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isScanComplete, setIsScanComplete] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  const handleSelectCategory = (cat: 'casino' | 'sports') => {
    setSelectedCategory(cat);
    setGlobalCategory(cat);
  };

  const handleFilesAccepted = async (files: any[]) => {
    setIsDetecting(true);
    setUploadedFiles(files);
    try {
      // Detect columns from first file
      const cols = await api.detectColumns(files[0].file);
      setDetectedColumns(cols);
      setStep('mapping');
    } catch (err: any) {
      console.error("Detect columns error:", err);
      setDetectedColumns(['Mã ván', 'Tài khoản', 'Loại game', 'Cửa cược', 'Số tiền cược', 'Thời gian', 'Thắng thua']);
      setStep('mapping');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleQuickScan = async (files: any[]) => {
    setUploadedFiles(files);
    handleStartScan({ profile_id: 'STANDARD' }, files);
  };

  const handleMappingConfirm = (mapping: Record<string, string>) => {
    setColumnMapping(mapping);
    setStep('config');
  };

  const handleStartScan = async (config: any, overrideFiles?: any[]) => {
    setStep('processing');
    setScanError(null);
    setCurrentStepIndex(0);
    setIsScanComplete(false);
    try {
      const filesToProcess = overrideFiles || uploadedFiles;
      if (!filesToProcess || filesToProcess.length === 0) {
        throw new Error('Chưa có file nào được chọn');
      }

      let currentScanId = '';
      const totalFiles = filesToProcess.length;

      // 1. Tải lên và gom dữ liệu của TẤT CẢ các file vào chung 1 phiên quét
      for (let i = 0; i < totalFiles; i++) {
        const item = filesToProcess[i];
        if (!item?.file) continue;

        setCurrentStepIndex(0);
        setStatusMessage(`Đang đọc & trích xuất dữ liệu file ${i + 1}/${totalFiles}: ${item.file.name}...`);

        const uploadRes = await api.uploadFile(
          item.file,
          item.platform || 'MULTI',
          selectedCategory.toUpperCase(),
          Object.keys(columnMapping).length > 0 ? JSON.stringify(columnMapping) : undefined,
          currentScanId || undefined
        );

        if (uploadRes.error) {
          throw new Error(uploadRes.message || `Lỗi nhận diện file ${item.file.name}`);
        }

        if (!currentScanId && uploadRes.scan_id) {
          currentScanId = uploadRes.scan_id;
          setScanId(currentScanId);
        }

        setCurrentStepIndex(1);
        setStatusMessage(`Đã nạp ${uploadRes.bets_created || 0} vé cược từ ${item.file.name} (File ${i + 1}/${totalFiles})`);
      }

      if (!currentScanId) {
        throw new Error('Máy chủ không thể tạo phiên quét từ các file đã nạp');
      }

      // 2. Chạy thuật toán đối soát 15 quy tắc
      setCurrentStepIndex(2);
      setStatusMessage(`Đang chạy đối soát 15 quy tắc (chuẩn hóa tên đài, kiểm tra đối đầu & cược cùng tay)...`);

      const scanResult = await api.runScan(currentScanId, config?.profile_id || config?.profile || 'STANDARD');

      // 3. Tổng hợp báo cáo kết quả
      setCurrentStepIndex(3);
      const totalAlerts = scanResult?.total_alerts || 0;
      setStatusMessage(`Đã quét xong: Phát hiện ${totalAlerts} ván đối đầu nghi vấn! Đang chuyển hướng...`);

      // 4. Đánh dấu hoàn tất để chuyển trang
      setIsScanComplete(true);
    } catch (err: any) {
      console.error('Scan execution error:', err);
      const errMsg = 
        err?.response?.data?.detail || 
        err?.response?.data?.message || 
        (typeof err?.response?.data === 'string' ? err?.response?.data : null) ||
        err?.message || 
        'Có lỗi khi quét dữ liệu';
      setScanError(errMsg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Category Selection Tabs on Upload */}
      {step === 'upload' && (
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-300">Bước 0: Chọn lĩnh vực cược cần đối soát</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleSelectCategory('casino')}
              className={`p-4 rounded-xl border text-left flex items-start gap-4 transition-all duration-200 ${
                selectedCategory === 'casino'
                  ? 'bg-purple-600/15 border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-900/20'
                  : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className={`p-3 rounded-lg ${selectedCategory === 'casino' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                <Dices className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-100 flex items-center gap-2">
                  Sảnh Live Casino
                  {selectedCategory === 'casino' && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono uppercase">
                      Đang chọn
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Baccarat, Sicbo (Tài xỉu), Roulette, Rồng Hổ... Quét trùng mã ván (Round ID), cược đối đầu 2 đầu và bao sân.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectCategory('sports')}
              className={`p-4 rounded-xl border text-left flex items-start gap-4 transition-all duration-200 ${
                selectedCategory === 'sports'
                  ? 'bg-emerald-600/15 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-900/20'
                  : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className={`p-3 rounded-lg ${selectedCategory === 'sports' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-100 flex items-center gap-2">
                  Cá Cược Thể Thao
                  {selectedCategory === 'sports' && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono uppercase">
                      Đang chọn
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Bóng đá, Bóng rổ, Tennis... Quét chênh lệch giá (Surebets/Arbing), cược đối kháng Asian Handicap, Over/Under.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Stepper Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
        {[
          { id: 'upload', label: '1. Tải lên' },
          { id: 'mapping', label: '2. Chuẩn hóa' },
          { id: 'config', label: '3. Cấu hình' },
          { id: 'processing', label: '4. Xử lý' },
        ].map((s, idx) => {
          const isActive = step === s.id;
          const isPast = ['upload', 'mapping', 'config', 'processing'].indexOf(step) > idx;
          
          return (
            <div key={s.id} className={`flex items-center gap-2 ${isActive ? 'text-blue-500 font-medium' : isPast ? 'text-safe' : 'text-slate-500'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isActive ? 'bg-blue-500/20' : isPast ? 'bg-safe/20' : 'bg-slate-800'}`}>
                {isPast ? '✓' : idx + 1}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          );
        })}
      </div>

      {step === 'upload' && (
        <FileDropzone 
          onFilesAccepted={handleFilesAccepted} 
          onQuickScan={handleQuickScan}
          isLoading={isDetecting}
        />
      )}
      {step === 'mapping' && (
        <ColumnMapper 
          detectedColumns={detectedColumns} 
          category={selectedCategory} 
          onConfirm={handleMappingConfirm} 
          onBack={() => setStep('upload')} 
        />
      )}
      {step === 'config' && (
        <ScanConfig 
          category={selectedCategory} 
          onStart={handleStartScan} 
          onBack={() => setStep('mapping')} 
        />
      )}
      {step === 'processing' && (
        <UploadProgress 
          scanId={scanId} 
          isComplete={isScanComplete}
          currentStep={currentStepIndex}
          statusMessage={statusMessage}
          error={scanError} 
          onRetry={() => setStep('config')} 
          onBack={() => setStep('upload')} 
        />
      )}
    </div>
  );
}
