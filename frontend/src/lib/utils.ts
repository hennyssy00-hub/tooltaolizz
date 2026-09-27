import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null) {
  try {
    const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(val);
  } catch {
    return `${(amount || 0).toLocaleString()} đ`;
  }
}

export function formatDateTime(dateString: string | undefined | null) {
  if (!dateString) return 'Chưa cập nhật';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    return format(date, 'dd/MM/yyyy HH:mm:ss', { locale: vi });
  } catch (e) {
    return String(dateString);
  }
}

export function getRiskColor(level: string | undefined | null): string {
  if (!level) return 'text-slate-400 bg-slate-800 border-slate-700';
  switch (level.toLowerCase()) {
    case 'safe': return 'text-safe bg-safe/10 border-safe/20';
    case 'watch': return 'text-watch bg-watch/10 border-watch/20';
    case 'suspicious': return 'text-suspicious bg-suspicious/10 border-suspicious/20';
    case 'critical': return 'text-critical bg-critical/10 border-critical/20';
    default: return 'text-slate-400 bg-slate-800 border-slate-700';
  }
}

export function getRiskIcon(level: string | undefined | null): string {
  if (!level) return '⚪';
  switch (level.toLowerCase()) {
    case 'safe': return '🟢';
    case 'watch': return '🟡';
    case 'suspicious': return '🟠';
    case 'critical': return '🔴';
    default: return '⚪';
  }
}

export function getAlertTypeLabel(type: string | undefined | null): string {
  if (!type) return 'Cảnh báo vi phạm';
  const types: Record<string, string> = {
    'cross_hedging': 'Cược chéo hai đầu (Casino)',
    'table_coverage': 'Cược bao bàn (Roulette/Sicbo)',
    'syndicate': 'Nhóm đánh vây (Syndicate)',
    'statistical_anomaly': 'Bất thường thống kê / Bot',
    'martingale': 'Gấp thếp rủi ro',
    'sports_arbitrage': 'Bào cỏ / Surebets (Thể Thao)',
    'sports_hedge': 'Cược đối kháng trận đấu (Thể Thao)',
    'CROSS_HEDGE': 'Cược chéo hai đầu (Casino)',
    'TABLE_COVERAGE': 'Cược bao bàn (Casino)',
    'SYNDICATE': 'Nhóm đánh vây (Syndicate)',
    'ANOMALY': 'Bất thường thống kê / Bot',
    'SPORTS_ARBITRAGE': 'Bào cỏ / Surebets (Thể Thao)',
    'SPORTS_HEDGE': 'Cược đối kháng trận đấu (Thể Thao)',
  };
  return types[type] || types[type.toUpperCase()] || type;
}

export function getSeverityColor(severity: string | undefined | null): string {
  if (!severity) return 'text-slate-400 bg-slate-800 border-slate-700';
  switch (severity.toLowerCase()) {
    case 'low': return 'text-safe bg-safe/10 border-safe/20';
    case 'medium': return 'text-watch bg-watch/10 border-watch/20';
    case 'high': return 'text-suspicious bg-suspicious/10 border-suspicious/20';
    case 'critical': return 'text-critical bg-critical/10 border-critical/20';
    default: return 'text-slate-400 bg-slate-800 border-slate-700';
  }
}
