
export type DrumType = 'drum' | 'cymbal';

export interface DrumPad {
  id: string;
  name: string;
  defaultKey: string;
  currentKey: string;
  type: DrumType;
  color: string;
  soundUrl: string;
  volume: number; // Added volume property
  position: { top: string; left: string; width: string; height: string };
}

export interface HitRecord {
  id: string;
  drumId: string;
  drumName: string;
  timestamp: number;
  key: string;
  color: string;
}
