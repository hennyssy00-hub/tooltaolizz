import { Alert } from '@/types';
import { formatDateTime, getSeverityColor, getAlertTypeLabel } from '@/lib/utils';
import { Circle } from 'lucide-react';

export function FraudTimeline({ alerts }: { alerts: Alert[] }) {
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  // Sort by time ascending
  const sortedAlerts = [...safeAlerts].sort((a, b) => {
    const tA = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tB = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tA - tB;
  });

  return (
    <div className="card h-[600px] flex flex-col">
      <h3 className="font-medium text-slate-100 mb-6">Timeline cảnh báo</h3>
      
      <div className="flex-1 overflow-y-auto pr-4 space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
        {sortedAlerts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Chưa có dòng thời gian cảnh báo
          </div>
        ) : (
          sortedAlerts.map((alert, i) => {
            const sevColor = getSeverityColor(alert?.severity);
            const dotColor = sevColor.split(' ')[0] || 'text-slate-400';
            const timeStr = formatDateTime(alert?.timestamp);
            const timeDisplay = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;
            const playerList = Array.isArray(alert?.playerIds) && alert.playerIds.length > 0 
              ? alert.playerIds.join(', ') 
              : 'Tài khoản nghi vấn';

            return (
              <div key={alert.id || i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-slate-800 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Circle className={`w-3 h-3 fill-current ${dotColor}`} />
                </div>
                
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg bg-slate-800 border border-slate-700 shadow">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium ${dotColor} truncate max-w-[140px]`}>
                      {getAlertTypeLabel(alert?.type)}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {timeDisplay}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300 truncate">
                    Ván: {alert?.roundId || 'N/A'} • {playerList}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
