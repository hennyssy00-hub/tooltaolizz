'use client';

import { ShieldBan, Search, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/common/Badge';

// Mock data
const mockBlacklist = [
  { id: 'USER-001', platforms: ['EVO', 'Saba'], score: 98, date: '2023-10-25', reason: 'Cược chéo tần suất cao với USER-002' },
  { id: 'USER-002', platforms: ['EVO', 'Saba'], score: 95, date: '2023-10-25', reason: 'Cược chéo tần suất cao với USER-001' },
  { id: 'USER-045', platforms: ['PP'], score: 92, date: '2023-10-24', reason: 'Sử dụng tool cược tự động (bất thường thời gian)' },
  { id: 'USER-112', platforms: ['WM', 'AG'], score: 89, date: '2023-10-20', reason: 'Tài khoản thuộc nhóm đánh vây mã G-12' },
];

export default function BlacklistPage() {
  return (
    <div className="space-y-6">
      <div className="card flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 border-none p-0 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <ShieldBan className="w-6 h-6 text-critical" /> Danh sách đen
          </h2>
          <p className="text-sm text-slate-400 mt-1">Quản lý các tài khoản bị cấm do vi phạm nghiêm trọng</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Tìm Player ID..." className="input-field pl-9 w-64 bg-slate-800" />
          </div>
          <button className="btn-primary flex items-center gap-2 bg-critical hover:bg-critical/90">
            <Plus className="w-4 h-4" /> Thêm tài khoản
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Tài khoản</th>
              <th className="px-6 py-4">Nền tảng</th>
              <th className="px-6 py-4 text-center">Risk Score</th>
              <th className="px-6 py-4">Ngày khóa</th>
              <th className="px-6 py-4">Lý do</th>
              <th className="px-6 py-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {mockBlacklist.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-mono font-medium text-critical">{item.id}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {item.platforms.map(p => <Badge key={p}>{p}</Badge>)}
                  </div>
                </td>
                <td className="px-6 py-4 text-center font-bold text-critical">{item.score}</td>
                <td className="px-6 py-4 text-slate-400">{item.date}</td>
                <td className="px-6 py-4 text-slate-300 max-w-xs truncate" title={item.reason}>{item.reason}</td>
                <td className="px-6 py-4 text-center">
                  <button className="p-1.5 text-slate-400 hover:text-critical hover:bg-slate-700 rounded transition-colors" title="Gỡ khỏi danh sách đen">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
