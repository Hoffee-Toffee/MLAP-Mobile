// TypeScript: declare on globalThis for type safety (top-level)
declare global {

  var pauseAllQueues: undefined | (() => void);

  var resumeAllQueues: undefined | (() => void);
}

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { savePlayerState, loadPlayerState, PersistedState } from '../utils/playerPersistence';

import Sound from 'react-native-sound';
import type { ScannedTrack } from '../utils/musicScanner';

export type QueueId = 'queue1' | 'queue2' | 'queue3';

interface PlayerState {
  currentTrack: ScannedTrack | null;
  queue: ScannedTrack[];
  isPlaying: boolean;
  position: number;
  duration: number;
  sound: Sound | null;
  volume: number; // 0.0 to 1.0
}

interface PerQueuePlayerContextProps {
  players: Record<QueueId, PlayerState>;
  setQueue: (queueId: QueueId, tracks: ScannedTrack[]) => void;
  playTrack: (queueId: QueueId, track: ScannedTrack) => void;
  play: (queueId: QueueId) => void;
  pause: (queueId: QueueId) => void;
  seekTo: (queueId: QueueId, ms: number) => void;
  playNext: (queueId: QueueId) => void;
  playPrevious: (queueId: QueueId) => void;
  addToQueue: (queueId: QueueId, track: ScannedTrack) => void;
  removeFromQueue: (queueId: QueueId, trackId: string) => void;
  reorderQueue: (queueId: QueueId, from: number, to: number) => void;
  setIsPlaying: (queueId: QueueId, playing: boolean) => void;
  setPosition: (queueId: QueueId, pos: number) => void;
  setDuration: (queueId: QueueId, dur: number) => void;
  setVolume: (queueId: QueueId, volume: number) => void;
  getVolume: (queueId: QueueId) => number;
}

const defaultPlayerState: PlayerState = {
  currentTrack: null,
  queue: [],
  isPlaying: false,
  position: 0,
  duration: 0,
  sound: null,
  volume: 1.0,
};

const PerQueuePlayerContext = createContext<PerQueuePlayerContextProps | undefined>(undefined);

export const PerQueuePlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [players, setPlayers] = useState<Record<QueueId, PlayerState>>({
    queue1: { ...defaultPlayerState },
    queue2: { ...defaultPlayerState },
    queue3: { ...defaultPlayerState },
  });

  // Keep refs to Sound objects so they persist across renders
  const soundRefs = useRef<Record<QueueId, Sound | null>>({
    queue1: null,
    queue2: null,
    queue3: null,
  });

  const setQueue = useCallback((queueId: QueueId, tracks: ScannedTrack[]) => {
    setPlayers(prev => ({
      ...prev,
      [queueId]: { ...prev[queueId], queue: tracks },
    }));
  }, []);

  // --- Persistence: restore on mount, save every 15s if playing ---
  // Restore state on mount if all players are inactive
  useEffect(() => {
    let mounted = true;
    (async () => {
      const allInactive = Object.values(soundRefs.current).every(s => !s);
      if (!allInactive) return;
      const persisted = await loadPlayerState();
      if (!persisted || !mounted) return;
      (Object.keys(persisted) as QueueId[]).forEach(queueId => {
        const p = persisted[queueId];
        if (p && p.currentTrackId) {
          const track = p.queue.find(t => t.id === p.currentTrackId) || null;
          if (track) {
            // Create Sound object for the track, set position and duration
            const sound = new Sound(track.path, Sound.MAIN_BUNDLE, (error) => {
              if (!error) {
                sound.setVolume(p.volume ?? 1.0);
                sound.setCurrentTime((p.position ?? 0) / 1000);
                setPlayers(prev => ({
                  ...prev,
                  [queueId]: {
                    ...prev[queueId],
                    duration: sound.getDuration() * 1000,
                  }
                }));
              }
            });
            soundRefs.current[queueId] = sound;
            setPlayers(prev => ({
              ...prev,
              [queueId]: {
                ...prev[queueId],
                queue: p.queue,
                currentTrack: track,
                position: p.position,
                volume: p.volume,
                isPlaying: false,
                sound,
                // duration will be set in callback above
              }
            }));
          } else {
            // No valid track, just restore queue
            setPlayers(prev => ({
              ...prev,
              [queueId]: {
                ...prev[queueId],
                queue: p.queue,
                currentTrack: null,
                position: 0,
                volume: p.volume,
                isPlaying: false,
                sound: null,
                duration: 0,
              }
            }));
          }
        } else if (p) {
          // No current track, just restore queue
          setPlayers(prev => ({
            ...prev,
            [queueId]: {
              ...prev[queueId],
              queue: p.queue,
              currentTrack: null,
              position: 0,
              volume: p.volume,
              isPlaying: false,
              sound: null,
              duration: 0,
            }
          }));
        }
      });
    })();
    return () => { mounted = false; };
  }, []);

  // Save state on every change (queue, track, position, volume) for all queues, even if paused
  useEffect(() => {
    const state: PersistedState = {};
    (Object.keys(players) as QueueId[]).forEach(queueId => {
      const p = players[queueId];
      state[queueId] = {
        queue: p.queue.map((t: any) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          album: t.album,
          path: t.path,
          picture: t.picture,
        })),
        currentTrackId: p.currentTrack?.id || null,
        position: p.position,
        volume: p.volume,
      };
    });
    savePlayerState(state);
  }, [players]);

  // --- End persistence ---
  // Global polling for all active players to update position in context
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers(prev => {
        (Object.keys(prev) as QueueId[]).forEach(queueId => {
          const sound = soundRefs.current[queueId];
          if (sound && sound.isPlaying()) {
            sound.getCurrentTime((seconds) => {
              // Only update if position actually changed
              if (Math.abs((prev[queueId].position / 1000) - seconds) > 0.01) {
                setPlayers(innerPrev => ({
                  ...innerPrev,
                  [queueId]: { ...innerPrev[queueId], position: seconds * 1000 }
                }));
              }
            });
          }
        });
        return prev;
      });
    }, 250);
    return () => clearInterval(interval);
  }, []);
  // Set volume for a queue/player
  const setVolume = useCallback((queueId: QueueId, volume: number) => {
    setPlayers(prev => ({
      ...prev,
      [queueId]: { ...prev[queueId], volume }
    }));
    // Always set volume on the Sound object if it exists, even if not playing
    const sound = soundRefs.current[queueId];
    if (sound) {
      try {
        sound.setVolume(volume);
      } catch (e) {
        // Defensive: ignore errors if sound is not ready
      }
    }
  }, []);

  // Get volume for a queue/player
  const getVolume = useCallback((queueId: QueueId) => {
    return players[queueId]?.volume ?? 1.0;
  }, [players]);



  // --- playNext must be defined before playTrack to avoid circular dependency ---
  // Use a ref to break the circular dependency between playNext and playTrack
  const playTrackRef = useRef<(queueId: QueueId, track: ScannedTrack) => void | undefined>(undefined);
  const playNext: (queueId: QueueId) => void = useCallback((queueId) => {
    setPlayers(prev => {
      const { queue, currentTrack } = prev[queueId];
      if (!queue.length || !currentTrack) return prev;
      const idx = queue.findIndex(t => t.id === currentTrack.id);
      const nextIdx = idx >= 0 && idx < queue.length - 1 ? idx + 1 : 0;
      if (nextIdx < 0 || nextIdx >= queue.length) return prev;
      const nextTrack = queue[nextIdx];
      setTimeout(() => playTrackRef.current?.(queueId, nextTrack), 0);
      return prev;
    });
  }, []);

  const playTrack: (queueId: QueueId, track: ScannedTrack) => void = useCallback((queueId, track) => {
    // Stop and release previous sound if exists
    if (soundRefs.current[queueId]) {
      soundRefs.current[queueId]?.stop();
      soundRefs.current[queueId]?.release();
    }
    // Create new Sound instance
    const currentVolume = players[queueId]?.volume ?? 1.0;
    const sound = new Sound(track.path, Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        setPlayers(prev => ({
          ...prev,
          [queueId]: { ...prev[queueId], isPlaying: false, sound: null, duration: 0, position: 0 }
        }));
        return;
      }
      try {
        sound.setVolume(currentVolume);
      } catch {
        // ignore
      }
      setPlayers(prev => ({
        ...prev,
        [queueId]: { ...prev[queueId], duration: sound.getDuration() * 1000 }
      }));
      sound.play((success) => {
        if (success) {
          playNext(queueId);
        } else {
          setPlayers(prev => ({
            ...prev,
            [queueId]: { ...prev[queueId], isPlaying: false, position: 0 }
          }));
        }
      });
    });
    soundRefs.current[queueId] = sound;
    setPlayers(prev => ({
      ...prev,
      [queueId]: { ...prev[queueId], currentTrack: track, isPlaying: true, sound, position: 0 }
    }));
  }, [players, playNext]);

  // Keep playTrackRef updated
  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack]);



  const playPrevious = useCallback((queueId: QueueId) => {
    setPlayers(prev => {
      const { queue, currentTrack } = prev[queueId];
      if (!queue.length || !currentTrack) return prev;
      const idx = queue.findIndex(t => t.id === currentTrack.id);
      const prevIdx = idx > 0 ? idx - 1 : 0;
      if (prevIdx < 0 || prevIdx >= queue.length) return prev;
      const prevTrack = queue[prevIdx];
      setTimeout(() => playTrack(queueId, prevTrack), 0);
      return prev;
    });
  }, [playTrack]);

  const addToQueue = useCallback((queueId: QueueId, track: ScannedTrack) => {
    setPlayers(prev => ({
      ...prev,
      [queueId]: { ...prev[queueId], queue: [...prev[queueId].queue, track] }
    }));
  }, []);

  const removeFromQueue = useCallback((queueId: QueueId, trackId: string) => {
    setPlayers(prev => ({
      ...prev,
      [queueId]: { ...prev[queueId], queue: prev[queueId].queue.filter(t => t.id !== trackId) }
    }));
  }, []);

  const reorderQueue = useCallback((queueId: QueueId, from: number, to: number) => {
    setPlayers(prev => {
      const queue = [...prev[queueId].queue];
      const [moved] = queue.splice(from, 1);
      queue.splice(to, 0, moved);
      return {
        ...prev,
        [queueId]: { ...prev[queueId], queue }
      };
    });
  }, []);

  const play = useCallback((queueId: QueueId) => {
    const sound = soundRefs.current[queueId];
    if (sound) {
      sound.play();
      setPlayers(prev => ({
        ...prev,
        [queueId]: { ...prev[queueId], isPlaying: true }
      }));
      // Resume polling for progress
      const updateProgress = () => {
        if (soundRefs.current[queueId] === sound && sound.isPlaying()) {
          sound.getCurrentTime((seconds) => {
            setPlayers(prev => ({
              ...prev,
              [queueId]: { ...prev[queueId], position: seconds * 1000 }
            }));
          });
          setTimeout(updateProgress, 500);
        }
      };
      updateProgress();
    }
  }, []);

  const pause = useCallback((queueId: QueueId) => {
    const sound = soundRefs.current[queueId];
    if (sound) sound.pause();
    setPlayers(prev => ({
      ...prev,
      [queueId]: { ...prev[queueId], isPlaying: false }
    }));
  }, []);

  const seekTo = useCallback((queueId: QueueId, ms: number) => {
    const sound = soundRefs.current[queueId];
    if (sound) sound.setCurrentTime(ms / 1000);
    setPlayers(prev => ({
      ...prev,
      [queueId]: { ...prev[queueId], position: ms }
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

  // Clean up sounds on unmount
  useEffect(() => {
    const soundsAtUnmount = { ...soundRefs.current };
    return () => {
      Object.values(soundsAtUnmount).forEach(sound => sound?.release());
    };
  }, []);


  // Attach pauseAllQueues and resumeAllQueues to globalThis for TrackPlayer service
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).pauseAllQueues = () => {
      (['queue1', 'queue2', 'queue3'] as QueueId[]).forEach(qid => pause(qid));
    };
    (globalThis as any).resumeAllQueues = () => {
      (['queue1', 'queue2', 'queue3'] as QueueId[]).forEach(qid => play(qid));
    };
  }

  return (
    <PerQueuePlayerContext.Provider value={{ players, setQueue, playTrack, play, pause, seekTo, playNext, playPrevious, addToQueue, removeFromQueue, reorderQueue, setIsPlaying, setPosition, setDuration, setVolume, getVolume }}>
      {children}
    </PerQueuePlayerContext.Provider>
  );
};


export const usePerQueuePlayer = () => {
  const ctx = useContext(PerQueuePlayerContext);
  if (!ctx) throw new Error('usePerQueuePlayer must be used within PerQueuePlayerProvider');
  return ctx;
};


