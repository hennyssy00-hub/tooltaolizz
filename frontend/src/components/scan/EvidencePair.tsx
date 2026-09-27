import { Alert, Bet } from '@/types';
import { formatCurrency, formatDateTime, getSeverityColor, getAlertTypeLabel } from '@/lib/utils';
import { Swords, Clock, Percent, ShieldAlert, Check, X, Eye, User, Network, AlertTriangle } from 'lucide-react';
import { Badge } from '../common/Badge';

export function EvidencePair({ alert }: { alert: Alert }) {
  if (!alert) return null;

  const severity = alert.severity || 'medium';
  const riskScore = alert.riskScore ?? 50;
  const gameType = alert.gameType || 'Live Casino';
  const roundId = alert.roundId || (alert.evidence as any)?.round_id || 'N/A';
  const timestamp = alert.timestamp || new Date().toISOString();
  const description = alert.description || 'Phát hiện mẫu cược bất thường';

  const evidence = (alert.evidence && typeof alert.evidence === 'object' && !Array.isArray(alert.evidence)) 
    ? (alert.evidence as any) 
    : {};

  const betA: Bet | undefined = evidence.betA;
  const betB: Bet | undefined = evidence.betB;
  const hasBothBets = Boolean(betA && betB);
  const timeDiff = evidence.timeDiffSeconds ?? evidence.sync_latency_sec ?? 0;
  const stakeDiff = evidence.stakeDiffPercentage ?? 0;
  const tags: string[] = Array.isArray(evidence.tags) ? evidence.tags : [];

  const BetCard = ({ bet, title }: { bet?: Bet; title: string }) => {
    if (!bet) return null;
    const betChoice = bet.betChoice || 'N/A';
    const isCritical = betChoice.toLowerCase() === 'banker' || betChoice.toLowerCase().includes('tài');
    const timeFormatted = formatDateTime(bet.timestamp);
    const timeDisplay = timeFormatted.includes(' ') ? timeFormatted.split(' ')[1] : timeFormatted;

    return (
      <div className="flex-1 bg-slate-900 rounded-lg p-4 border border-slate-700 min-w-0">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
          <span className="font-medium text-slate-200">{title}</span>
          <Badge>{bet.platform || 'Sảnh cược'}</Badge>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Người chơi:</span>
            <span className="font-mono text-blue-400 truncate max-w-[180px]">{bet.playerId || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Cửa cược:</span>
            <span className={`font-medium ${isCritical ? 'text-critical' : 'text-blue-500'}`}>
              {betChoice}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tiền cược:</span>
            <span className="font-mono text-slate-200">{formatCurrency(bet.stake)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Thời gian:</span>
            <span className="text-slate-300">{timeDisplay}</span>
          </div>
        </div>
      </div>
    );
  };

  const severityColor = getSeverityColor(severity);
  const borderClass = severityColor.replace('text-', 'border-').split(' ')[0] || 'border-amber-500';
  const iconColor = severityColor.split(' ')[0] || 'text-amber-500';

  return (
    <div className={`card overflow-hidden border-l-4 ${borderClass}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <ShieldAlert className={`w-5 h-5 ${iconColor}`} />
            <h4 className="text-lg font-medium text-slate-100">{getAlertTypeLabel(alert.type)}</h4>
            <Badge variant={severity === 'critical' ? 'danger' : severity === 'high' ? 'warning' : 'default'}>
              Score: {riskScore}
            </Badge>
          </div>
          <p className="text-sm text-slate-400">
            {gameType} • Ván: {roundId} • {formatDateTime(timestamp)}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button className="p-2 bg-safe/10 text-safe rounded hover:bg-safe hover:text-white transition-colors" title="Xác nhận gian lận">
            <Check className="w-4 h-4" />
          </button>
          <button className="p-2 bg-slate-800 text-slate-400 rounded hover:bg-slate-700 hover:text-slate-200 transition-colors" title="Bỏ qua">
            <X className="w-4 h-4" />
          </button>
          <button className="p-2 bg-slate-800 text-slate-400 rounded hover:bg-slate-700 hover:text-slate-200 transition-colors" title="Xem chi tiết">
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-slate-800/50 p-3 rounded-lg mb-4 text-sm text-slate-300">
        {description}
      </div>

      {hasBothBets ? (
        <div className="flex flex-col md:flex-row items-stretch gap-4 relative">
          <BetCard bet={betA} title="Vé cược A" />
          
          <div className="flex md:flex-col justify-center items-center gap-2 z-10 my-[-15px] md:my-0 md:mx-[-20px]">
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-critical relative z-10 shadow-lg">
              <Swords className="w-5 h-5" />
            </div>
          </div>
          
          <BetCard bet={betB} title="Vé cược B" />
        </div>
      ) : betA ? (
        <div className="flex flex-col md:flex-row items-stretch gap-4">
          <BetCard bet={betA} title="Vé cược liên quan" />
          <div className="flex-1 bg-slate-900 rounded-lg p-4 border border-slate-700">
            <span className="font-medium text-slate-200 block mb-3 pb-2 border-b border-slate-800">
              Chi tiết chỉ số nghi vấn
            </span>
            <div className="space-y-2 text-sm text-slate-300">
              <p>Mô hình phát hiện: <span className="font-semibold text-amber-400">{getAlertTypeLabel(alert.type)}</span></p>
              {evidence.net_exposure_pct !== undefined && (
                <p>Tỷ lệ phơi nhiễm rủi ro: <span className="font-mono text-emerald-400">{evidence.net_exposure_pct}%</span></p>
              )}
              {evidence.persistence_rounds !== undefined && (
                <p>Số ván phát hiện liên tiếp: <span className="font-mono text-red-400">{evidence.persistence_rounds} ván</span></p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-sm text-slate-400">
          Tài khoản vi phạm: {Array.isArray(alert.playerIds) ? alert.playerIds.join(', ') : 'N/A'}
        </div>
      )}

      {(timeDiff > 0 || stakeDiff > 0 || tags.length > 0) && (
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-4 text-sm bg-slate-900/30 -mx-6 -mb-6 p-4 px-6">
          {timeDiff > 0 && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-4 h-4 text-slate-500" />
              Chênh lệch thời gian: <span className="font-medium text-critical">{timeDiff} giây</span>
            </div>
          )}
          {stakeDiff > 0 && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <Percent className="w-4 h-4 text-slate-500" />
              Chênh lệch tiền cược: <span className="font-medium text-watch">{stakeDiff}%</span>
            </div>
          )}
          {tags.map((tag, idx) => (
            <span key={idx} className="text-xs bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
