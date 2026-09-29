'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Download, ArrowUpDown, ChevronDown, ChevronUp,
  Swords, ShieldAlert, CheckCircle2, Clock, DollarSign, Copy, Check,
  AlertTriangle, Dices, Layers
} from 'lucide-react';
import { Alert, Bet } from '@/types';

interface HeadToHeadTableProps {
  alerts: Alert[];
  scanName?: string;
}

export function HeadToHeadTable({ alerts, scanName = 'Phiên đối soát' }: HeadToHeadTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [gameFilter, setGameFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [equalStakeOnly, setEqualStakeOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'arbitrage' | 'syndicate'>('all');
  const [copiedRound, setCopiedRound] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Normalize alert items into flat Head-to-Head rows
  const rows = useMemo(() => {
    return alerts.map((alert, idx) => {
      const ev = (alert.evidence && typeof alert.evidence === 'object' && !Array.isArray(alert.evidence))
        ? (alert.evidence as any)
        : {};

      const betA: Bet | undefined = ev.betA;
      const betB: Bet | undefined = ev.betB;

      const rawAlert = alert as any;
      const alertType: string = rawAlert.alertType || rawAlert.type || rawAlert.alert_type || (ev.match_type ? 'CROSS_HEDGE' : 'UNKNOWN');

      const roundId = rawAlert.roundId || ev.roundId || ev.round_id || betA?.roundId || betB?.roundId || 'N/A';
      
      // Sanitize gameType: if numeric string (e.g. "-70.0" or "20.0"), replace with 'Baccarat'
      let rawGame = rawAlert.gameType || ev.gameType || ev.game || betA?.gameType || betB?.gameType || 'Baccarat';
      if (!isNaN(Number(rawGame)) && isFinite(Number(rawGame))) {
        rawGame = 'Baccarat';
      }
      const gameType = rawGame;

      const provider = (betA as any)?.provider || ev.provider || betA?.platform || 'Live Casino';
      const platformA = betA?.platform || ev.platform_a || 'Đài A';
      const platformB = betB?.platform || ev.platform_b || 'Đài B';

      const accountA = betA?.playerId || (alert.playerIds && alert.playerIds[0]) || 'TK-A';
      const accountB = betB?.playerId || (alert.playerIds && alert.playerIds[1]) || 'TK-B';

      const betChoiceA = betA?.betChoice || ev.choice_a || 'N/A';
      const betChoiceB = betB?.betChoice || ev.choice_b || 'N/A';

      const stakeA = betA?.stake ?? ev.stake_a ?? 0;
      const stakeB = betB?.stake ?? ev.stake_b ?? 0;
      const totalStake = stakeA + stakeB;
      const stakeDiff = Math.abs(stakeA - stakeB);
      const isEqualStake = stakeDiff < 0.01 && stakeA > 0;

      const payoutA = betA?.payout ?? 0;
      const payoutB = betB?.payout ?? 0;

      // Accurate time difference calculation
      let timeDiff = ev.timeDiffSeconds ?? ev.sync_latency_sec ?? rawAlert.timeDiffSeconds ?? rawAlert.time_diff_seconds;
      if ((timeDiff === undefined || timeDiff === null) && betA?.timestamp && betB?.timestamp) {
        try {
          const tA = new Date(betA.timestamp).getTime();
          const tB = new Date(betB.timestamp).getTime();
          if (!isNaN(tA) && !isNaN(tB)) {
            timeDiff = Math.round(Math.abs(tA - tB) / 1000 * 10) / 10;
          }
        } catch (e) {
          timeDiff = 0;
        }
      }
      timeDiff = typeof timeDiff === 'number' ? timeDiff : 0;

      const severity = alert.severity || 'medium';
      const riskScore = alert.riskScore ?? 50;
      const description = alert.description || '';

      return {
        id: alert.id || `row-${idx}`,
        alertType,
        roundId,
        gameType,
        provider,
        platformA,
        platformB,
        accountA,
        accountB,
        betChoiceA,
        betChoiceB,
        stakeA,
        stakeB,
        totalStake,
        stakeDiff,
        isEqualStake,
        payoutA,
        payoutB,
        timeDiff,
        severity,
        riskScore,
        description,
        betA,
        betB,
        coOccurrence: ev.co_occurrence || ev.coOccurrence || 0,
        oppositeOccurrence: ev.opposite_occurrence || ev.oppositeOccurrence || 0,
        tags: Array.isArray(ev.tags) ? ev.tags : [],
      };
    });
  }, [alerts]);

  // Counts for tabs
  const typeCounts = useMemo(() => {
    let arbitrage = 0;
    let syndicate = 0;
    rows.forEach(r => {
      if (r.alertType === 'SYNDICATE' || r.roundId === 'N/A') {
        syndicate++;
      } else {
        arbitrage++;
      }
    });
    return { arbitrage, syndicate, all: rows.length };
  }, [rows]);

  // Unique games for filter dropdown
  const gamesList = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.gameType && r.gameType !== 'N/A') set.add(r.gameType); });
    return Array.from(set);
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      // Type tab filter
      if (typeFilter === 'arbitrage' && (r.alertType === 'SYNDICATE' || r.roundId === 'N/A')) return false;
      if (typeFilter === 'syndicate' && !(r.alertType === 'SYNDICATE' || r.roundId === 'N/A')) return false;

      if (equalStakeOnly && !r.isEqualStake) return false;
      if (gameFilter !== 'all' && r.gameType !== gameFilter) return false;
      if (severityFilter !== 'all' && r.severity.toLowerCase() !== severityFilter.toLowerCase()) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const inRound = r.roundId.toLowerCase().includes(q);
        const inA = r.accountA.toLowerCase().includes(q);
        const inB = r.accountB.toLowerCase().includes(q);
        const inDesc = r.description.toLowerCase().includes(q);
        const inProvider = r.provider.toLowerCase().includes(q);
        if (!inRound && !inA && !inB && !inDesc && !inProvider) return false;
      }

      return true;
    });
  }, [rows, typeFilter, searchTerm, gameFilter, severityFilter, equalStakeOnly]);

  // KPI Summary
  const kpi = useMemo(() => {
    const totalRounds = filteredRows.length;
    const equalCount = filteredRows.filter(r => r.isEqualStake).length;
    const totalMoney = filteredRows.reduce((acc, r) => acc + r.totalStake, 0);
    const totalDiffMoney = filteredRows.reduce((acc, r) => acc + r.stakeDiff, 0);
    const equalRatio = totalRounds > 0 ? (equalCount / totalRounds) * 100 : 0;

    return { totalRounds, equalCount, totalMoney, totalDiffMoney, equalRatio };
  }, [filteredRows]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRound(text);
    setTimeout(() => setCopiedRound(null), 2000);
  };

  const exportCSV = () => {
    if (filteredRows.length === 0) return;
    const headers = [
      'Mã Ván (Round ID)', 'Đài A', 'Đài B', 'Sảnh', 'Game',
      'Tài Khoản A', 'Cửa Cược A', 'Tiền Cược A', 'Thắng Thua A',
      'Tài Khoản B', 'Cửa Cược B', 'Tiền Cược B', 'Thắng Thua B',
      'Bằng Tiền', 'Tổng Tiền', 'Lệch Tiền', 'Lệch Giây', 'Mức Độ', 'Điểm Rủi Ro', 'Mô Tả'
    ];

    const lines = filteredRows.map(r => [
      `"${r.roundId}"`, `"${r.platformA}"`, `"${r.platformB}"`, `"${r.provider}"`, `"${r.gameType}"`,
      `"${r.accountA}"`, `"${r.betChoiceA}"`, r.stakeA, r.payoutA,
      `"${r.accountB}"`, `"${r.betChoiceB}"`, r.stakeB, r.payoutB,
      r.isEqualStake ? 'CÓ' : 'KHÔNG', r.totalStake, r.stakeDiff, r.timeDiff,
      r.severity, r.riskScore, `"${r.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...lines.map(l => l.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_Sach_Doi_Dau_${scanName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatMoney = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-5">
      {/* 5 KPI Cards for Head-to-Head Analysis */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-tight">Số ván đối đầu</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-bold text-white font-mono">{kpi.totalRounds}</span>
            <span className="text-xs text-slate-500">ván</span>
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-tight">Ván cược bằng tiền</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-bold text-amber-400 font-mono">{kpi.equalCount}</span>
            <span className="text-xs text-amber-500/80 font-semibold">({kpi.equalRatio.toFixed(0)}%)</span>
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-tight">Tổng tiền cược 2 bên</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-xl font-bold text-blue-400 font-mono truncate">{formatMoney(kpi.totalMoney)}</span>
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-tight">Tổng tiền chênh lệch</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className={`text-xl font-bold font-mono truncate ${kpi.totalDiffMoney === 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
              {formatMoney(kpi.totalDiffMoney)}
            </span>
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-tight">Tỷ lệ đối xứng</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className={`text-2xl font-bold font-mono ${kpi.equalRatio >= 90 ? 'text-emerald-400' : 'text-slate-300'}`}>
              {kpi.equalRatio.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500">{kpi.equalRatio >= 90 ? 'Cực cao' : 'Bình thường'}</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Arbitrage vs Syndicate vs All */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-750 pb-3">
        <button
          onClick={() => setTypeFilter('arbitrage')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            typeFilter === 'arbitrage'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-slate-700/60'
          }`}
        >
          <Swords className="w-3.5 h-3.5" />
          <span>⚔️ Ván Đối Đầu Trực Diện ({typeCounts.arbitrage})</span>
        </button>
        <button
          onClick={() => setTypeFilter('syndicate')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            typeFilter === 'syndicate'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-slate-700/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>👥 Nhóm Đánh Vây / Cùng Hội ({typeCounts.syndicate})</span>
        </button>
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            typeFilter === 'all'
              ? 'bg-slate-700 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-slate-700/60'
          }`}
        >
          <span>Tất Cả ({typeCounts.all})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã ván (局号), tài khoản A, tài khoản B..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Tất cả trò chơi</option>
              {gamesList.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Mọi mức độ</option>
              <option value="critical">🔴 Nguy hiểm (Critical)</option>
              <option value="high">🟠 Cao (High)</option>
              <option value="medium">🟡 Trung bình (Medium)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-700">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-700/60">
            <input
              type="checkbox"
              checked={equalStakeOnly}
              onChange={(e) => setEqualStakeOnly(e.target.checked)}
              className="rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-0"
            />
            <span>Chỉ xem bằng tiền 100%</span>
          </label>

          <button
            onClick={exportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
            title="Xuất toàn bộ danh sách đối đầu này ra file CSV/Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Detailed Head-to-Head Table */}
      <div className="bg-slate-850 border border-slate-750 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-750 select-none">
              <tr>
                <th className="py-3.5 px-3 text-center w-12">#</th>
                <th className="py-3.5 px-3">Mã Ván (三方游戏局号)</th>
                <th className="py-3.5 px-3">Đài & Sảnh</th>
                <th className="py-3.5 px-3">Trò Chơi</th>
                <th className="py-3.5 px-3 text-center">Tài Khoản Đối Đầu</th>
                <th className="py-3.5 px-3 text-center">Cửa Cược A ↔ B</th>
                <th className="py-3.5 px-3 text-right">Tiền Cược A ↔ B</th>
                <th className="py-3.5 px-3 text-right">Lệch Tiền</th>
                <th className="py-3.5 px-3 text-center">Lệch Giây</th>
                <th className="py-3.5 px-3 text-center">Đánh Giá</th>
                <th className="py-3.5 px-3 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-750/70 font-medium">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <ShieldAlert className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-slate-300">Không tìm thấy ván cược đối đầu nào phù hợp bộ lọc</p>
                    <p className="text-xs text-slate-500 mt-1">Hãy thử xóa từ khóa tìm kiếm hoặc chọn tất cả trò chơi.</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, i) => {
                  const isExpanded = expandedRow === r.id;
                  const isCritical = r.severity.toLowerCase() === 'critical';
                  const isHigh = r.severity.toLowerCase() === 'high';

                  return (
                    <React.Fragment key={r.id}>
                      <tr 
                        onClick={() => setExpandedRow(isExpanded ? null : r.id)}
                        className={`hover:bg-slate-800/80 transition-colors cursor-pointer ${
                          isCritical ? 'bg-rose-950/15' : isHigh ? 'bg-amber-950/10' : ''
                        }`}
                      >
                        <td className="py-3.5 px-3 text-center text-slate-500 font-mono text-[11px]">{i + 1}</td>

                        {/* Mã Ván (Round ID) */}
                        <td className="py-3.5 px-3">
                          {r.alertType === 'SYNDICATE' && r.roundId === 'N/A' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 text-[11px]">
                              👥 Nhóm {r.coOccurrence > 0 ? `${r.coOccurrence} ván` : 'Liên kết'}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 group">
                              <span className="font-mono text-blue-300 font-semibold truncate max-w-[140px]" title={r.roundId}>
                                {r.roundId}
                              </span>
                              {r.roundId !== 'N/A' && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(r.roundId); }}
                                  className="text-slate-500 hover:text-slate-200 transition-colors p-0.5"
                                  title="Sao chép mã ván"
                                >
                                  {copiedRound === r.roundId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Đài & Sảnh */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-white text-[11px] truncate max-w-[120px]">
                              {r.platformA}-{r.platformB}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              {r.provider}
                            </span>
                          </div>
                        </td>

                        {/* Trò chơi */}
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            {r.gameType}
                          </span>
                        </td>

                        {/* Tài khoản A vs B */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-mono text-amber-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700/80 truncate max-w-[110px]" title={r.accountA}>
                              {r.accountA}
                            </span>
                            <Swords className="w-3 h-3 text-red-500 shrink-0" />
                            <span className="font-mono text-cyan-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700/80 truncate max-w-[110px]" title={r.accountB}>
                              {r.accountB}
                            </span>
                          </div>
                        </td>

                        {/* Cửa cược A ↔ B */}
                        <td className="py-3.5 px-3 text-center">
                          {r.alertType === 'SYNDICATE' && (r.betChoiceA === 'N/A' || r.betChoiceA === 'UNKNOWN') ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-750">
                              Chung phòng/bàn
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 font-bold">
                              <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-700/50">
                                {r.betChoiceA}
                              </span>
                              <span className="text-slate-500 text-[10px]">vs</span>
                              <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-700/50">
                                {r.betChoiceB}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Tiền Cược A ↔ B */}
                        <td className="py-3.5 px-3 text-right font-mono">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-slate-200">{formatMoney(r.stakeA)}</span>
                            <span className="text-slate-600">/</span>
                            <span className="text-slate-200">{formatMoney(r.stakeB)}</span>
                          </div>
                        </td>

                        {/* Lệch Tiền */}
                        <td className="py-3.5 px-3 text-right font-mono">
                          {r.isEqualStake ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              0.00 (Bằng)
                            </span>
                          ) : (
                            <span className="text-orange-400 font-bold">
                              {formatMoney(r.stakeDiff)}
                            </span>
                          )}
                        </td>

                        {/* Lệch Giây */}
                        <td className="py-3.5 px-3 text-center">
                          {r.alertType === 'SYNDICATE' && r.roundId === 'N/A' ? (
                            <span className="text-slate-500 text-xs">-</span>
                          ) : (
                            <span className={`font-mono text-[11px] px-2 py-0.5 rounded font-bold ${
                              r.timeDiff <= 1.5 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                                : r.timeDiff <= 5 
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                  : 'text-slate-400'
                            }`}>
                              {r.timeDiff.toFixed(1)}s
                            </span>
                          )}
                        </td>

                        {/* Đánh Giá / Severity */}
                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-tight ${
                            isCritical 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                              : isHigh 
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                                : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                          }`}>
                            {r.alertType === 'SYNDICATE' ? 'HỘI NHÓM' : r.severity} ({r.riskScore})
                          </span>
                        </td>

                        {/* Chevron expand */}
                        <td className="py-3.5 px-3 text-center text-slate-500">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </td>
                      </tr>

                      {/* Expanded Row Detail */}
                      {isExpanded && (
                        <tr className="bg-slate-900/90 border-b border-slate-750">
                          <td colSpan={11} className="p-4 px-6">
                            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                                <span className="font-bold text-white text-xs flex items-center gap-2">
                                  <Swords className="w-4 h-4 text-red-400" />
                                  Phân Tích Chi Tiết Ván Đối Đầu: Mã Ván #{r.roundId}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {r.description}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Vé cược A */}
                                <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
                                  <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-800">
                                    <span className="font-bold text-amber-300">Tài khoản A: {r.accountA}</span>
                                    <span className="text-xs text-slate-400">{r.platformA}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div><span className="text-slate-500">Cửa cược:</span> <span className="font-bold text-white">{r.betChoiceA}</span></div>
                                    <div><span className="text-slate-500">Số tiền:</span> <span className="font-mono text-white">{formatMoney(r.stakeA)}</span></div>
                                    <div><span className="text-slate-500">Thắng/thua:</span> <span className={`font-mono font-bold ${r.payoutA > 0 ? 'text-emerald-400' : r.payoutA < 0 ? 'text-red-400' : 'text-slate-400'}`}>{formatMoney(r.payoutA)}</span></div>
                                    <div><span className="text-slate-500">Thời gian:</span> <span className="text-slate-300">{r.betA?.timestamp ? new Date(r.betA.timestamp).toLocaleTimeString() : 'N/A'}</span></div>
                                  </div>
                                </div>

                                {/* Vé cược B */}
                                <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
                                  <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-800">
                                    <span className="font-bold text-cyan-300">Tài khoản B: {r.accountB}</span>
                                    <span className="text-xs text-slate-400">{r.platformB}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div><span className="text-slate-500">Cửa cược:</span> <span className="font-bold text-white">{r.betChoiceB}</span></div>
                                    <div><span className="text-slate-500">Số tiền:</span> <span className="font-mono text-white">{formatMoney(r.stakeB)}</span></div>
                                    <div><span className="text-slate-500">Thắng/thua:</span> <span className={`font-mono font-bold ${r.payoutB > 0 ? 'text-emerald-400' : r.payoutB < 0 ? 'text-red-400' : 'text-slate-400'}`}>{formatMoney(r.payoutB)}</span></div>
                                    <div><span className="text-slate-500">Thời gian:</span> <span className="text-slate-300">{r.betB?.timestamp ? new Date(r.betB.timestamp).toLocaleTimeString() : 'N/A'}</span></div>
                                  </div>
                                </div>
                              </div>

                              {r.tags.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  <span className="text-[10px] text-slate-500 uppercase font-bold">Chỉ số nghi vấn:</span>
                                  {r.tags.map((tag: string, tIdx: number) => (
                                    <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
