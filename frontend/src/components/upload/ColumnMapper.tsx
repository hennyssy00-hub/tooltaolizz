'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  ArrowRight, Check, Dices, Trophy, Star, ShieldAlert, Sparkles, 
  ChevronDown, ChevronUp, Eye, EyeOff, RotateCcw, Zap
} from 'lucide-react';

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
      { id: 'roundId', label: '⭐ [2] Mã Ván / Phiên Cược (Round ID / 局号)' },
      { id: 'betChoice', label: '⭐ [3] Cửa Cược (Player, Banker, Big, Small / 投注区域)' },
      { id: 'stake', label: '⭐ [4] Số Tiền Cược Từng Ván (Stake / 投注额)' },
      { id: 'timestamp', label: '⭐ [5] Thời Gian Đặt Cược (Timestamp / 投注时间)' },
      { id: 'ipAddress', label: '⭐ [6] Địa Chỉ IP (IP / Login IP / Bet IP)' },
    ],
  },
  {
    group: '🏢 THÔNG TIN BỔ TRỢ & NÂNG CAO',
    fields: [
      { id: 'provider', label: '🏢 Sảnh / Nhà Cung Cấp / 厂商 (Provider)' },
      { id: 'gameType', label: '🎮 Loại Game / 游戏种类 (Game Type)' },
      { id: 'payout', label: '💵 Tiền Thắng / Thua / 游戏输赢 / 派彩 (Payout)' },
      { id: 'validBet', label: '💰 Cược Hợp Lệ / 有效投注 (Valid Bet)' },
      { id: 'deviceId', label: '📱 Mã Thiết Bị / Fingerprint (Device ID)' },
      { id: 'agentId', label: '🏢 Mã Đại Lý / Upline (Agent ID)' },
      { id: 'tableId', label: '🎲 Mã Bàn / 桌号 (Table ID)' },
      { id: 'betTypeDetail', label: '⚡ Loại Cược / Thị Trường (Market Type)' },
      { id: 'result', label: '🏆 Kết Quả Ván Cược / 结果 (Result)' },
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

// Comprehensive auto-detection engine for Chinese, Vietnamese, English
function autoDetect(col: string, category: 'casino' | 'sports'): string {
  const lower = col.toLowerCase().trim();

  // 1. IP
  if (
    lower === 'ip' || lower.includes('ip_') || lower.includes('_ip') || 
    lower.includes('địa chỉ ip') || lower.includes('ip address') ||
    lower.includes('投注ip') || lower.includes('登录ip') || lower.includes('ip地址')
  ) {
    return 'ipAddress';
  }

  // 2. Player ID / Account (Tài khoản / 用户名 / 账号)
  if (
    lower === '用户名' || lower === '账号' || lower === '帐号' || lower === '会员账号' ||
    lower.includes('会员') || lower.includes('user') || lower.includes('player') || 
    lower.includes('member') || lower.includes('tài khoản') || lower.includes('tên tài khoản') || 
    lower.includes('username') || lower.includes('tên người chơi') || lower === 'account'
  ) {
    return 'playerId';
  }

  // 3. Round ID (Mã ván / 局号 / 三方游戏局号)
  if (
    lower.includes('三方游戏局号') || lower.includes('游戏局号') || lower.includes('局号') || 
    lower.includes('三方局号') || lower.includes('round') || lower.includes('phiên') || 
    lower.includes('ván') || lower.includes('mã ván') || lower.includes('txid') || 
    lower.includes('bill no') || lower.includes('wager id') || lower.includes('注单号')
  ) {
    return 'roundId';
  }

  // 4. Bet Choice / Area (Cửa cược / 投注区域 / 下注区域)
  if (
    lower.includes('投注区域') || lower.includes('下注区域') || lower.includes('投注内容') || 
    lower.includes('下注内容') || lower.includes('投注类型') || lower.includes('cửa') || 
    lower.includes('cửa cược') || lower.includes('choice') || lower.includes('selection') || 
    lower.includes('bet on') || lower.includes('bet_choice')
  ) {
    return 'betChoice';
  }

  // 5. Stake / Bet Amount (Tiền cược / 投注额 / 投注金额)
  if (
    lower === '投注额' || lower === '下注额' || lower === '投注金额' || lower === '下注金额' ||
    lower.includes('tiền cược') || lower.includes('số tiền') || lower.includes('stake') || 
    lower.includes('bet amount') || lower.includes('bet_amount') || lower === 'amount'
  ) {
    return 'stake';
  }

  // 6. Timestamp / Bet Time (Thời gian / 投注时间 / 下注时间)
  if (
    lower === '投注时间' || lower === '下注时间' || lower.includes('thời gian') || 
    lower.includes('bet time') || lower.includes('timestamp') || lower.includes('ngày') || 
    lower.includes('date') || lower.includes('time')
  ) {
    return 'timestamp';
  }

  // 7. Provider / Platform (Sảnh / 厂商 / 平台)
  if (
    lower === '厂商' || lower === '游戏厂商' || lower.includes('sảnh') || 
    lower.includes('provider') || lower.includes('platform') || lower === '平台'
  ) {
    return 'provider';
  }

  // 8. Game Type (Loại game / 游戏 / 游戏种类)
  if (
    lower === '游戏' || lower === '游戏种类' || lower === '游戏类型' || 
    lower.includes('loại game') || lower.includes('trò chơi') || lower.includes('game type')
  ) {
    return 'gameType';
  }

  // 9. Payout / Win Loss (Thắng thua / 游戏输赢 / 派彩)
  if (
    lower === '游戏输赢' || lower === '输赢' || lower === '输赢金额' || lower === '派彩' || 
    lower === '盈亏' || lower.includes('thắng') || lower.includes('payout') || 
    lower.includes('win_loss') || lower.includes('winloss') || lower.includes('profit')
  ) {
    return 'payout';
  }

  // 10. Valid Bet (Cược hợp lệ / 有效投注)
  if (
    lower === '有效投注' || lower === '有效下注' || lower.includes('hợp lệ') || 
    lower.includes('valid bet') || lower.includes('turnover')
  ) {
    return 'validBet';
  }

  // 11. Table ID (Mã bàn / 桌号)
  if (lower.includes('table') || lower.includes('bàn') || lower.includes('桌号')) {
    return 'tableId';
  }

  // 12. Device ID
  if (lower.includes('device') || lower.includes('thiết bị') || lower.includes('fingerprint') || lower.includes('mac') || lower.includes('imei') || lower.includes('设备')) {
    return 'deviceId';
  }

  // 13. Agent ID
  if (lower.includes('agent') || lower.includes('đại lý') || lower.includes('upline') || lower.includes('affiliate') || lower.includes('代理')) {
    return 'agentId';
  }

  // 14. Sports specific
  if (category === 'sports') {
    if (lower.includes('match') || lower.includes('trận') || lower.includes('event') || lower.includes('teams')) return 'eventName';
    if (lower.includes('odd') || lower.includes('tỷ lệ') || lower.includes('rate') || lower.includes('kèo')) return 'odds';
    if (lower.includes('league') || lower.includes('giải')) return 'league';
    if (lower.includes('running') || lower.includes('rung') || lower.includes('market')) return 'betTypeDetail';
  }

  // 15. Standard Ignored columns (Trạng thái, kết toán, mã giao dịch)
  if (
    lower.includes('交易编号') || lower.includes('结算时间') || lower.includes('状态') ||
    lower.includes('status') || lower.includes('nạp') || lower.includes('rút') || 
    lower.includes('deposit') || lower.includes('withdraw') || lower.includes('cấp độ') || 
    lower.includes('ghi chú') || lower.includes('người mời') || lower.includes('loại tài khoản')
  ) {
    return 'ignore';
  }

  return 'ignore';
}

export function ColumnMapper({ detectedColumns, category, onConfirm, onBack }: ColumnMapperProps) {
  const fieldGroups = category === 'sports' ? SPORTS_FIELD_GROUPS : CASINO_FIELD_GROUPS;
  const goldenIds = category === 'sports' 
    ? ['playerId', 'eventName', 'betChoice', 'odds', 'stake', 'timestamp']
    : ['playerId', 'roundId', 'betChoice', 'stake', 'timestamp', 'ipAddress'];

  const goldenDefinitions = category === 'sports'
    ? [
        { id: 'playerId', title: '1. Tài Khoản', hint: 'Player ID / 用户名' },
        { id: 'eventName', title: '2. Trận Đấu', hint: 'Match / Event' },
        { id: 'betChoice', title: '3. Cửa Cược', hint: 'Selection / Kèo' },
        { id: 'odds', title: '4. Tỷ Lệ Odds', hint: 'Odds / Price' },
        { id: 'stake', title: '5. Tiền Cược', hint: 'Stake / Số tiền' },
        { id: 'timestamp', title: '6. Thời Gian', hint: 'Time / Giây' },
      ]
    : [
        { id: 'playerId', title: '1. Tài Khoản', hint: '用户名 / 账号 / Player' },
        { id: 'roundId', title: '2. Mã Ván', hint: '三方游戏局号 / 局号 / Round' },
        { id: 'betChoice', title: '3. Cửa Cược', hint: '投注区域 / Cửa / Banker, Player' },
        { id: 'stake', title: '4. Tiền Cược', hint: '投注额 / 投注金额 / Stake' },
        { id: 'timestamp', title: '5. Thời Gian', hint: '投注时间 / Timestamp' },
        { id: 'ipAddress', title: '6. Địa Chỉ IP', hint: 'IP / 投注IP / Login IP' },
      ];

  // Initial smart auto-mapping
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    detectedColumns.forEach(col => {
      initial[col] = autoDetect(col, category);
    });
    return initial;
  });

  const [showIgnored, setShowIgnored] = useState(false);

  // Run auto match again on click
  const handleAutoMatch = () => {
    const updated: Record<string, string> = {};
    detectedColumns.forEach(col => {
      updated[col] = autoDetect(col, category);
    });
    setMapping(updated);
  };

  const handleChange = (column: string, field: string) => {
    setMapping(prev => ({ ...prev, [column]: field }));
  };

  // Group columns into: Golden, Secondary, Ignored
  const { goldenColumns, secondaryColumns, ignoredColumns } = useMemo(() => {
    const golden: string[] = [];
    const secondary: string[] = [];
    const ignored: string[] = [];

    detectedColumns.forEach(col => {
      const field = mapping[col] || 'ignore';
      if (goldenIds.includes(field)) {
        golden.push(col);
      } else if (field === 'ignore') {
        ignored.push(col);
      } else {
        secondary.push(col);
      }
    });

    return { goldenColumns: golden, secondaryColumns: secondary, ignoredColumns: ignored };
  }, [detectedColumns, mapping, goldenIds]);

  const mappedGoldenCount = useMemo(() => {
    const values = Object.values(mapping);
    return goldenIds.filter(id => values.includes(id)).length;
  }, [mapping, goldenIds]);

  const isPerfectMatch = mappedGoldenCount === 6;

  return (
    <div className="space-y-6">
      {/* Category & Status Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isPerfectMatch 
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
          : 'bg-purple-500/10 border-purple-500/20 text-purple-300'
      }`}>
        <div className="flex items-center gap-3">
          {category === 'sports' ? <Trophy className="w-5 h-5 text-emerald-400 shrink-0" /> : <Dices className="w-5 h-5 text-purple-400 shrink-0" />}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">
                Chuẩn Hóa Cột Dữ Liệu {category === 'sports' ? 'Thể Thao' : 'Live Casino'}
              </span>
              {isPerfectMatch && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Check className="w-3 h-3" /> Tự động khớp 100%
                </span>
              )}
            </div>
            <p className="text-xs opacity-80 mt-0.5">
              Hệ thống đã tự động phân tích {detectedColumns.length} cột tiếng Trung/Anh/Việt. Bạn chỉ cần kiểm tra 6 Cột Vàng bên dưới và bấm tiếp tục.
            </p>
          </div>
        </div>

        <button 
          onClick={handleAutoMatch}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
          title="Tự động phân tích và khớp lại tất cả các cột"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Tự động khớp lại</span>
        </button>
      </div>

      {/* 6 Golden Columns Overview Cards */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              ⭐ 6 Cột Vàng Cốt Lõi (Bắt Buộc Để Lọc Gian Lận)
            </h3>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            mappedGoldenCount === 6 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}>
            Đã nhận diện: {mappedGoldenCount}/6 Cột Vàng
          </span>
        </div>

        {/* 6 Golden Fields Cards with direct column selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {goldenDefinitions.map((g) => {
            // Find which column in file is mapped to this golden field
            const mappedCol = Object.entries(mapping).find(([_, f]) => f === g.id)?.[0] || '';
            const isMatched = !!mappedCol;

            return (
              <div 
                key={g.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  isMatched 
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm shadow-emerald-950/50' 
                    : 'bg-slate-900/80 border-rose-500/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight truncate" title={g.title}>
                      {g.title}
                    </span>
                    {isMatched ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-[10px] text-rose-400 font-bold">Chưa chọn</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mb-2" title={g.hint}>
                    {g.hint}
                  </p>
                </div>

                {/* Direct column selector for this golden field */}
                <select
                  value={mappedCol}
                  onChange={(e) => {
                    const newCol = e.target.value;
                    setMapping(prev => {
                      const next = { ...prev };
                      // Clear previous column that had this field
                      if (mappedCol) next[mappedCol] = 'ignore';
                      // Assign new column to this field
                      if (newCol) next[newCol] = g.id;
                      return next;
                    });
                  }}
                  className={`w-full text-xs py-1.5 px-2 rounded-lg font-semibold border transition-all ${
                    isMatched 
                      ? 'bg-slate-900 border-emerald-500/60 text-emerald-300' 
                      : 'bg-slate-900 border-rose-500/50 text-slate-400'
                  }`}
                >
                  <option value="">-- Chưa gán cột --</option>
                  {detectedColumns.map(col => (
                    <option key={col} value={col}>
                      {col} {mapping[col] === g.id ? '✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary Fields (Provider, Game Type, Payout, Valid Bet...) */}
      {secondaryColumns.length > 0 && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
              <span>🏢 Thông Tin Bổ Trợ Đã Khớp ({secondaryColumns.length} cột)</span>
            </h4>
            <span className="text-[11px] text-slate-400">Tự động nhận diện cho sảnh, loại game, thắng thua</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {secondaryColumns.map(col => {
              const currentField = mapping[col] || 'ignore';
              return (
                <div key={col} className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-mono font-medium text-blue-300 block truncate" title={col}>
                      {col}
                    </span>
                    <span className="text-[10px] text-slate-500">Cột trong file</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <select
                    value={currentField}
                    onChange={(e) => handleChange(col, e.target.value)}
                    className="text-xs py-1 px-2.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 font-medium max-w-[160px]"
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
              );
            })}
          </div>
        </div>
      )}

      {/* Ignored Columns Collapsible (No more clutter!) */}
      {ignoredColumns.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowIgnored(!showIgnored)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              {showIgnored ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
              <span className="text-xs font-semibold text-slate-400">
                {showIgnored ? 'Ẩn danh sách' : 'Tự động bỏ qua'} {ignoredColumns.length} cột không dùng ({ignoredColumns.slice(0, 4).join(', ')}{ignoredColumns.length > 4 ? '...' : ''})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Bấm để {showIgnored ? 'thu gọn' : 'xem & chỉnh sửa'}</span>
              {showIgnored ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </div>
          </button>

          {showIgnored && (
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {ignoredColumns.map(col => (
                <div key={col} className="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400 font-mono truncate" title={col}>{col}</span>
                  <select
                    value={mapping[col] || 'ignore'}
                    onChange={(e) => handleChange(col, e.target.value)}
                    className="text-[11px] py-1 px-2 bg-slate-800 border border-slate-700 rounded text-slate-400 max-w-[150px]"
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button className="btn-secondary text-xs px-4 py-2.5" onClick={onBack}>
          ← Quay lại chọn file
        </button>
        <div className="flex items-center gap-3">
          {!isPerfectMatch && (
            <span className="text-xs text-amber-400 hidden sm:inline">
              ⚠️ Còn {6 - mappedGoldenCount} Cột Vàng chưa gán
            </span>
          )}
          <button 
            className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm font-semibold shadow-lg shadow-blue-600/30"
            onClick={() => onConfirm(mapping)}
          >
            <span>Xác nhận & Cấu hình quét</span>
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}