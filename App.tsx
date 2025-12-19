
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_DRUM_PADS } from './constants';
import { DrumPad, HitRecord } from './types';
import { DrumPadComponent } from './components/DrumPadComponent';
import { NotationView } from './components/NotationView';

const SETTINGS_KEY = 'neon-rhythm-settings';
const HISTORY_KEY = 'neon-rhythm-history';

const App: React.FC = () => {
  const [pads, setPads] = useState<DrumPad[]>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return INITIAL_DRUM_PADS.map(initialPad => {
            const savedPad = parsed.find((p: DrumPad) => p.id === initialPad.id);
            return savedPad ? { ...initialPad, currentKey: savedPad.currentKey, volume: savedPad.volume } : initialPad;
        });
      } catch (e) { return INITIAL_DRUM_PADS; }
    }
    return INITIAL_DRUM_PADS;
  });

  const [history, setHistory] = useState<HitRecord[]>(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [editingPadId, setEditingPadId] = useState<string | null>(null);
  const [bpm, setBpm] = useState<number>(120);
  const [latency, setLatency] = useState<number>(0);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Ready to launch");
  const [isInitializing, setIsInitializing] = useState(false);

  const audioContext = useRef<AudioContext | null>(null);
  const bufferCache = useRef<{ [key: string]: AudioBuffer }>({});

  // 极简合成器：确保哪怕没有 .wav 文件也能听到声音
  const createSyntheticBuffer = (ctx: AudioContext, type: 'drum' | 'cymbal'): AudioBuffer => {
    const duration = type === 'drum' ? 0.2 : 1.0;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      if (type === 'drum') {
        // Kick/Snare 混合体
        data[i] = Math.sin(2 * Math.PI * 60 * Math.exp(-20 * t)) * Math.exp(-15 * t);
        data[i] += (Math.random() * 2 - 1) * Math.exp(-30 * t) * 0.1;
      } else {
        // Cymbal 噪声
        data[i] = (Math.random() * 2 - 1) * Math.exp(-4 * t);
      }
    }
    return buffer;
  };

  const initAudio = async () => {
    if (isInitializing) return;
    setIsInitializing(true);
    setLoadingStatus("Waking engine...");
    
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContext.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();

      // 并行处理：尝试加载文件，失败则生成合成音
      const loadPromises = pads.map(async (pad) => {
        try {
          const response = await fetch(pad.soundUrl);
          if (!response.ok) throw new Error("404");
          const arrayBuffer = await response.arrayBuffer();
          bufferCache.current[pad.id] = await ctx.decodeAudioData(arrayBuffer);
        } catch (err) {
          // 如果 404 报错，这里会接管
          bufferCache.current[pad.id] = createSyntheticBuffer(ctx, pad.type);
        }
      });

      await Promise.all(loadPromises);
      setIsAudioReady(true);
      setIsInitializing(false);
    } catch (err) {
      console.error("Audio failed", err);
      setIsInitializing(false);
    }
  };

  const playSound = useCallback((pad: DrumPad, velocity: number = 1.0) => {
    if (!audioContext.current || !bufferCache.current[pad.id]) return;
    const ctx = audioContext.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    source.buffer = bufferCache.current[pad.id];
    gainNode.gain.value = (pad.volume || 0.8) * velocity;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    source.start(0);

    // 记录历史（NotationView 依赖这个数据）
    setHistory(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      drumId: pad.id,
      drumName: pad.name,
      timestamp: Date.now(),
      key: pad.currentKey,
      color: pad.color
    }, ...prev].slice(0, 500));

    // 视觉反馈
    setActiveKeys(prev => {
      const next = new Set(prev);
      next.add(pad.currentKey);
      return next;
    });
    setTimeout(() => setActiveKeys(prev => {
      const next = new Set(prev);
      next.delete(pad.currentKey);
      return next;
    }), 100);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAudioReady) return;
      const key = e.key.toUpperCase();
      const pad = pads.find(p => p.currentKey === key);
      if (pad && !e.repeat) {
        e.preventDefault();
        playSound(pad, 1.0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pads, playSound, isAudioReady]);

  return (
    <div className="flex h-screen bg-[#050505] text-[#888] overflow-hidden select-none">
      {!isAudioReady && (
        <div className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center p-12">
          <button 
            onClick={initAudio} 
            className="w-full max-w-sm py-6 bg-white text-black font-black uppercase tracking-[0.5em] hover:bg-neutral-200 transition-all"
          >
            {isInitializing ? "Processing..." : "Initialize Engine"}
          </button>
        </div>
      )}

      <aside className="w-72 border-r border-white/[0.04] p-10 flex flex-col gap-12 bg-[#070707]">
        <h2 className="text-[10px] font-black tracking-[0.4em] text-white uppercase italic">Studio Control</h2>
        <div className="space-y-10 flex-1">
          <div className="space-y-4">
            <label className="text-[9px] uppercase tracking-widest font-bold">BPM: {bpm}</label>
            <input type="range" min="40" max="240" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value))} className="w-full" />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-[radial-gradient(circle_at_50%_50%,_#0a0a0a_0%,_#050505_100%)]">
        <div className="flex-1 relative">
           {pads.map((pad) => (
            <div key={pad.id} style={{ position: 'absolute', top: pad.position.top, left: pad.position.left, width: pad.position.width, height: pad.position.height }}>
              <DrumPadComponent 
                pad={pad} 
                isActive={activeKeys.has(pad.currentKey)} 
                isEditing={false}
                onClick={(v) => playSound(pad, v)} 
                onEdit={() => {}}
                onVolumeChange={() => {}}
              />
            </div>
          ))}
        </div>
        <div className="h-64 border-t border-white/[0.04] bg-black/60">
          <NotationView history={history} onClear={() => setHistory([])} bpm={bpm} />
        </div>
      </main>
    </div>
  );
}

export default App;
