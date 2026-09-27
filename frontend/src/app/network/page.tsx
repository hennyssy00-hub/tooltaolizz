'use client';

import { useEffect, useRef } from 'react';
import { Network as NetworkIcon, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { Badge } from '@/components/common/Badge';

export default function NetworkPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Hardcoded simple graph
    const nodes = [
      { id: 'USER-A', x: 200, y: 200, radius: 25, color: '#ef4444', score: 98 },
      { id: 'USER-B', x: 400, y: 200, radius: 25, color: '#ef4444', score: 95 },
      { id: 'USER-C', x: 300, y: 350, radius: 15, color: '#f97316', score: 75 },
      { id: 'USER-D', x: 100, y: 300, radius: 10, color: '#eab308', score: 55 },
      { id: 'USER-E', x: 500, y: 300, radius: 10, color: '#10b981', score: 20 },
    ];

    const edges = [
      { source: 0, target: 1, weight: 5 }, // A-B strong link
      { source: 0, target: 2, weight: 2 }, // A-C medium link
      { source: 1, target: 2, weight: 2 }, // B-C medium link
      { source: 0, target: 3, weight: 1 }, // A-D weak link
      { source: 1, target: 4, weight: 1 }, // B-E weak link
    ];

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges
    edges.forEach(edge => {
      const source = nodes[edge.source];
      const target = nodes[edge.target];
      
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = `rgba(148, 163, 184, ${edge.weight * 0.15})`;
      ctx.lineWidth = edge.weight * 2;
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(node => {
      // Glow effect for high score
      if (node.score > 80) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 10, 0, 2 * Math.PI);
        ctx.fillStyle = `${node.color}33`; // 20% opacity
        ctx.fill();
      }

      // Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Text
      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.id, node.x, node.y - node.radius - 15);
    });

  }, []);

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <NetworkIcon className="w-6 h-6 text-blue-500" /> Mạng lưới liên kết
          </h2>
          <p className="text-sm text-slate-400 mt-1">Phân tích mối quan hệ cược chéo giữa các tài khoản</p>
        </div>
        
        <div className="flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button className="p-2 hover:bg-slate-700 rounded text-slate-300 transition-colors"><ZoomIn className="w-5 h-5" /></button>
          <button className="p-2 hover:bg-slate-700 rounded text-slate-300 transition-colors"><ZoomOut className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex-1 card p-0 flex relative overflow-hidden bg-slate-900 border-slate-700">
        <canvas 
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full object-contain cursor-grab"
        />

        <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur border border-slate-700 p-4 rounded-lg w-64">
          <h3 className="text-sm font-medium text-slate-200 mb-3 border-b border-slate-700 pb-2">Chú giải</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-critical"></div> Nguy hiểm ({'>'}80)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-suspicious"></div> Nghi vấn (60-80)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-watch"></div> Theo dõi (40-60)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-safe"></div> An toàn ({'<'}40)</span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-700 flex items-center gap-2 text-slate-400">
              <div className="h-1 w-6 bg-slate-600 rounded"></div>
              <span>Số lượt cược chéo liên kết</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
