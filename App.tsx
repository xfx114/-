
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_DRUM_PADS } from './constants';
import { DrumPad, HitRecord } from './types';
import { DrumPadComponent } from './components/DrumPadComponent';
import { NotationView } from './components/NotationView';

const SETTINGS_KEY = 'pro-rhythm-settings-v1';
const HISTORY_KEY = 'pro-rhythm-history-v1';

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
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [editingPadId, setEditingPadId] = useState<string | null>(null);
  const [bpm, setBpm] = useState<number>(120);
  const [latency, setLatency] = useState<number>(0);
  const [showKeys, setShowKeys] = useState(true);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Standby");
  
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [metronomeSound, setMetronomeSound] = useState(false);
  const [metroTick, setMetroTick] = useState(false);

  const audioContext = useRef<AudioContext | null>(null);
  const bufferCache = useRef<{ [key: string]: AudioBuffer }>({});
  const metronomeInterval = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 500)));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(pads));
  }, [pads]);

  const initAudio = async () => {
    try {
      setLoadingStatus("Waking up oscillators...");
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContext.current = ctx;
      const loadPromises = pads.map(async (pad) => {
        const response = await fetch(pad.soundUrl);
        const arrayBuffer = await response.arrayBuffer();
        bufferCache.current[pad.id] = await ctx.decodeAudioData(arrayBuffer);
      });
      await Promise.all(loadPromises);
      setIsAudioReady(true);
    } catch (err) {
      setLoadingStatus("Hardware error");
    }
  };

  const playSound = useCallback((pad: DrumPad, velocity: number = 1.0) => {
    const executePlay = () => {
      if (!audioContext.current || !bufferCache.current[pad.id]) return;
      if (audioContext.current.state === 'suspended') audioContext.current.resume();
      
      const source = audioContext.current.createBufferSource();
      const gainNode = audioContext.current.createGain();
      source.buffer = bufferCache.current[pad.id];
      // 综合考虑力度与板面音量设置
      gainNode.gain.value = pad.volume * velocity;
      source.connect(gainNode);
      gainNode.connect(audioContext.current.destination);
      source.start(0);
      
      setHistory(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        drumId: pad.id,
        drumName: pad.name,
        timestamp: Date.now(),
        key: pad.currentKey,
        color: pad.color
      }, ...prev]);
      
      setActiveKeys(prev => {
        const next = new Set(prev);
        next.add(pad.currentKey);
        return next;
      });
      setTimeout(() => setActiveKeys(prev => {
        const next = new Set(prev);
        next.delete(pad.currentKey);
        return next;
      }), 80);
    };

    if (latency > 0) setTimeout(executePlay, latency);
    else executePlay();
  }, [latency]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAudioReady) return;
      const key = e.key.toUpperCase();
      if (editingPadId) {
        setPads(prev => prev.map(p => p.id === editingPadId ? { ...p, currentKey: key } : p));
        setEditingPadId(null);
        return;
      }
      if (e.repeat) return;
      const pad = pads.find(p => p.currentKey === key);
      // 键盘触发默认为最大力度 1.0
      if (pad) playSound(pad, 1.0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pads, editingPadId, playSound, isAudioReady]);

  return (
    <div className="flex h-screen bg-[#050505] text-[#888] overflow-hidden select-none">
      {!isAudioReady && (
        <div className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center">
          <div className="max-w-xs w-full text-center space-y-12 px-6">
            <div className="space-y-2">
                <h1 className="text-white text-xs font-bold tracking-[0.5em] uppercase">Neon Rhythm Pro</h1>
                <p className="text-[9px] font-mono opacity-40 uppercase tracking-widest">{loadingStatus}</p>
            </div>
            <button onClick={initAudio} className="w-full py-4 bg-white text-black text-[10px] font-black tracking-widest transition-all uppercase hover:bg-neutral-200 active:scale-95">
              Initialize System
            </button>
          </div>
        </div>
      )}

      {/* 侧边栏：更专业人性化 */}
      <aside className="w-72 border-r border-white/[0.04] p-10 flex flex-col gap-12 z-20">
        <header className="space-y-1">
          <h2 className="text-[10px] font-black tracking-[0.4em] text-white uppercase">Control Desk</h2>
          <div className="w-8 h-[1px] bg-white/20"></div>
        </header>

        <section className="space-y-10 flex-1">
          <div className="space-y-5">
             <div className="flex justify-between items-baseline">
                <label className="text-[9px] font-bold uppercase tracking-widest">Tempo</label>
                <span className="text-white font-mono text-sm">{bpm}<span className="text-[10px] ml-1 opacity-30">BPM</span></span>
             </div>
             <input type="range" min="40" max="240" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value))} className="w-full" />
          </div>

          <div className="space-y-5">
             <div className="flex justify-between items-baseline">
                <label className="text-[9px] font-bold uppercase tracking-widest">Input Lag</label>
                <span className="text-white font-mono text-sm">{latency}ms</span>
             </div>
             <input type="range" min="0" max="500" step="10" value={latency} onChange={(e) => setLatency(parseInt(e.target.value))} className="w-full" />
          </div>

          <div className="space-y-5">
             <label className="text-[9px] font-bold uppercase tracking-widest">Metronome</label>
             <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMetronomeOn(!metronomeOn)} className={`py-3 text-[9px] font-bold border ${metronomeOn ? 'border-white text-white bg-white/5' : 'border-white/5 text-neutral-600'} uppercase transition-all`}>
                  Engage
                </button>
                <button onClick={() => setMetronomeSound(!metronomeSound)} className={`py-3 text-[9px] font-bold border ${metronomeSound ? 'border-white text-white bg-white/5' : 'border-white/5 text-neutral-600'} uppercase transition-all`}>
                  {metronomeSound ? 'Audio' : 'Silent'}
                </button>
             </div>
          </div>

          <div className="space-y-5 pt-10 border-t border-white/5">
            <button onClick={() => setShowKeys(!showKeys)} className="w-full flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
              Show Hotkeys
              <div className={`w-6 h-3 rounded-full border border-white/20 relative transition-colors ${showKeys ? 'bg-white' : 'bg-transparent'}`}>
                  <div className={`absolute top-0.5 w-1.5 h-1.5 rounded-full transition-all ${showKeys ? 'right-0.5 bg-black' : 'left-0.5 bg-white/20'}`}></div>
              </div>
            </button>
          </div>
        </section>
        
        <footer className="space-y-4">
            <button onClick={() => setHistory([])} className="w-full py-2 text-[8px] font-bold text-red-500/50 hover:text-red-500 uppercase transition-colors tracking-widest">Clear Records</button>
            <div className="flex items-center gap-2 opacity-20">
               <div className="w-1 h-1 rounded-full bg-green-500"></div>
               <span className="text-[8px] font-mono uppercase tracking-widest">Server Sync: Active</span>
            </div>
        </footer>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.02)_0%,_transparent_40%)]">
        <div className="flex-1 relative flex items-center justify-center p-20">
          <div className="w-full max-w-4xl aspect-[1.8/1] relative">
             {pads.map((pad) => (
              <div key={pad.id} style={{ position: 'absolute', top: pad.position.top, left: pad.position.left, width: pad.position.width, height: pad.position.height }}>
                <DrumPadComponent 
                  pad={pad} isActive={activeKeys.has(pad.currentKey)} isEditing={editingPadId === pad.id}
                  onClick={(v) => playSound(pad, v)} onEdit={() => setEditingPadId(pad.id)}
                  onVolumeChange={(v) => setPads(prev => prev.map(p => p.id === pad.id ? {...p, volume: v} : p))}
                />
              </div>
            ))}
          </div>

          {editingPadId && (
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl flex items-center justify-center z-50">
              <div className="text-center space-y-4">
                <p className="text-[9px] font-mono tracking-[0.5em] text-white uppercase animate-pulse">Assigning Key...</p>
                <p className="text-[8px] text-neutral-600 uppercase">Press any key for {pads.find(p=>p.id===editingPadId)?.name}</p>
              </div>
            </div>
          )}
        </div>

        {/* 底部序列器 */}
        <div className="h-72 border-t border-white/[0.04] bg-black/60 relative">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
          <NotationView history={history} onClear={() => setHistory([])} bpm={bpm} />
          <div className="absolute bottom-4 right-10">
              <button onClick={() => {
                const data = JSON.stringify(history, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `score_${Date.now()}.json`;
                a.click();
              }} className="px-6 py-2 bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-colors shadow-2xl">
                Download Session
              </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
