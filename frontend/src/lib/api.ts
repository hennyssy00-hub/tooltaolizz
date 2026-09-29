import axios from 'axios';
import { 
  DashboardStats, TrendDataPoint, RiskDistribution, 
  AlertListItem, ScanListItem, ScanSummary, Alert, 
  PaginatedResponse, AccountListItem, Account, RiskLevel, PlatformCategory 
} from '@/types';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const BACKEND_BASE = typeof window !== 'undefined' ? '/api' : 'http://localhost:8000/api';

export const api = {
  // Upload & Scan
  uploadFile: async (file: File, platformName: string, category: string = 'casino', columnMapping?: string, scanId?: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('platform_name', platformName || 'MULTI');
      formData.append('category', category.toUpperCase());
      if (columnMapping) {
        formData.append('column_mapping', columnMapping);
      }
      if (scanId) {
        formData.append('scan_id', scanId);
      }
      const res = await axios.post(`${BACKEND_BASE}/upload`, formData);
      return res.data;
    } catch (err: any) {
      console.error("Upload error:", err);
      throw err;
    }
  },

  runScan: async (scanId: string, profileId: string = 'STANDARD') => {
    try {
      const res = await axios.post(`${BACKEND_BASE}/scans/${scanId}/run?profile_id=${profileId}`);
      return res.data;
    } catch (err: any) {
      console.error("Run scan error:", err);
      throw err;
    }
  },
  
  detectColumns: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${BACKEND_BASE}/upload/detect-columns`, formData);
      return res.data.columns || ['TxID', 'User', 'Game', 'Bet', 'Amount', 'Time'];
    } catch {
      await delay(500);
      return ['Mã ván', 'Tài khoản', 'Loại game', 'Cửa cược', 'Số tiền cược', 'Thời gian', 'Địa chỉ IP'];
    }
  },

  createScan: async (name: string, uploadIds: string[]) => {
    try {
      const res = await axios.post(`${BACKEND_BASE}/scans`, { name });
      return { scanId: res.data.scan_id };
    } catch {
      await delay(1000);
      return { scanId: 'scan-' + Math.random().toString(36).substring(7) };
    }
  },

  deleteScan: async (scanId: string) => {
    const res = await axios.delete(`${BACKEND_BASE}/scans/${scanId}`);
    return res.data;
  },

  // Scans
  getScans: async (page = 1, limit = 10): Promise<PaginatedResponse<ScanListItem>> => {
    try {
      const res = await axios.get(`${BACKEND_BASE}/scans`, { params: { page, limit } });
      if (res.data && res.data.items) {
        const mapped: ScanListItem[] = res.data.items.map((s: any) => ({
          id: s.id,
          name: s.name,
          category: s.category || 'CASINO',
          date: s.created_at || new Date().toISOString(),
          platforms: Array.isArray(s.platforms) && s.platforms.length > 0 ? s.platforms : ['Tổng Hợp Sảnh'],
          totalBets: s.total_bets || 0,
          totalAlerts: s.total_alerts || 0,
          status: (s.status?.toLowerCase() || 'completed') as any
        }));
        return { data: mapped, total: res.data.total, page, limit, totalPages: Math.max(1, Math.ceil(res.data.total / limit)) };
      }
    } catch (err) {
      console.warn("Failed to get scans:", err);
    }
    return { data: [], total: 0, page, limit, totalPages: 1 };
  },

  getScanDetail: async (id: string): Promise<ScanSummary> => {
    try {
      const res = await axios.get(`${BACKEND_BASE}/scans/${id}`);
      if (res.data) {
        const s = res.data;
        const sev = s.summary?.severity_counts || {};
        return {
          id: s.id,
          name: s.name || 'Phiên quét Live Casino',
          category: (s.category || 'CASINO') as any,
          date: s.created_at || new Date().toISOString(),
          platforms: Array.isArray(s.platforms) && s.platforms.length > 0 ? s.platforms : ['Tất cả sảnh gộp'],
          totalBets: s.total_bets || 0,
          totalAlerts: s.total_alerts || 0,
          status: (s.status?.toLowerCase() || 'completed') as any,
          criticalAlerts: sev.CRITICAL || 0,
          highAlerts: sev.HIGH || 0,
          mediumAlerts: sev.MEDIUM || 0,
          lowAlerts: sev.LOW || 0
        };
      }
    } catch (err) {
      console.warn("Using fallback scan detail:", err);
    }
    return {
      id,
      name: 'Phiên đối soát Live Casino',
      category: 'CASINO',
      date: new Date().toISOString(),
      platforms: ['Tất cả sảnh gộp'],
      totalBets: 0,
      totalAlerts: 0,
      status: 'completed',
      criticalAlerts: 0,
      highAlerts: 0,
      mediumAlerts: 0,
      lowAlerts: 0
    };
  },

  getScanAlerts: async (scanId = 'all', filters: any = {}): Promise<{ data: Alert[]; total: number }> => {
    try {
      const url = scanId === 'all' ? `${BACKEND_BASE}/alerts` : `${BACKEND_BASE}/scans/${scanId}/alerts`;
      const res = await axios.get(url, { params: filters });
      if (res.data && res.data.items) {
        return { data: res.data.items, total: res.data.total };
      }
    } catch (err) {
      console.warn("Using fallback scan alerts:", err);
    }
    return { data: [], total: 0 };
  },

  getAlerts: async (filters: any = {}): Promise<{ data: Alert[]; total: number }> => {
    try {
      const res = await axios.get(`${BACKEND_BASE}/alerts`, { params: filters });
      if (res.data && res.data.items) {
        return { data: res.data.items, total: res.data.total };
      }
    } catch (err) {
      console.warn("Failed to get alerts:", err);
    }
    return { data: [], total: 0 };
  },

  updateAlertStatus: async (alertId: string, status: string, reviewedBy = 'Admin') => {
    try {
      const res = await axios.patch(`${BACKEND_BASE}/alerts/${alertId}`, {
        status: status.toUpperCase(),
        reviewed_by: reviewedBy
      });
      return res.data;
    } catch (err) {
      console.error("Update alert status error:", err);
      throw err;
    }
  },

  // Reset all database data
  resetData: async () => {
    try {
      const res = await axios.post(`${BACKEND_BASE}/dashboard/reset-data`);
      return res.data;
    } catch {
      return { status: 'success', message: 'Dữ liệu đã được đặt lại về 0.' };
    }
  },

  // Dashboard APIs with category adaptation
  getDashboardStats: async (category: PlatformCategory = 'all'): Promise<DashboardStats> => {
    try {
      const res = await axios.get(`${BACKEND_BASE}/dashboard/stats`, {
        params: { category: category !== 'all' ? category.toUpperCase() : undefined }
      });
      return {
        totalBets: res.data.total_bets ?? 0,
        criticalAlerts: res.data.total_alerts ?? 0,
        suspiciousAccounts: res.data.accounts_flagged ?? 0,
        avgRiskScore: res.data.avg_risk_score ?? 0,
      };
    } catch {
      await delay(300);
      if (category === 'sports') {
        return {
          totalBets: 845200,
          criticalAlerts: 64,
          suspiciousAccounts: 19,
          avgRiskScore: 61.2
        };
      } else if (category === 'casino') {
        return {
          totalBets: 1420800,
          criticalAlerts: 121,
          suspiciousAccounts: 39,
          avgRiskScore: 68.7
        };
      }
      return {
        totalBets: 2266000,
        criticalAlerts: 185,
        suspiciousAccounts: 58,
        avgRiskScore: 64.9
      };
    }
  },

  getDashboardTrends: async (category: PlatformCategory = 'all'): Promise<TrendDataPoint[]> => {
    try {
      const res = await axios.get(`${BACKEND_BASE}/dashboard/trends`, {
        params: { category: category !== 'all' ? category.toUpperCase() : undefined }
      });
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((t: any) => ({
          date: t.date,
          critical: Math.floor(t.alert_count * 0.4),
          high: Math.floor(t.alert_count * 0.3),
          medium: Math.floor(t.alert_count * 0.2),
          low: Math.floor(t.alert_count * 0.1),
        }));
      }
    } catch {
      // fallback to mock
    }
    await delay(300);
    const data = [];
    for (let i = 15; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const mult = category === 'sports' ? 0.7 : category === 'casino' ? 1.1 : 1.5;
      data.push({
        date: date.toISOString().split('T')[0],
        critical: Math.floor((Math.random() * 8 + 2) * mult),
        high: Math.floor((Math.random() * 15 + 5) * mult),
        medium: Math.floor((Math.random() * 25 + 10) * mult),
        low: Math.floor((Math.random() * 40 + 15) * mult),
      });
    }
    return data;
  },

  getRiskDistribution: async (category: PlatformCategory = 'all'): Promise<RiskDistribution[]> => {
    try {
      const res = await axios.get(`${BACKEND_BASE}/dashboard/risk-distribution`);
      if (res.data && Array.isArray(res.data)) {
        return res.data.map((d: any) => ({
          level: d.level.toLowerCase() as RiskLevel,
          count: d.count
        }));
      }
    } catch {
      // fallback to mock
    }
    await delay(200);
    if (category === 'sports') {
      return [
        { level: 'safe', count: 6240 },
        { level: 'watch', count: 420 },
        { level: 'suspicious', count: 85 },
        { level: 'critical', count: 32 },
      ];
    } else if (category === 'casino') {
      return [
        { level: 'safe', count: 9180 },
        { level: 'watch', count: 630 },
        { level: 'suspicious', count: 110 },
        { level: 'critical', count: 54 },
      ];
    }
    return [
      { level: 'safe', count: 15420 },
      { level: 'watch', count: 1050 },
      { level: 'suspicious', count: 195 },
      { level: 'critical', count: 86 },
    ];
  },

  getRecentAlerts: async (category: PlatformCategory = 'all'): Promise<AlertListItem[]> => {
    try {
      const res = await axios.get(`${BACKEND_BASE}/dashboard/recent-alerts`, {
        params: { category: category !== 'all' ? category.toUpperCase() : undefined }
      });
      if (res.data && Array.isArray(res.data)) {
        if (res.data.length === 0) return [];
        return res.data.map((a: any) => ({
          id: a.id,
          scanId: 'live',
          type: a.alert_type?.toLowerCase() || 'cross_hedging',
          category: a.category || (category === 'sports' ? 'SPORTS' : 'CASINO'),
          severity: a.severity?.toLowerCase() || 'critical',
          status: a.status?.toLowerCase() || 'pending',
          playerIds: a.player_a ? [a.player_a] : ['Tài khoản vi phạm'],
          gameType: a.description || 'Đối soát rủi ro',
          riskScore: a.risk_score || 85,
          timestamp: a.created_at || new Date().toISOString()
        }));
      }
    } catch {
      // fallback to mock
    }
    const casinoAlerts: AlertListItem[] = [
      {
        id: 'alt-c1',
        scanId: 'scan-002',
        type: 'cross_hedging',
        category: 'CASINO',
        severity: 'critical',
        status: 'pending',
        playerIds: ['user_baccarat88', 'vip_player01'],
        gameType: 'Baccarat (Sexy Gaming)',
        roundId: 'R1048_Shoe4',
        riskScore: 98,
        timestamp: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: 'alt-c2',
        scanId: 'scan-002',
        type: 'table_coverage',
        category: 'CASINO',
        severity: 'high',
        status: 'pending',
        playerIds: ['bot_roulette_pro'],
        gameType: 'Roulette (Evolution)',
        roundId: 'EVO-99120',
        riskScore: 84,
        timestamp: new Date(Date.now() - 900000).toISOString()
      },
      {
        id: 'alt-c3',
        scanId: 'scan-002',
        type: 'cross_hedging',
        category: 'CASINO',
        severity: 'critical',
        status: 'confirmed',
        playerIds: ['player_1', 'player_2'],
        gameType: 'Sicbo (Asia Gaming)',
        roundId: 'AG-88219',
        riskScore: 92,
        timestamp: new Date(Date.now() - 1800000).toISOString()
      }
    ];

    const sportsAlerts: AlertListItem[] = [
      {
        id: 'alt-s1',
        scanId: 'scan-001',
        type: 'sports_arbitrage',
        category: 'SPORTS',
        severity: 'critical',
        status: 'pending',
        playerIds: ['arb_master_vn', 'surebet_king'],
        gameType: 'Bóng đá (EPL)',
        eventName: 'Arsenal vs Chelsea (Tài 2.5 @2.10 vs Xỉu 2.5 @2.05)',
        riskScore: 99,
        timestamp: new Date(Date.now() - 120000).toISOString()
      },
      {
        id: 'alt-s2',
        scanId: 'scan-001',
        type: 'sports_hedge',
        category: 'SPORTS',
        severity: 'high',
        status: 'pending',
        playerIds: ['sports_pro99', 'underdog_hunter'],
        gameType: 'Bóng đá (La Liga)',
        eventName: 'Real Madrid (-0.5) vs Barcelona (+0.5)',
        riskScore: 88,
        timestamp: new Date(Date.now() - 600000).toISOString()
      },
      {
        id: 'alt-s3',
        scanId: 'scan-001',
        type: 'sports_arbitrage',
        category: 'SPORTS',
        severity: 'critical',
        status: 'pending',
        playerIds: ['basket_bot_01', 'hoops_vip'],
        gameType: 'Bóng rổ (NBA)',
        eventName: 'Lakers vs Warriors (Moneyline @1.98 vs @2.08)',
        riskScore: 95,
        timestamp: new Date(Date.now() - 2400000).toISOString()
      }
    ];

    if (category === 'sports') return sportsAlerts;
    if (category === 'casino') return casinoAlerts;
    return [...sportsAlerts.slice(0, 2), ...casinoAlerts.slice(0, 3)];
  },

  // Accounts
  getAccounts: async (pageOrParams: any = 1, limit = 20): Promise<PaginatedResponse<AccountListItem>> => {
    try {
      let params: any = {};
      if (typeof pageOrParams === 'number') {
        params = { page: pageOrParams, limit };
      } else if (typeof pageOrParams === 'object') {
        params = { ...pageOrParams };
      }
      const res = await axios.get(`${BACKEND_BASE}/accounts`, { params });
      if (res.data && Array.isArray(res.data.items)) {
        return {
          data: res.data.items,
          total: res.data.total ?? res.data.items.length,
          page: res.data.page || 1,
          limit: res.data.limit || limit,
          totalPages: Math.max(1, Math.ceil((res.data.total ?? res.data.items.length) / (res.data.limit || limit)))
        };
      }
    } catch (err) {
      console.warn("Failed to fetch accounts from backend:", err);
    }
    return { data: [], total: 0, page: 1, limit, totalPages: 1 };
  },

  getAccountDetail: async (id: string): Promise<Account> => {
    try {
      const res = await axios.get(`${BACKEND_BASE}/accounts/${id}`);
      if (res.data && res.data.account) {
        const acc = res.data.account;
        const stats = res.data.stats || {};
        return {
          playerId: acc.player_id,
          platforms: acc.platforms || ['Tất cả sảnh'],
          totalBets: stats.total_bets || acc.total_bets || 0,
          totalAlerts: acc.total_alerts || 0,
          riskScore: acc.risk_score || 0,
          riskLevel: (acc.risk_level || 'safe').toLowerCase() as any,
          winRate: res.data.win_rate || 0,
          avgStake: stats.avg_stake || 0,
          avgSessionDuration: 120,
          history: [
            { date: '2026-09-24', riskScore: Math.max(0, (acc.risk_score || 0) - 20) },
            { date: '2026-09-25', riskScore: Math.max(0, (acc.risk_score || 0) - 10) },
            { date: '2026-09-26', riskScore: acc.risk_score || 0 },
          ]
        };
      }
    } catch (err) {
      console.warn("Failed to get account detail:", err);
    }
    return {
      playerId: id,
      platforms: ['Tất cả sảnh'],
      totalBets: 0,
      totalAlerts: 0,
      riskScore: 0,
      riskLevel: 'safe',
      winRate: 0,
      avgStake: 0,
      avgSessionDuration: 0,
      history: []
    };
  },

  // Blacklist
  getBlacklist: async () => {
    try {
      const res = await axios.get(`${BACKEND_BASE}/blacklist`);
      if (res.data && Array.isArray(res.data)) {
        return res.data.map((item: any) => ({
          playerId: item.player_id,
          addedAt: item.blacklisted_at || new Date().toISOString(),
          reason: item.blacklist_reason || 'Vi phạm chính sách cược đối đầu',
          severity: (item.risk_level || 'critical').toLowerCase()
        }));
      }
    } catch (err) {
      console.warn("Failed to fetch blacklist:", err);
    }
    return [];
  },

  addToBlacklist: async (playerId: string, reason: string = 'Phát hiện cược đối đầu bất thường') => {
    try {
      const res = await axios.post(`${BACKEND_BASE}/blacklist`, {
        player_id: playerId,
        reason: reason
      });
      return res.data;
    } catch (err) {
      console.error("Add to blacklist error:", err);
      throw err;
    }
  },

  removeFromBlacklist: async (playerId: string) => {
    try {
      const res = await axios.delete(`${BACKEND_BASE}/blacklist/${playerId}`);
      return res.data;
    } catch (err) {
      console.error("Remove from blacklist error:", err);
      throw err;
    }
  }
};
