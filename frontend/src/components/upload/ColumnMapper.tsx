'use client';

import { useState, useMemo } from 'react';
import { ArrowRight, Check, Dices, Trophy, Star, ShieldAlert } from 'lucide-react';

interface ColumnMapperProps {
  detectedColumns: string[];
  category: 'casino' | 'sports';
  onConfirm: (mapping: Record<string, string>) => void;
  onBack: () => void;
}

const CASINO_FIELD_GROUPS = [
  {
    group: '⭐ 6 CỘT VÀNG CỐT LÕI (BẮT BUỘC ĐỂ LỌC GIAN LẬN)',
    fields: [
      { id: 'playerId', label: '⭐ [1] Tên Người Chơi / Tài Khoản (Player ID)' },
      { id: 'roundId', label: '⭐ [2] Mã Ván / Phiên Cược (Round ID)' },
      { id: 'betChoice', label: '⭐ [3] Cửa Cược (Player, Banker, Big, Small...)' },
      { id: 'stake', label: '⭐ [4] Số Tiền Cược Từng Ván (Stake)' },
      { id: 'timestamp', label: '⭐ [5] Thời Gian Đặt Cược (Timestamp / Giây)' },
      { id: 'ipAddress', label: '⭐ [6] Địa Chỉ IP (IP / Login IP / Bet IP)' },
    ],
  },
  {
    group: '🏢 THÔNG TIN BỔ TRỢ & NÂNG CAO',
    fields: [
      { id: 'provider', label: '🏢 Sảnh / Nhà Cung Cấp (Provider)' },
      { id: 'deviceId', label: '📱 Mã Thiết Bị / Fingerprint (Device ID)' },
      { id: 'agentId', label: '🏢 Mã Đại Lý / Upline (Agent ID)' },
      { id: 'validBet', label: '💰 Cược Hợp Lệ (Valid Bet / Turnover)' },
      { id: 'payout', label: '💵 Tiền Thắng / Thua (Payout)' },
      { id: 'tableId', label: '🎲 Mã Bàn (Table ID)' },
      { id: 'gameType', label: '🎮 Loại Game (Baccarat, Sicbo, Roulette...)' },
      { id: 'betTypeDetail', label: '⚡ Loại Cược / Thị Trường (Market Type)' },
      { id: 'result', label: '🏆 Kết Quả Ván Cược (Result)' },
    ],
  },
  {
    group: '🚫 KHÔNG DÙNG TÍNH TOÁN',
    fields: [
      { id: 'ignore', label: '-- Bỏ qua (Không dùng tính gian lận) --' },
    ],
  },
];

const SPORTS_FIELD_GROUPS = [
  {
    group: '⭐ 6 CỘT VÀNG CỐT LÕI (BẮT BUỘC ĐỂ LỌC GIAN LẬN THỂ THAO)',
    fields: [
      { id: 'playerId', label: '⭐ [1] Tên Người Chơi / Tài Khoản (Player ID)' },
      { id: 'eventName', label: '⭐ [2] Tên Trận Đấu (Arsenal vs Chelsea...)' },
      { id: 'betChoice', label: '⭐ [3] Cửa Cược (Over, Under, Home, Away...)' },
      { id: 'odds', label: '⭐ [4] Tỷ Lệ Kèo (Odds / Price: 1.95, 2.05...)' },
      { id: 'stake', label: '⭐ [5] Số Tiền Cược Từng Trận (Stake)' },
      { id: 'timestamp', label: '⭐ [6] Thời Gian Đặt Cược (Timestamp / Giây)' },
    ],
  },
  {
    group: '🏢 THÔNG TIN BỔ TRỢ & NÂNG CAO',
    fields: [
      { id: 'ipAddress', label: '🌐 Địa Chỉ IP (IP / Login IP / Bet IP)' },
      { id: 'provider', label: '🏢 Nhà Cái / Trang Cược (Bookmaker)' },
      { id: 'deviceId', label: '📱 Mã Thiết Bị / Fingerprint (Device ID)' },
      { id: 'agentId', label: '🏢 Mã Đại Lý / Upline (Agent ID)' },
      { id: 'league', label: '🏆 Giải Đấu (League: Premier League, C1...)' },
      { id: 'gameType', label: '⚽ Môn Thể Thao (Bóng đá, Bóng rổ...)' },
      { id: 'validBet', label: '💰 Cược Hợp Lệ (Turnover)' },
      { id: 'payout', label: '💵 Tiền Thắng / Thua (Payout)' },
      { id: 'betTypeDetail', label: '⚡ Kèo Rung / In-Play / Early (Running)' },
      { id: 'result', label: '🏆 Kết Quả (Result)' },
    ],
  },
  {
    group: '🚫 KHÔNG DÙNG TÍNH TOÁN',
    fields: [
      { id: 'ignore', label: '-- Bỏ qua (Không dùng tính gian lận) --' },
    ],
  },
];

export function ColumnMapper({ detectedColumns, category, onConfirm, onBack }: ColumnMapperProps) {
  const fieldGroups = category === 'sports' ? SPORTS_FIELD_GROUPS : CASINO_FIELD_GROUPS;
  const goldenIds = category === 'sports' 
    ? ['playerId', 'eventName', 'betChoice', 'odds', 'stake', 'timestamp']
    : ['playerId', 'roundId', 'betChoice', 'stake', 'timestamp', 'ipAddress'];

  const goldenDefinitions = category === 'sports'
    ? [
        { id: 'playerId', title: '1. Tài Khoản' },
        { id: 'eventName', title: '2. Trận Đấu' },
        { id: 'betChoice', title: '3. Cửa Cược' },
        { id: 'odds', title: '4. Tỷ Lệ Odds' },
        { id: 'stake', title: '5. Tiền Cược' },
        { id: 'timestamp', title: '6. Thời Gian' },
      ]
    : [
        { id: 'playerId', title: '1. Tài Khoản' },
        { id: 'roundId', title: '2. Mã Ván' },
        { id: 'betChoice', title: '3. Cửa Cược' },
        { id: 'stake', title: '4. Tiền Cược' },
        { id: 'timestamp', title: '5. Thời Gian' },
        { id: 'ipAddress', title: '6. Địa Chỉ IP' },
      ];

  // Auto-mapping logic
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    detectedColumns.forEach(col => {
      const lower = col.toLowerCase();
      // Universal detection first (IP, device, agent, account names, deposit/withdraw ignore)
      if (lower === 'ip' || lower.includes('ip_') || lower.includes('_ip') || lower.includes('địa chỉ ip') || lower.includes('ip address')) {
        initial[col] = 'ipAddress';
      } else if (lower.includes('device') || lower.includes('thiết bị') || lower.includes('fingerprint') || lower.includes('mac') || lower.includes('imei')) {
        initial[col] = 'deviceId';
      } else if (lower.includes('agent') || lower.includes('đại lý') || lower.includes('upline') || lower.includes('affiliate') || lower.includes('tuyến trên')) {
        initial[col] = 'agentId';
      } else if (lower.includes('user') || lower.includes('player') || lower.includes('member') || lower.includes('tài khoản') || lower.includes('tên tài khoản') || lower.includes('tên nick') || lower.includes('username') || lower.includes('tên người chơi')) {
        initial[col] = 'playerId';
      } else if (lower.includes('nạp') || lower.includes('rút') || lower.includes('deposit') || lower.includes('withdraw') || lower.includes('cấp độ') || lower.includes('ghi chú') || lower.includes('người mời') || lower.includes('loại tài khoản') || lower.includes('trạng thái')) {
        initial[col] = 'ignore';
      } else if (category === 'sports') {
        if (lower.includes('match') || lower.includes('trận') || lower.includes('event') || lower.includes('teams')) initial[col] = 'eventName';
        else if (lower.includes('odd') || lower.includes('tỷ lệ') || lower.includes('rate') || lower.includes('kèo')) initial[col] = 'odds';
        else if (lower.includes('league') || lower.includes('giải')) initial[col] = 'league';
        else if (lower.includes('sport') || lower.includes('game') || lower.includes('môn')) initial[col] = 'gameType';
        else if (lower.includes('choice') || lower.includes('selection') || lower.includes('cửa')) initial[col] = 'betChoice';
        else if (lower.includes('valid') || lower.includes('hợp lệ')) initial[col] = 'validBet';
        else if (lower.includes('tiền cược') || lower.includes('stake') || lower.includes('cược') || lower.includes('bet amount')) initial[col] = 'stake';
        else if (lower.includes('win') || lower.includes('thắng') || lower.includes('payout')) initial[col] = 'payout';
        else if (lower.includes('time') || lower.includes('date') || lower.includes('ngày') || lower.includes('giờ')) initial[col] = 'timestamp';
        else if (lower.includes('running') || lower.includes('rung') || lower.includes('market')) initial[col] = 'betTypeDetail';
        else initial[col] = 'ignore';
      } else {
        if (lower.includes('txid') || lower.includes('round') || lower.includes('phiên') || lower.includes('ván')) initial[col] = 'roundId';
        else if (lower.includes('table') || lower.includes('bàn')) initial[col] = 'tableId';
        else if (lower.includes('provider') || lower.includes('sảnh')) initial[col] = 'provider';
        else if (lower.includes('game') || lower.includes('trò')) initial[col] = 'gameType';
        else if (lower.includes('cửa') || lower.includes('choice') || lower.includes('selection')) initial[col] = 'betChoice';
        else if (lower.includes('valid') || lower.includes('hợp lệ')) initial[col] = 'validBet';
        else if (lower.includes('tiền cược') || lower.includes('stake') || lower.includes('cược') || lower.includes('bet amount')) initial[col] = 'stake';
        else if (lower.includes('win') || lower.includes('thắng') || lower.includes('payout')) initial[col] = 'payout';
        else if (lower.includes('time') || lower.includes('date') || lower.includes('ngày') || lower.includes('giờ')) initial[col] = 'timestamp';
        else initial[col] = 'ignore';
      }
    });
    return initial;
  });

  const handleChange = (column: string, field: string) => {
    setMapping(prev => ({ ...prev, [column]: field }));
  };

  // Sort columns so 6 Golden Columns appear at the top, then other mapped, then ignored
  const sortedColumns = useMemo(() => {
    return [...detectedColumns].sort((a, b) => {
      const fieldA = mapping[a] || 'ignore';
      const fieldB = mapping[b] || 'ignore';
      
      const isGoldenA = goldenIds.includes(fieldA);
      const isGoldenB = goldenIds.includes(fieldB);
      
      if (isGoldenA && !isGoldenB) return -1;
      if (!isGoldenA && isGoldenB) return 1;
      
      const isIgnoredA = fieldA === 'ignore';
      const isIgnoredB = fieldB === 'ignore';
      
      if (!isIgnoredA && isIgnoredB) return -1;
      if (isIgnoredA && !isIgnoredB) return 1;
      
      return 0;
    });
  }, [detectedColumns, mapping, goldenIds]);

  const mappedGoldenCount = useMemo(() => {
    const values = Object.values(mapping);
    return goldenIds.filter(id => values.includes(id)).length;
  }, [mapping, goldenIds]);

  return (
    <div className="space-y-6">
      {/* Category Header */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${
        category === 'sports' 
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
          : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
      }`}>
        <div className="flex items-center gap-3">
          {category === 'sports' ? <Trophy className="w-5 h-5 text-emerald-400" /> : <Dices className="w-5 h-5 text-purple-400" />}
          <div>
            <p className="font-semibold text-sm">
              Đang chuẩn hóa dữ liệu cho: {category === 'sports' ? '⚽ Cá Cược Thể Thao' : '🎰 Sảnh Live Casino'}
            </p>
            <p className="text-xs opacity-80">
              Đã phát hiện {detectedColumns.length} cột trong file. Hệ thống ưu tiên đưa 6 Cột Vàng cốt lõi lên hàng đầu.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono uppercase bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
          Chế độ {category}
        </span>
      </div>

      {/* 6 Golden Columns Progress Checklist */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 shadow-inner">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              6 CỘT VÀNG ƯU TIÊN HÀNG ĐẦU (BẮT BUỘC ĐỂ LỌC GIAN LẬN)
            </h4>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
            mappedGoldenCount >= 5 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}>
            Đã nhận diện: {mappedGoldenCount}/6 Cột Vàng
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {goldenDefinitions.map(g => {
            const isMapped = Object.values(mapping).includes(g.id);
            return (
              <div 
                key={g.id} 
                className={`p-2.5 rounded-xl text-center border transition-all ${
                  isMapped 
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm' 
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-tight">{g.title}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {isMapped ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-[11px] font-semibold text-emerald-300">Đã khớp</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] text-slate-500">Chưa chọn</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Column Mapping Table */}
      <div className="card p-5">
        <div className="grid grid-cols-2 gap-4 mb-4 pb-3 border-b border-slate-700 font-semibold text-slate-300 text-xs uppercase tracking-wider">
          <div>Tên Cột Trong File Của Bạn</div>
          <div>Trường Dữ Liệu Tương Ứng Trong Hệ Thống</div>
        </div>
        
        <div className="space-y-2.5">
          {sortedColumns.map(col => {
            const currentField = mapping[col] || 'ignore';
            const isGolden = goldenIds.includes(currentField);
            const isIgnored = currentField === 'ignore';

            return (
              <div 
                key={col} 
                className={`grid grid-cols-2 gap-4 items-center p-3 rounded-xl border transition-all ${
                  isGolden 
                    ? 'bg-amber-500/5 border-amber-500/40 shadow-sm ring-1 ring-amber-500/20' 
                    : isIgnored 
                      ? 'bg-slate-800/20 border-slate-800 text-slate-500' 
                      : 'bg-slate-800/60 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isGolden ? (
                    <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md">
                      ⭐ CỘT VÀNG
                    </span>
                  ) : isIgnored ? (
                    <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium bg-slate-700/50 text-slate-400 rounded-md">
                      Bỏ qua
                    </span>
                  ) : (
                    <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-300 rounded-md">
                      Bổ trợ
                    </span>
                  )}
                  <span className={`text-sm font-medium truncate ${isGolden ? 'text-amber-200 font-semibold' : isIgnored ? 'text-slate-400' : 'text-slate-200'}`} title={col}>
                    {col}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight className={`w-4 h-4 shrink-0 ${isGolden ? 'text-amber-400' : 'text-slate-500'}`} />
                  <select 
                    className={`input-field text-xs py-2 font-medium ${
                      isGolden 
                        ? 'border-amber-500/50 text-amber-200 bg-slate-900 font-semibold' 
                        : isIgnored 
                          ? 'border-slate-700 text-slate-400 bg-slate-800/60' 
                          : 'border-blue-500/40 text-blue-300 bg-slate-800'
                    }`}
                    value={currentField}
                    onChange={(e) => handleChange(col, e.target.value)}
                  >
                    {fieldGroups.map((grp, gIdx) => (
                      <optgroup key={gIdx} label={grp.group}>
                        {grp.fields.map(f => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-4">
        <button className="btn-secondary" onClick={onBack}>
          ← Quay lại chọn file
        </button>
        <button 
          className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm font-semibold shadow-lg shadow-blue-600/30"
          onClick={() => onConfirm(mapping)}
        >
          <span>Xác nhận & Cấu hình quét</span>
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}