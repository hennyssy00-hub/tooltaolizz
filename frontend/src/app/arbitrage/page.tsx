'use client';

import React, { useState, useCallback } from 'react';
import { 
  Upload, Search, FileSpreadsheet, Trash2, Play, Download, 
  AlertTriangle, Shield, CheckCircle, XCircle, ChevronDown, ChevronUp,
  Plus, Loader2
} from 'lucide-react';

// Types
interface PlatformFile {
  platformName: string;
  displayName: string;
  fileName: string;
  totalRecords: number;
  uniqueAccounts: number;
  uniqueRounds: number;
}

interface ValidPair {
  match_type: string;
  platform_a: string;
  platform_b: string;
  account_a: string;
  account_b: string;
  rounds: number;
  equal_stake: number;
  equal_stake_ratio: number;
  total_stake: number;
  total_diff: number;
  same_hand: number;
  remark: string;
}

interface EliminatedPair {
  match_type: string;
  platform_a: string;
  platform_b: string;
  account_a: string;
  account_b: string;
  arb_rounds: number;
  equal_stake: number;
  total_stake: number;
  total_diff: number;
  same_hand: number;
  remark: string;
}

interface ScanResult {
  session_id: string;
  stats: {
    total_platforms: number;
    total_valid_pairs: number;
    total_eliminated: number;
    internal_pairs: number;
    external_pairs: number;
  };
  valid_pairs: ValidPair[];
  eliminated_pairs: EliminatedPair[];
  scanned_at: string;
}

const BACKEND = '/api';

export default function ArbitragePage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<PlatformFile[]>([]);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEliminated, setShowEliminated] = useState(false);

  // Config
  const [config, setConfig] = useState({
    internal_min_rounds: 3,
    external_min_rounds: 4,
    min_equal_stake_ratio: 0.90,
    max_stake_diff_pct: 0.10,
    min_payout_pct: 0.90,
    max_payout_pct: 1.00,
  });

  // Platform name for upload
  const [newPlatformName, setNewPlatformName] = useState('');

  const createSession = async () => {
    try {
      const res = await fetch(`${BACKEND}/arbitrage/session`, { method: 'POST' });
      const data = await res.json();
      setSessionId(data.session_id);
      setPlatforms([]);
      setResult(null);
      setError(null);
      return data.session_id;
    } catch (e: any) {
      setError('Không thể tạo session: ' + e.message);
      return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !newPlatformName.trim()) {
      setError('Vui lòng nhập tên đài và chọn file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      let sid = sessionId;
      if (!sid) {
        sid = await createSession();
        if (!sid) return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('platform_name', newPlatformName.trim());
      formData.append('session_id', sid);

      const res = await fetch(`${BACKEND}/arbitrage/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Upload thất bại');
      }

      const data = await res.json();
      setPlatforms(prev => [...prev, {
        platformName: data.platform,
        displayName: data.display_name,
        fileName: data.filename,
        totalRecords: data.total_records,
        uniqueAccounts: data.unique_accounts,
        uniqueRounds: data.unique_rounds,
      }]);
      setNewPlatformName('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const runScan = async () => {
    if (!sessionId || platforms.length < 1) {
      setError('Cần upload ít nhất 1 file đài');
      return;
    }

    setScanning(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('internal_min_rounds', config.internal_min_rounds.toString());
      formData.append('external_min_rounds', config.external_min_rounds.toString());
      formData.append('min_equal_stake_ratio', config.min_equal_stake_ratio.toString());
      formData.append('max_stake_diff_pct', config.max_stake_diff_pct.toString());
      formData.append('min_payout_pct', config.min_payout_pct.toString());
      formData.append('max_payout_pct', config.max_payout_pct.toString());

      const res = await fetch(`${BACKEND}/arbitrage/scan`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Quét thất bại');
      }

      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  };

  const downloadReport = async (fileType: 'main' | 'eliminated') => {
    try {
      const res = await fetch(`${BACKEND}/arbitrage/download/${fileType}`);
      if (!res.ok) throw new Error('Download thất bại');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileType === 'main' ? '对打结果.xlsx' : '同手淘汰记录.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const resetAll = async () => {
    if (sessionId) {
      try {
        await fetch(`${BACKEND}/arbitrage/session/${sessionId}`, { method: 'DELETE' });
      } catch {}
    }
    setSessionId(null);
    setPlatforms([]);
    setResult(null);
    setError(null);
  };

  const formatMoney = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-red-400" />
            Quét Đối Đả / Arbitrage Detection
          </h1>
          <p className="text-slate-400 mt-1">
            Phát hiện cặp tài khoản đối đả giữa các đài — 内对打 + 外对打
          </p>
        </div>
        {(platforms.length > 0 || result) && (
          <button onClick={resetAll} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Làm lại từ đầu
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 1: Upload */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
          Upload File Game Các Đài
        </h2>

        {/* Uploaded platforms */}
        {platforms.length > 0 && (
          <div className="mb-4 space-y-2">
            {platforms.map((p, i) => (
              <div key={i} className="bg-slate-900 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-400" />
                  <div>
                    <span className="text-white font-medium">{p.displayName}</span>
                    <span className="text-slate-500 text-sm ml-2">({p.fileName})</span>
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-slate-400">
                  <span>{p.totalRecords.toLocaleString()} dòng</span>
                  <span>{p.uniqueAccounts} TK</span>
                  <span>{p.uniqueRounds.toLocaleString()} ván</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add new platform */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Tên đài (vd: 22, 87, AG...)"
            value={newPlatformName}
            onChange={e => setNewPlatformName(e.target.value)}
            className="px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 w-52 focus:outline-none focus:border-blue-500"
          />
          <label className="cursor-pointer px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {uploading ? 'Đang tải...' : 'Chọn file (.xlsx / .csv)'}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading || !newPlatformName.trim()}
            />
          </label>
        </div>
      </div>

      {/* Step 2: Config */}
      {platforms.length > 0 && !result && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-700">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-7 h-7 bg-orange-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                Cấu hình & Mức độ nhạy của hệ thống
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Chọn chế độ độ nhạy được tối ưu sẵn hoặc tùy chỉnh thủ công bên dưới</p>
            </div>

            {/* Quick Sensitivity Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setConfig({
                  internal_min_rounds: 2,
                  external_min_rounds: 3,
                  min_equal_stake_ratio: 0.80,
                  max_stake_diff_pct: 0.15,
                  min_payout_pct: 0.85,
                  max_payout_pct: 1.05,
                })}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600/20 text-red-300 border border-red-500/50 hover:bg-red-600/30 flex items-center gap-1.5 transition-all shadow-sm"
                title="Bắt sớm mọi dấu hiệu đối đả từ 2-3 ván, quét rộng cả cược lệch nhẹ"
              >
                <span>🔥 Siêu Nhạy (Cao Nhất)</span>
              </button>

              <button
                type="button"
                onClick={() => setConfig({
                  internal_min_rounds: 3,
                  external_min_rounds: 4,
                  min_equal_stake_ratio: 0.90,
                  max_stake_diff_pct: 0.10,
                  min_payout_pct: 0.90,
                  max_payout_pct: 1.00,
                })}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600/20 text-blue-300 border border-blue-500/50 hover:bg-blue-600/30 flex items-center gap-1.5 transition-all shadow-sm"
                title="Chuẩn 15 Quy tắc đối đả (Nội >= 3, Ngoại >= 4, Bằng tiền >= 90%, Lệch <= 10%)"
              >
                <span>⭐ Chuẩn 15 Quy Tắc</span>
              </button>

              <button
                type="button"
                onClick={() => setConfig({
                  internal_min_rounds: 3,
                  external_min_rounds: 4,
                  min_equal_stake_ratio: 1.00,
                  max_stake_diff_pct: 0.05,
                  min_payout_pct: 0.90,
                  max_payout_pct: 1.00,
                })}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-600/30 flex items-center gap-1.5 transition-all shadow-sm"
                title="Chỉ bắt các cặp cược đúng 100% bằng tiền tuyệt đối"
              >
                <span>🎯 Bằng Tiền Tuyệt Đối (100%)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-slate-400 text-sm block mb-1">内对打 ván tối thiểu</label>
              <input type="number" min={1} value={config.internal_min_rounds}
                onChange={e => setConfig(c => ({...c, internal_min_rounds: +e.target.value}))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono" />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">外对打 ván tối thiểu</label>
              <input type="number" min={1} value={config.external_min_rounds}
                onChange={e => setConfig(c => ({...c, external_min_rounds: +e.target.value}))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono" />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">Bằng tiền / Ván tối thiểu</label>
              <select value={config.min_equal_stake_ratio}
                onChange={e => setConfig(c => ({...c, min_equal_stake_ratio: +e.target.value}))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono">
                <option value={0.70}>70%</option>
                <option value={0.80}>80%</option>
                <option value={0.85}>85%</option>
                <option value={0.90}>90% (Chuẩn)</option>
                <option value={0.95}>95%</option>
                <option value={1.00}>100%</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">Chênh cược tối đa</label>
              <select value={config.max_stake_diff_pct}
                onChange={e => setConfig(c => ({...c, max_stake_diff_pct: +e.target.value}))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono">
                <option value={0.05}>5%</option>
                <option value={0.10}>10% (Chuẩn)</option>
                <option value={0.15}>15% (Nhạy cao)</option>
                <option value={0.20}>20%</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">Payout tối thiểu</label>
              <select value={config.min_payout_pct}
                onChange={e => setConfig(c => ({...c, min_payout_pct: +e.target.value}))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono">
                <option value={0.80}>80%</option>
                <option value={0.85}>85%</option>
                <option value={0.90}>90% (Chuẩn)</option>
                <option value={0.95}>95%</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">Payout tối đa</label>
              <select value={config.max_payout_pct}
                onChange={e => setConfig(c => ({...c, max_payout_pct: +e.target.value}))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono">
                <option value={1.00}>100% (Chuẩn 1:1)</option>
                <option value={1.05}>105% (Dung sai phụ)</option>
                <option value={1.10}>110%</option>
              </select>
            </div>
          </div>

          <button onClick={runScan} disabled={scanning}
            className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors">
            {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {scanning ? 'Đang quét...' : 'Bắt đầu quét đối đả'}
          </button>
        </div>
      )}

      {/* Step 3: Results */}
      {result && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Tổng đài" value={result.stats.total_platforms} color="blue" />
            <StatCard label="Cặp đối đả" value={result.stats.total_valid_pairs} color="red" />
            <StatCard label="内对打" value={result.stats.internal_pairs} color="orange" />
            <StatCard label="外对打" value={result.stats.external_pairs} color="purple" />
            <StatCard label="Loại (同手)" value={result.stats.total_eliminated} color="gray" />
          </div>

          {/* Download buttons */}
          <div className="flex gap-3">
            <button onClick={() => downloadReport('main')}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium flex items-center gap-2">
              <Download className="w-4 h-4" /> Tải 对打结果.xlsx
            </button>
            {result.eliminated_pairs.length > 0 && (
              <button onClick={() => downloadReport('eliminated')}
                className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium flex items-center gap-2">
                <Download className="w-4 h-4" /> Tải 同手淘汰记录.xlsx
              </button>
            )}
          </div>

          {/* Valid Pairs Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Cặp đối đả hợp lệ ({result.valid_pairs.length})
              </h3>
            </div>
            {result.valid_pairs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p>Không phát hiện cặp đối đả nào</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left">对打组</th>
                      <th className="px-4 py-3 text-left">Loại</th>
                      <th className="px-4 py-3 text-left">本站账号</th>
                      <th className="px-4 py-3 text-left">其他站账号</th>
                      <th className="px-4 py-3 text-center">Ván</th>
                      <th className="px-4 py-3 text-center">Bằng tiền</th>
                      <th className="px-4 py-3 text-right">Tổng tiền</th>
                      <th className="px-4 py-3 text-right">Lệch</th>
                      <th className="px-4 py-3 text-left">备注</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {result.valid_pairs.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-750">
                        <td className="px-4 py-3 text-white font-medium">{p.platform_a}-{p.platform_b}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            p.match_type === '内对打' ? 'bg-green-900/50 text-green-300' : 'bg-blue-900/50 text-blue-300'
                          }`}>{p.match_type}</span>
                        </td>
                        <td className="px-4 py-3 text-white font-mono">{p.account_a}</td>
                        <td className="px-4 py-3 text-white font-mono">{p.account_b}</td>
                        <td className="px-4 py-3 text-center text-red-400 font-bold">{p.rounds}</td>
                        <td className="px-4 py-3 text-center text-yellow-400">{p.equal_stake}</td>
                        <td className="px-4 py-3 text-right text-white">{formatMoney(p.total_stake)}</td>
                        <td className="px-4 py-3 text-right text-orange-400">{formatMoney(p.total_diff)}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{p.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Eliminated Pairs */}
          {result.eliminated_pairs.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <button onClick={() => setShowEliminated(!showEliminated)}
                className="w-full p-4 border-b border-slate-700 flex items-center justify-between hover:bg-slate-750">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-gray-400" />
                  Loại do cùng tay ({result.eliminated_pairs.length})
                </h3>
                {showEliminated ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              {showEliminated && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900 text-slate-400">
                      <tr>
                        <th className="px-4 py-3 text-left">对打组</th>
                        <th className="px-4 py-3 text-left">账号A</th>
                        <th className="px-4 py-3 text-left">账号B</th>
                        <th className="px-4 py-3 text-center">Ván đối打</th>
                        <th className="px-4 py-3 text-center">Bằng tiền</th>
                        <th className="px-4 py-3 text-right">Tổng tiền</th>
                        <th className="px-4 py-3 text-right">Lệch</th>
                        <th className="px-4 py-3 text-center">同手Ván</th>
                        <th className="px-4 py-3 text-left">备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {result.eliminated_pairs.map((p, i) => (
                        <tr key={i} className="bg-slate-900/30">
                          <td className="px-4 py-3 text-slate-400">{p.platform_a}-{p.platform_b}</td>
                          <td className="px-4 py-3 text-slate-300 font-mono">{p.account_a}</td>
                          <td className="px-4 py-3 text-slate-300 font-mono">{p.account_b}</td>
                          <td className="px-4 py-3 text-center text-slate-400">{p.arb_rounds}</td>
                          <td className="px-4 py-3 text-center text-slate-400">{p.equal_stake}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{formatMoney(p.total_stake)}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{formatMoney(p.total_diff)}</td>
                          <td className="px-4 py-3 text-center text-red-400 font-bold">{p.same_hand}</td>
                          <td className="px-4 py-3 text-red-400 text-xs">{p.remark}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-900/30 border-blue-800',
    red: 'text-red-400 bg-red-900/30 border-red-800',
    orange: 'text-orange-400 bg-orange-900/30 border-orange-800',
    purple: 'text-purple-400 bg-purple-900/30 border-purple-800',
    gray: 'text-gray-400 bg-gray-900/30 border-gray-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.gray}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-80 mt-1">{label}</p>
    </div>
  );
}
