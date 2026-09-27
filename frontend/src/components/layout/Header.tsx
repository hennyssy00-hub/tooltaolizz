'use client';

import { Bell, Search, Dices, Trophy, Globe } from 'lucide-react';
import { usePlatform } from '@/context/PlatformContext';
import { PlatformCategory } from '@/types';

export function Header({ title }: { title: string }) {
  const { category, setCategory } = usePlatform();

  const categories: { id: PlatformCategory; label: string; icon: any; activeClass: string }[] = [
    {
      id: 'all',
      label: 'Tất cả',
      icon: Globe,
      activeClass: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border-blue-500',
    },
    {
      id: 'casino',
      label: 'Sảnh Casino',
      icon: Dices,
      activeClass: 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border-purple-500',
    },
    {
      id: 'sports',
      label: 'Thể Thao',
      icon: Trophy,
      activeClass: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border-emerald-500',
    },
  ];

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-20">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-semibold text-slate-100">{title}</h1>

        {/* Platform Domain Selector */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
          {categories.map((c) => {
            const Icon = c.icon;
            const isActive = category === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                  isActive
                    ? `${c.activeClass} font-semibold scale-102`
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center space-x-5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm ván, tài khoản..."
            className="bg-slate-800 border border-slate-700 rounded-full pl-10 pr-4 py-1.5 text-xs focus:outline-none focus:border-blue-500 w-56 text-slate-200"
          />
        </div>

        <button className="relative p-2 text-slate-400 hover:text-slate-200 transition-colors rounded-full hover:bg-slate-800">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-critical rounded-full"></span>
        </button>

        <div className="flex items-center space-x-3 border-l border-slate-700 pl-5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
            AD
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-200 leading-tight">Risk Officer</p>
            <p className="text-[10px] text-slate-400 capitalize">
              {category === 'all' ? 'Toàn bộ sảnh' : category === 'casino' ? 'Live Casino' : 'Sportsbook'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
