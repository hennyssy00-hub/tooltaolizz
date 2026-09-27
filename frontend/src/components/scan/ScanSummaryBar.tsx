import { ScanSummary } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { Database, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';

export function ScanSummaryBar({ scan }: { scan: ScanSummary }) {
  const totalBets = typeof scan?.totalBets === 'number' ? scan.totalBets : 0;
  const totalAlerts = typeof scan?.totalAlerts === 'number' ? scan.totalAlerts : 0;
  const critical = scan?.criticalAlerts ?? 0;
  const high = scan?.highAlerts ?? 0;
  const medium = scan?.mediumAlerts ?? 0;
  const low = scan?.lowAlerts ?? 0;

  return (
    <div className="card mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 md:divide-x divide-slate-700">
      <div className="px-4">
        <p className="text-sm text-slate-400 mb-1">Phiên quét</p>
        <h3 className="text-lg font-semibold text-slate-100 truncate">{scan?.name || 'Phiên quét đối soát'}</h3>
        <p className="text-xs text-slate-500 mt-1">{formatDateTime(scan?.date)}</p>
      </div>

      <div className="px-4 flex items-center gap-3">
        <div className="p-3 bg-blue-500/10 rounded-lg">
          <Database className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <p className="text-sm text-slate-400 mb-0.5">Tổng vé cược</p>
          <p className="text-xl font-bold text-slate-100">{totalBets.toLocaleString('vi-VN')}</p>
        </div>
      </div>

      <div className="px-4 flex items-center gap-3">
        <div className="p-3 bg-critical/10 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-critical" />
        </div>
        <div>
          <p className="text-sm text-slate-400 mb-0.5">Tổng cảnh báo</p>
          <p className="text-xl font-bold text-critical">{totalAlerts}</p>
        </div>
      </div>

      <div className="px-4">
        <p className="text-sm text-slate-400 mb-2">Mức độ cảnh báo</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-critical/20 text-critical text-center py-1 rounded text-sm font-medium border border-critical/30">{critical}</div>
          <div className="flex-1 bg-suspicious/20 text-suspicious text-center py-1 rounded text-sm font-medium border border-suspicious/30">{high}</div>
          <div className="flex-1 bg-watch/20 text-watch text-center py-1 rounded text-sm font-medium border border-watch/30">{medium}</div>
          <div className="flex-1 bg-safe/20 text-safe text-center py-1 rounded text-sm font-medium border border-safe/30">{low}</div>
        </div>
      </div>
    </div>
  );
}
