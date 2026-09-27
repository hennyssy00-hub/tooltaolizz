'use client';

import { useState } from 'react';
import { Play, Dices, Trophy, ShieldCheck, Zap, Target, Flame, CheckCircle2 } from 'lucide-react';
import { PlatformCategory } from '@/types';

interface ScanConfigProps {
  category: 'casino' | 'sports';
  onStart: (config: any) => void;
  onBack: () => void;
}

const STRICTNESS_PROFILES = [
  {
    id: 'STANDARD',
    name: 'Chuẩn Quốc Tế (Tier-1 Standard)',
    badge: 'GLI-19 Standard',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: ShieldCheck,
    desc: 'Cân bằng tối ưu giữa phát hiện gian lận và kiểm soát báo động giả (False Positive < 2%).',
    highlights: 'Khung giờ 60s | Dung sai tiền 15% | Surebet > 0.5%',
  },
  {
    id: 'ULTRA_STRICT',
    name: 'Siêu Khắt Khe (Zero Tolerance)',
    badge: 'Duyệt Rút Tiền',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: Zap,
    desc: 'Ngưỡng kiểm soát cực chặt, truy quét cả vi mô (Micro-hedging), phù hợp khóa rút tiền lớn.',
    highlights: 'Khung giờ 180s | Bắt lệch tiền tới 35% | Bắt cả kèo hòa vốn 0%',
  },
  {
    id: 'REBATE_HUNTER',
    name: 'Chống Bào Hoàn Trả (Rebate & Bonus)',
    badge: 'Chống Thất Thoát',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: Target,
    desc: 'Truy quét cược 2 đầu triệt tiêu rủi ro (Net Exposure < 5%) cày doanh số VIP/hoàn trả hoa hồng.',
    highlights: 'Độ lộ rủi ro < 5% | Chuỗi lặp >= 2 ván | Bắt cược cân bảng',
  },
  {
    id: 'SPORTS_SHARP',
    name: 'Bào Cỏ Thể Thao (Sports Arbing Pro)',
    badge: 'Chuyên Gia Kèo',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: Flame,
    desc: 'Chuyên trị thợ bào cỏ, cược công thức Kelly, bắt kèo nhầm giá (Palpable Error) và rung trễ.',
    highlights: 'Soi Odds Margin < 1.0 | Khớp công thức chia tiền Kelly | Courtsiding < 3s',
  },
];

export function ScanConfig({ category, onStart, onBack }: ScanConfigProps) {
  const [selectedProfile, setSelectedProfile] = useState<string>(
    category === 'sports' ? 'SPORTS_SHARP' : 'STANDARD'
  );

  const [granularOptions, setGranularOptions] = useState({
    net_exposure: true,
    kelly_signature: true,
    palpable_error: true,
    courtsiding: true,
    persistence_tracking: true,
    zscore_hypothesis: true,
    table_coverage: true,
  });

  const toggleOption = (key: keyof typeof granularOptions) => {
    setGranularOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStart = () => {
    onStart({
      profile_id: selectedProfile,
      options: granularOptions,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Profile Selection Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Chọn Cấp Độ Nghiêm Ngặt (Strictness Profile)
          </label>
          <span className="text-xs text-slate-400">Tham chiếu chuẩn quản trị rủi ro quốc tế</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {STRICTNESS_PROFILES.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedProfile === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedProfile(p.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 relative ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                    : 'bg-slate-800/50 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-100 text-sm leading-tight">{p.name}</h4>
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border mt-0.5 ${p.badgeColor}`}>
                        {p.badge}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-2.5">{p.desc}</p>
                <div className="text-[11px] font-mono text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  ⚡ {p.highlights}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Granular Anti-Fraud Rules Checklist */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            {category === 'sports' ? <Trophy className="w-4 h-4 text-emerald-400" /> : <Dices className="w-4 h-4 text-purple-400" />}
            <h3 className="font-semibold text-slate-200 text-sm">
              Bộ Thuật Toán & Quy Tắc Kiểm Định Chuyên Sâu Đang Kích Hoạt
            </h3>
          </div>
          <span className="text-xs text-safe font-medium">Đã kích hoạt 7 lớp bảo vệ</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={granularOptions.net_exposure}
              onChange={() => toggleOption('net_exposure')}
              className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
            />
            <div>
              <span className="font-semibold text-slate-200">Chỉ số Triệt Tiêu Rủi Ro (Net Exposure &lt; 5%)</span>
              <p className="text-slate-400 text-[11px] mt-0.5">Phát hiện cược 2 đầu cân bảng hầu như không chịu biến động giá trị để bào hoàn trả.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={granularOptions.kelly_signature}
              onChange={() => toggleOption('kelly_signature')}
              className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
            />
            <div>
              <span className="font-semibold text-slate-200">Dấu Vết Chia Tiền Cược Arbing (Kelly Signature)</span>
              <p className="text-slate-400 text-[11px] mt-0.5">Bắt tỷ lệ tiền cược khớp với công thức chia tiền cân bằng lợi nhuận của bot bào cỏ.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={granularOptions.palpable_error}
              onChange={() => toggleOption('palpable_error')}
              className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
            />
            <div>
              <span className="font-semibold text-slate-200">Bắt Khai Thác Kèo Nhầm Giá (Palpable Error &gt; 6%)</span>
              <p className="text-slate-400 text-[11px] mt-0.5">Tự động gắn cờ các ván đánh vào tỷ lệ kèo bị nhầm lẫn giữa hai trang để thu hồi vé.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={granularOptions.courtsiding}
              onChange={() => toggleOption('courtsiding')}
              className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
            />
            <div>
              <span className="font-semibold text-slate-200">Đồng Bộ Vi Mô / Rung Trễ (Courtsiding &lt;= 3s)</span>
              <p className="text-slate-400 text-[11px] mt-0.5">Bắt các lệnh cược khớp cùng lúc trong tích tắc qua tool hoặc cược ăn theo độ trễ sóng truyền hình.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={granularOptions.persistence_tracking}
              onChange={() => toggleOption('persistence_tracking')}
              className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
            />
            <div>
              <span className="font-semibold text-slate-200">Chuỗi Ván Lặp Lại Liên Tiếp (Multi-Round Persistence)</span>
              <p className="text-slate-400 text-[11px] mt-0.5">Truy vết các cặp tài khoản cược đối ứng qua 2, 5, 10+ ván để quy kết hành vi đánh nhóm có tổ chức.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={granularOptions.zscore_hypothesis}
              onChange={() => toggleOption('zscore_hypothesis')}
              className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
            />
            <div>
              <span className="font-semibold text-slate-200">Kiểm Định Giả Thuyết Thống Kê (Z-Score Hypothesis)</span>
              <p className="text-slate-400 text-[11px] mt-0.5">Xác định xác suất ngẫu nhiên theo phân phối nhị thức. Đánh dấu các chuỗi thắng bất khả thi (p &lt; 0.001).</p>
            </div>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-2">
        <button className="btn-secondary" onClick={onBack}>Quay lại</button>
        <button 
          className="btn-primary flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-6 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-600/25"
          onClick={handleStart}
        >
          Áp dụng Thuật toán & Quét dữ liệu <Play className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
