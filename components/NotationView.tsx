
import React, { useEffect, useRef, useState } from 'react';
import { HitRecord } from '../types';

interface Props {
  history: HitRecord[];
  onClear: () => void;
  bpm: number;
}

export const NotationView: React.FC<Props> = ({ history, onClear, bpm }) => {
  const [now, setNow] = useState(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLive, setIsLive] = useState(true); // 是否跟随实时的开关

  useEffect(() => {
    let frame: number;
    const animate = () => {
      if (isLive) setNow(Date.now());
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isLive]);

  const lanes = [
    { id: 'crash-1', label: 'CR1' },
    { id: 'crash-2', label: 'CR2' },
    { id: 'ride', label: 'RD' },
    { id: 'splash', label: 'SP' },
    { id: 'hihat', label: 'HH' },
    { id: 'tom-high', label: 'T1' },
    { id: 'tom-low', label: 'T2' },
    { id: 'snare', label: 'SN' },
    { id: 'kick', label: 'KK' },
  ];

  const beatMs = (60 / bpm) * 1000;
  const timeWindow = beatMs * 32; // 显示范围扩大到 32 拍

  // 计算拍线
  const beatLines = [];
  const startVisibleTime = now - timeWindow;
  const endVisibleTime = now;
  const firstBeat = Math.floor(startVisibleTime / beatMs) * beatMs;

  for (let t = firstBeat; t <= endVisibleTime; t += beatMs) {
    const xPos = ((endVisibleTime - t) / timeWindow) * 100;
    beatLines.push({ t, isMajor: Math.round(t / beatMs) % 4 === 0, xPos });
  }

  // 简单的手动偏移逻辑 (可以通过滚轮或拖拽模拟，这里先用简单的 Live 模式切换)
  const handleScroll = (e: React.WheelEvent) => {
    if (e.deltaX !== 0) {
      setIsLive(false);
      setNow(prev => prev + e.deltaX * 10);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative" onWheel={handleScroll}>
      <div className="px-8 py-3 border-b border-white/[0.03] flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-bold tracking-[0.2em] text-neutral-600 uppercase">Sequencer</span>
          <button 
            onClick={() => setIsLive(true)} 
            className={`text-[8px] px-2 py-0.5 border rounded ${isLive ? 'border-white text-white' : 'border-white/5 text-neutral-700'}`}
          >
            {isLive ? 'LIVE' : 'FREE'}
          </button>
        </div>
        <button onClick={onClear} className="text-[9px] text-neutral-500 hover:text-white uppercase transition-colors">Reset</button>
      </div>

      <div className="relative flex-1 w-full overflow-hidden" ref={containerRef}>
        <div className="absolute inset-0 flex flex-col justify-around">
          {lanes.map((lane) => (
            <div key={lane.id} className="w-full h-full border-b border-white/[0.01] flex items-center px-4">
              <span className="text-[7px] font-mono text-neutral-800">{lane.label}</span>
            </div>
          ))}
        </div>

        {beatLines.map((line) => (
          <div 
            key={line.t}
            className={`absolute h-full top-0 ${line.isMajor ? 'w-[1px] bg-white/5' : 'w-[1px] bg-white/[0.02]'}`}
            style={{ right: `${line.xPos}%` }}
          />
        ))}

        <div className="absolute inset-0 pointer-events-none">
          {history.map((hit) => {
            const age = now - hit.timestamp;
            if (age > timeWindow || age < 0) return null;
            const laneIndex = lanes.findIndex(l => l.id === hit.drumId);
            const yPos = (laneIndex / lanes.length) * 100 + (100 / lanes.length / 2);
            const xPos = (age / timeWindow) * 100;
            return (
              <div key={hit.id} className="absolute w-1 h-4 -translate-y-1/2" style={{ 
                right: `${xPos}%`, top: `${yPos}%`, backgroundColor: hit.color,
                boxShadow: `0 0 8px ${hit.color}66`
              }} />
            );
          })}
        </div>

        {isLive && <div className="absolute top-0 right-0 h-full w-[2px] bg-white/20 z-10 blur-[1px]" />}
      </div>
      
      <div className="px-8 py-1 bg-black/40 text-[7px] text-neutral-800 font-mono flex gap-4 uppercase">
        <span>* Use mouse wheel (horizontal) to scroll back in time</span>
      </div>
    </div>
  );
};
