import { StatsCards } from '@/components/dashboard/StatsCards';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { RiskDistribution } from '@/components/dashboard/RiskDistribution';
import { RecentAlerts } from '@/components/dashboard/RecentAlerts';
import { DemoDataBanner } from '@/components/dashboard/DemoDataBanner';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DemoDataBanner />
      <StatsCards />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrendChart />
        </div>
        <div className="lg:col-span-1">
          <RiskDistribution />
        </div>
      </div>
      
      <RecentAlerts />
    </div>
  );
}
