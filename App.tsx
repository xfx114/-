
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_DRUM_PADS } from './constants';
import { DrumPad, HitRecord } from './types';
import { DrumPadComponent } from './components/DrumPadComponent';
import { NotationView } from './components/NotationView';

const SETTINGS_KEY = 'pro-rhythm-settings-v2';
const HISTORY_KEY = 'pro-rhythm-history-v2';

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
    try {
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [editingPadId, setEditingPadId] = useState<string | null>(null);
  const [bpm, setBpm] = useState<number>(120);
  const [latency, setLatency] = useState<number>(0);
  const [showKeys, setShowKeys] = useState(true);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("System Standby");
  const [isInitializing, setIsInitializing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  
  const audioContext = useRef<AudioContext | null>(null);
  const bufferCache = useRef<{ [key: string]: AudioBuffer }>({});

  useEffect(() => {
    // 检测是否在 Python 软件壳中运行
    if ((window as any).pywebview) {
      setIsDesktop(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 1000)));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(pads));
  }, [pads]);

  const initAudio = async () => {
    if (isInitializing) return;
    setIsInitializing(true);
    setLoadingStatus("Connecting to Neural Engine...");
    
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContext.current = ctx;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const loadPromises = pads.map(async (pad) => {
        try {
          // 增加一个防抖状态显示
          setLoadingStatus(`Loading Hardware: ${pad.name}`);
          const response = await fetch(`./${pad.soundUrl}`);
          if (!response.ok) throw new Error();
          const arrayBuffer = await response.arrayBuffer();
          bufferCache.current[pad.id] = await ctx.decodeAudioData(arrayBuffer);
        } catch (err) {
          console.warn(`Pad ${pad.name} failed to load.`);
        }
      });

      await Promise.all(loadPromises);
      setIsAudioReady(true);
      setIsInitializing(false);
    } catch (err) {
      setLoadingStatus("HARDWARE BLOCKED: Click to retry");
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
    gainNode.gain.value = pad.volume * velocity;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
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
  }, []);

  const handleNativeSave = async () => {
    if ((window as any).pywebview) {
      const res = await (window as any).pywebview.api.save_session(history);
      alert(res);
    }
  };

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
      if (pad) playSound(pad, 1.0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pads, editingPadId, playSound, isAudioReady]);

  return (
    <div className="flex h-screen bg-[#050505] text-[#888] overflow-hidden select-none">
      {!isAudioReady && (
        <div className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center p-12">
          <div className="max-w-md w-full space-y-12">
            <div className="space-y-4 text-center">
                <div className="inline-block px-3 py-1 border border-white/10 rounded-full mb-4">
                  <span className="text-[8px] text-white/40 tracking-[0.3em] uppercase font-mono">
                    {isDesktop ? 'Native Studio Edition' : 'Web Runtime v2.0'}
                  </span>
                </div>
                <h1 className="text-white text-4xl font-black tracking-tighter uppercase italic">Neon Rhythm</h1>
                <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest leading-relaxed">
                  {loadingStatus}
                </p>
            </div>
            
            <button 
              onClick={initAudio} 
              disabled={isInitializing}
              className={`w-full py-5 rounded-sm text-[11px] font-black tracking-[0.3em] transition-all uppercase 
                ${isInitializing ? 'bg-neutral-900 text-neutral-600 cursor-wait' : 'bg-white text-black hover:bg-neutral-200 active:scale-[0.98]'}`}
            >
              {isInitializing ? "Booting Engine..." : "Initialize Hardware"}
            </button>
          </div>
        </div>
      )}

      <aside className="w-72 border-r border-white/[0.04] p-10 flex flex-col gap-12 z-20 bg-[#070707]">
        <header className="space-y-1">
          <h2 className="text-[10px] font-black tracking-[0.4em] text-white uppercase italic">Studio Console</h2>
          <div className="w-8 h-[1px] bg-white/20"></div>
        </header>

        <section className="space-y-10 flex-1 overflow-y-auto no-scrollbar">
          <div className="space-y-5">
             <div className="flex justify-between items-baseline">
                <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Tempo Control</label>
                <span className="text-white font-mono text-sm">{bpm} <span className="text-[8px] opacity-30">BPM</span></span>
             </div>
             <input type="range" min="40" max="240" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value))} className="w-full" />
          </div>

          <div className="space-y-5 pt-10 border-t border-white/5">
            <button onClick={() => setShowKeys(!showKeys)} className="w-full flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
              Overlay Mapping
              <div className={`w-6 h-3 rounded-full border border-white/20 relative transition-colors ${showKeys ? 'bg-white' : 'bg-transparent'}`}>
                  <div className={`absolute top-0.5 w-1.5 h-1.5 rounded-full transition-all ${showKeys ? 'right-0.5 bg-black' : 'left-0.5 bg-white/20'}`}></div>
              </div>
            </button>
          </div>
        </section>
        
        <footer className="space-y-6">
            {isDesktop && (
              <button onClick={handleNativeSave} className="w-full py-3 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 transition-colors rounded-sm">
                Save to Desktop
              </button>
            )}
            <button onClick={() => { if(confirm('Clear session?')) setHistory([]); }} className="w-full text-[8px] font-bold text-neutral-700 hover:text-red-500 uppercase transition-colors tracking-widest">Purge Archive</button>
        </footer>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_50%_50%,_#0a0a0a_0%,_#050505_100%)]">
        <div className="flex-1 relative flex items-center justify-center p-12">
          <div className="w-full max-w-4xl aspect-[2/1] relative">
             {pads.map((pad) => (
              <div key={pad.id} style={{ position: 'absolute', top: pad.position.top, left: pad.position.left, width: pad.position.width, height: pad.position.height }}>
                <DrumPadComponent 
                  pad={pad} 
                  isActive={activeKeys.has(pad.currentKey)} 
                  isEditing={editingPadId === pad.id}
                  onClick={(v) => playSound(pad, v)} 
                  onEdit={() => setEditingPadId(pad.id)}
                  onVolumeChange={(v) => setPads(prev => prev.map(p => p.id === pad.id ? {...p, volume: v} : p))}
                />
                {showKeys && !editingPadId && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-white/10 border border-white/10 rounded flex items-center justify-center pointer-events-none">
                    <span className="text-[8px] font-mono text-white/40">{pad.currentKey}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="h-64 border-t border-white/[0.04] bg-black/60 relative">
          <NotationView history={history} onClear={() => setHistory([])} bpm={bpm} />
        </div>
      </main>
    </div>
  );
}

export default App;
