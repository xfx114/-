
import React, { useState } from 'react';
import { DrumPad } from '../types';

interface Props {
  pad: DrumPad;
  isActive: boolean;
  isEditing: boolean;
  onClick: (velocity: number) => void;
  onEdit: () => void;
  onVolumeChange: (volume: number) => void;
}

export const DrumPadComponent: React.FC<Props> = ({ pad, isActive, isEditing, onClick, onEdit, onVolumeChange }) => {
  const [ripples, setRipples] = useState<{id: number, x: number, y: number}[]>([]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isEditing) return;
    
    // 计算点击力度 (基于点击位置离圆心的距离)
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dist = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));
    const maxDist = rect.width / 2;
    // 离中心越近，力度越大 (0.5 - 1.0)
    const velocity = Math.max(0.4, 1 - (dist / maxDist) * 0.6);
    
    // 涟漪效果
    const id = Date.now();
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);

    onClick(velocity);
  };

  return (
    <div className="relative group w-full h-full flex flex-col items-center justify-center">
      <button
        onPointerDown={handlePointerDown}
        style={{ 
          borderColor: isActive ? pad.color : 'rgba(255,255,255,0.08)',
          boxShadow: isActive ? `0 0 40px ${pad.color}33, inset 0 0 20px ${pad.color}22` : 'none',
          backgroundColor: isActive ? `${pad.color}15` : 'transparent'
        }}
        className={`
          relative w-full h-full rounded-full border-[1px] transition-all duration-75
          flex items-center justify-center drum-surface overflow-hidden
          ${isActive ? 'scale-95' : 'hover:border-white/20 active:scale-90'}
        `}
      >
        {ripples.map(r => (
          <div 
            key={r.id}
            className="absolute rounded-full pointer-events-none ripple-effect"
            style={{ 
              left: r.x, top: r.y, 
              width: '20px', height: '20px', 
              backgroundColor: pad.color,
              marginLeft: '-10px', marginTop: '-10px'
            }}
          />
        ))}

        <div className="flex flex-col items-center">
          <span className={`text-[10px] font-mono tracking-tighter mb-1 transition-colors ${isActive ? 'text-white' : 'text-neutral-700'}`}>
            {pad.currentKey}
          </span>
          <span className={`text-[8px] uppercase tracking-[0.2em] font-bold transition-opacity ${isActive ? 'opacity-100' : 'opacity-20'}`}>
            {pad.name.slice(0, 3)}
          </span>
        </div>
      </button>

      {/* 极简底部悬浮控制 */}
      <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-all flex gap-3 items-center">
         <span className="text-[8px] text-neutral-600 font-mono uppercase">Vol: {Math.round(pad.volume * 100)}%</span>
         <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-[8px] bg-white/5 px-2 py-0.5 rounded border border-white/10 text-white uppercase hover:bg-white/10 transition-colors">Map</button>
      </div>
    </div>
  );
};
