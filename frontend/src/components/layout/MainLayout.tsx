'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { usePathname } from 'next/navigation';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const getPageTitle = () => {
    if (pathname === '/') return 'Tổng quan hệ thống';
    if (pathname.startsWith('/upload')) return 'Tải lên & Quét dữ liệu';
    if (pathname.startsWith('/scans')) return 'Lịch sử & Kết quả quét';
    if (pathname.startsWith('/alerts')) return 'Quản lý cảnh báo';
    if (pathname.startsWith('/accounts')) return 'Hồ sơ tài khoản';
    if (pathname.startsWith('/blacklist')) return 'Danh sách đen';
    if (pathname.startsWith('/network')) return 'Mạng lưới liên kết';
    return 'CasinoGuard';
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header title={getPageTitle()} />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
