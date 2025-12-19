
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
  const [isLive, setIsLive] = useState(true);

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
  const timeWindow = beatMs * 24; // 24拍窗口

  const beatLines = [];
  const startVisibleTime = now - timeWindow;
  const endVisibleTime = now;
  const firstBeat = Math.ceil(startVisibleTime / beatMs) * beatMs;

  for (let t = firstBeat; t <= endVisibleTime; t += beatMs) {
    const xPos = ((endVisibleTime - t) / timeWindow) * 100;
    beatLines.push({ t, isMajor: Math.round(t / beatMs) % 4 === 0, xPos });
  }

  const handleScroll = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) > 0) {
      setIsLive(false);
      const delta = e.deltaX || e.deltaY;
      setNow(prev => prev + delta * 5);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative" onWheel={handleScroll}>
      <div className="px-10 py-4 border-b border-white/[0.03] flex justify-between items-center bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <span className="text-[9px] font-black tracking-[0.3em] text-white uppercase">Neural Sequencer</span>
          <div className="flex bg-white/5 p-0.5 rounded-sm border border-white/10">
            <button 
              onClick={() => setIsLive(true)} 
              className={`text-[8px] px-3 py-1 font-bold tracking-widest transition-all ${isLive ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
            >
              LIVE
            </button>
            <button 
              onClick={() => setIsLive(false)} 
              className={`text-[8px] px-3 py-1 font-bold tracking-widest transition-all ${!isLive ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
            >
              FREE
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-[8px] font-mono text-neutral-600">OFFSET: {Math.round(now)}ms</span>
           <button onClick={onClear} className="text-[9px] font-bold text-neutral-500 hover:text-white uppercase transition-colors tracking-widest">Reset</button>
        </div>
      </div>

      <div className="relative flex-1 w-full overflow-hidden" ref={containerRef}>
        {/* Track Lanes Labels */}
        <div className="absolute inset-y-0 left-0 w-12 border-r border-white/5 flex flex-col justify-around z-20 bg-[#050505]">
          {lanes.map((lane) => (
            <div key={lane.id} className="flex-1 border-b border-white/[0.02] flex items-center justify-center">
              <span className="text-[7px] font-black text-neutral-700">{lane.label}</span>
            </div>
          ))}
        </div>

        {/* Grid Background */}
        <div className="absolute inset-0 flex flex-col justify-around ml-12">
          {lanes.map((lane) => (
            <div key={lane.id} className="w-full h-full border-b border-white/[0.01]" />
          ))}
        </div>

        {/* Vertical Beat Lines */}
        {beatLines.map((line) => (
          <div 
            key={line.t}
            className={`absolute h-full top-0 ${line.isMajor ? 'w-[1px] bg-white/10' : 'w-[1px] bg-white/[0.03]'}`}
            style={{ right: `${line.xPos}%` }}
          />
        ))}

        {/* Hit Points */}
        <div className="absolute inset-0 pointer-events-none ml-12">
          {history.map((hit) => {
            const age = now - hit.timestamp;
            if (age > timeWindow || age < 0) return null;
            const laneIndex = lanes.findIndex(l => l.id === hit.drumId);
            const yPos = (laneIndex / lanes.length) * 100 + (100 / lanes.length / 2);
            const xPos = (age / timeWindow) * 100;
            return (
              <div key={hit.id} className="absolute w-1 h-3 -translate-y-1/2 rounded-full" style={{ 
                right: `${xPos}%`, top: `${yPos}%`, backgroundColor: hit.color,
                boxShadow: `0 0 12px ${hit.color}`
              }} />
            );
          })}
        </div>

        {isLive && (
          <div className="absolute top-0 right-0 h-full w-[2px] bg-white/40 z-10">
            <div className="absolute top-0 right-0 w-10 h-full bg-gradient-to-l from-white/5 to-transparent" />
          </div>
        )}
      </div>
      
      <div className="px-10 py-1.5 bg-black/60 text-[7px] text-neutral-700 font-mono flex gap-8 uppercase tracking-widest border-t border-white/5">
        <div className="flex items-center gap-2">
           <i className="fa-solid fa-mouse-pointer opacity-40"></i>
           <span>Scroll to seek history</span>
        </div>
        <div className="flex items-center gap-2">
           <i className="fa-solid fa-keyboard opacity-40"></i>
           <span>Real-time capture active</span>
        </div>
      </div>
    </div>
  );
};
