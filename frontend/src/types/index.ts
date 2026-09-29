export type RiskLevel = 'safe' | 'watch' | 'suspicious' | 'critical';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'pending' | 'confirmed' | 'dismissed';
export type PlatformCategory = 'all' | 'casino' | 'sports';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BetBrief {
  id: string;
  playerId: string;
  platform: string;
  category?: 'CASINO' | 'SPORTS';
  gameType: string;
  betChoice: string;
  odds?: number;
  eventName?: string;
  stake: number;
  timestamp: string;
  ipAddress?: string;
  deviceId?: string;
  agentId?: string;
  provider?: string;
  betTypeDetail?: string;
}

export interface Bet extends BetBrief {
  roundId?: string;
  tableId?: string;
  league?: string;
  payout: number;
  result: string;
}

export interface ScanListItem {
  id: string;
  name: string;
  category?: 'CASINO' | 'SPORTS' | 'ALL';
  date: string;
  platforms: string[];
  totalBets: number;
  totalAlerts: number;
  status: 'completed' | 'processing' | 'failed';
}

export interface ScanSummary extends ScanListItem {
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
}

export interface AlertListItem {
  id: string;
  scanId: string;
  type: string;
  category?: 'CASINO' | 'SPORTS';
  severity: Severity;
  status: AlertStatus;
  playerIds: string[];
  gameType: string;
  roundId?: string;
  eventName?: string;
  riskScore: number;
  timestamp: string;
}

export interface EvidencePair {
  betA: Bet;
  betB: Bet;
  timeDiffSeconds: number;
  stakeDiffPercentage: number;
  sameIp?: boolean;
  sameSubnet?: boolean;
  sameDevice?: boolean;
  sameAgent?: boolean;
  ipA?: string;
  ipB?: string;
  deviceA?: string;
  deviceB?: string;
}

export interface Alert extends AlertListItem {
  evidence: EvidencePair | Bet[];
  description: string;
}

export interface AccountListItem {
  playerId: string;
  platforms: string[];
  totalBets: number;
  totalAlerts: number;
  riskScore: number;
  riskLevel: RiskLevel;
  isBlacklisted?: boolean;
  blacklistReason?: string;
  lastSeen?: string;
}

export interface Account extends AccountListItem {
  winRate: number;
  avgStake: number;
  avgSessionDuration: number; // in minutes
  history: { date: string; riskScore: number }[];
}

export interface DashboardStats {
  totalBets: number;
  criticalAlerts: number;
  suspiciousAccounts: number;
  avgRiskScore: number;
}

export interface TrendDataPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface RiskDistribution {
  level: RiskLevel;
  count: number;
}

export interface PlatformConfig {
  id: string;
  name: string;
}

export interface ColumnMapping {
  fileColumn: string;
  standardField: string;
}
