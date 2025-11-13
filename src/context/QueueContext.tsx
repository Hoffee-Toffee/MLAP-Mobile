import React, { createContext, useContext, useState, useCallback } from 'react';
import { ScannedTrack } from '../utils/musicScanner';

export type QueueId = 'queue1' | 'queue2' | 'queue3';

interface PlayerState {
  queue: ScannedTrack[];
  currentTrack: ScannedTrack | null;
  isPlaying: boolean;
  position: number;
  duration: number;
}

interface QueueContextProps {
  players: Record<QueueId, PlayerState>;
  setQueue: (queueId: QueueId, tracks: ScannedTrack[]) => void;
  playTrack: (queueId: QueueId, track: ScannedTrack) => void;
  setIsPlaying: (queueId: QueueId, playing: boolean) => void;
  setPosition: (queueId: QueueId, pos: number) => void;
  setDuration: (queueId: QueueId, dur: number) => void;
}

const defaultPlayerState: PlayerState = {
  queue: [],
  currentTrack: null,
  isPlaying: false,
  position: 0,
  duration: 0,
};

const QueueContext = createContext<QueueContextProps | undefined>(undefined);

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [players, setPlayers] = useState<Record<QueueId, PlayerState>>({
    queue1: { ...defaultPlayerState },
    queue2: { ...defaultPlayerState },
    queue3: { ...defaultPlayerState },
  });

  const setQueue = useCallback((queueId: QueueId, tracks: ScannedTrack[]) => {
    setPlayers(prev => ({
      ...prev,
      [queueId]: { ...prev[queueId], queue: tracks },
    }));
  }, []);

  const playTrack = useCallback((queueId: QueueId, track: ScannedTrack) => {
    setPlayers(prev => ({
      ...prev,
      [queueId]: { ...prev[queueId], currentTrack: track, isPlaying: true },
    }));
  }, []);

  const setIsPlaying = useCallback((queueId: QueueId, playing: boolean) => {
    setPlayers(prev => ({
      ...prev,
      [queueId]: { ...prev[queueId], isPlaying: playing },
    }));
  }, []);

  const setPosition = useCallback((queueId: QueueId, pos: number) => {
    setPlayers(prev => ({
      ...prev,
      [queueId]: { ...prev[queueId], position: pos },
    }));
  }, []);

  const setDuration = useCallback((queueId: QueueId, dur: number) => {
    setPlayers(prev => ({
      ...prev,
      [queueId]: { ...prev[queueId], duration: dur },
    }));
  }, []);

  return (
    <QueueContext.Provider value={{ players, setQueue, playTrack, setIsPlaying, setPosition, setDuration }}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueue must be used within QueueProvider');
  return ctx;
};
