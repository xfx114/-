
import { DrumPad } from './types';

export const INITIAL_DRUM_PADS: DrumPad[] = [
  // 吊镲类 (蓝色)
  { id: 'crash-1', name: '吊镲 1', defaultKey: 'K', currentKey: 'K', type: 'cymbal', color: '#00ccff', soundUrl: '054_crashmute.wav', volume: 0.8, position: { top: '5%', left: '15%', width: '120px', height: '120px' } },
  { id: 'crash-2', name: '吊镲 2', defaultKey: 'L', currentKey: 'L', type: 'cymbal', color: '#0066ff', soundUrl: '049_CrashCymbal01.wav', volume: 0.8, position: { top: '5%', left: '55%', width: '120px', height: '120px' } },
  { id: 'hihat', name: '踩镲', defaultKey: 'J', currentKey: 'J', type: 'cymbal', color: '#00ffff', soundUrl: '100_Hihat_OP1.wav', volume: 0.8, position: { top: '25%', left: '5%', width: '100px', height: '100px' } },
  { id: 'ride', name: '叮叮镲', defaultKey: 'I', currentKey: 'I', type: 'cymbal', color: '#ff3333', soundUrl: '053_RideBell.wav', volume: 0.8, position: { top: '10%', left: '75%', width: '140px', height: '140px' } },
  { id: 'splash', name: '水镲', defaultKey: 'O', currentKey: 'O', type: 'cymbal', color: '#ff3333', soundUrl: '053_RideBell.wav', volume: 0.8, position: { top: '0%', left: '40%', width: '80px', height: '80px' } },
  
  // 鼓组类
  { id: 'snare', name: '军鼓', defaultKey: 'S', currentKey: 'S', type: 'drum', color: '#ffff00', soundUrl: '039_Snare.wav', volume: 0.8, position: { top: '55%', left: '20%', width: '130px', height: '130px' } },
  { id: 'kick', name: '底鼓', defaultKey: 'A', currentKey: 'A', type: 'drum', color: '#cc33ff', soundUrl: '036_Kick.wav', volume: 0.8, position: { top: '60%', left: '40%', width: '160px', height: '160px' } },
  { id: 'tom-high', name: '高音嗵鼓', defaultKey: 'F', currentKey: 'F', type: 'drum', color: '#ff0000', soundUrl: '047_HighMidTom.wav', volume: 0.8, position: { top: '35%', left: '35%', width: '110px', height: '110px' } },
  { id: 'tom-low', name: '落地嗵鼓', defaultKey: 'D', currentKey: 'D', type: 'drum', color: '#00ff00', soundUrl: '041_FloorTom.wav', volume: 0.8, position: { top: '55%', left: '70%', width: '140px', height: '140px' } },
];
