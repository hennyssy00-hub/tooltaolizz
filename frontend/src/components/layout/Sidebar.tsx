'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Upload, History, 
  AlertTriangle, Users, ShieldBan, Network, ShieldCheck, Dices, Trophy, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/context/PlatformContext';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Tổng quan' },
  { href: '/upload', icon: Upload, label: 'Tải lên & Quét' },
  { href: '/scans', icon: History, label: 'Lịch sử quét' },
  { href: '/alerts', icon: AlertTriangle, label: 'Cảnh báo' },
  { href: '/accounts', icon: Users, label: 'Tài khoản' },
  { href: '/blacklist', icon: ShieldBan, label: 'Danh sách đen' },
  { href: '/network', icon: Network, label: 'Mạng lưới' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { category } = usePlatform();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 justify-between">
        <div className="flex items-center">
          <ShieldCheck className="w-7 h-7 text-blue-500 mr-2.5" />
          <div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
              BetGuard
            </span>
            <p className="text-[10px] text-slate-500 font-medium">Casino & Sports Shield</p>
          </div>
        </div>
      </div>

      {/* Active Category Badge */}
      <div className="px-5 pt-4 pb-1">
        <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <span className="text-slate-400 text-[11px]">Đang xem:</span>
          <span className={`font-semibold flex items-center gap-1.5 text-xs ${
            category === 'casino' ? 'text-purple-400' : category === 'sports' ? 'text-emerald-400' : 'text-blue-400'
          }`}>
            {category === 'casino' && <Dices className="w-3.5 h-3.5" />}
            {category === 'sports' && <Trophy className="w-3.5 h-3.5" />}
            {category === 'all' && <Globe className="w-3.5 h-3.5" />}
            {category === 'casino' ? 'Casino' : category === 'sports' ? 'Thể Thao' : 'Tất cả sảnh'}
          </span>
        </div>
      </div>
      
      <nav className="flex-1 py-4 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <item.icon className={cn("w-4 h-4 mr-3", isActive ? "text-blue-400" : "text-slate-500")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between px-2 text-xs text-slate-500">
          <span>Phiên bản v1.2</span>
          <span className="w-2 h-2 rounded-full bg-safe animate-pulse" title="System Online"></span>
        </div>
      </div>
    </aside>
  );
}
