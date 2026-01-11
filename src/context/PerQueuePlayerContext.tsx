
// TypeScript: declare on globalThis for type safety (top-level)
declare global {

  var pauseAllQueues: undefined | (() => void);

  var resumeAllQueues: undefined | (() => void);
}

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { savePlayerState, loadPlayerState, PersistedState } from '../utils/playerPersistence';

import Sound from 'react-native-sound';
// For debug logging
const DEBUG_PLAYBACK = true;
const debugPlaybackLog = (...args: any[]) => {
  if (DEBUG_PLAYBACK) {
    // Use warn so it shows up in both JS and native logs
    // @ts-ignore
    if (typeof global !== 'undefined' && global.console && global.console.warn) {
      global.console.warn('[MLAP-Playback]', ...args);
    } else {
      console.log('[MLAP-Playback]', ...args);
    }
  }
};
import type { ScannedTrack } from '../utils/musicScanner';

export type QueueId = 'queue1' | 'queue2' | 'queue3';

type LoopMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentTrack: ScannedTrack | null;
  queue: ScannedTrack[];
  isPlaying: boolean;
  position: number;
  duration: number;
  sound: Sound | null;
  volume: number; // 0.0 to 1.0
  shuffle: boolean;
  loopMode: LoopMode;
  shuffledQueue: ScannedTrack[] | null; // null if not shuffled
}

interface PerQueuePlayerContextProps {
  players: Record<QueueId, PlayerState>;
  setQueue: (queueId: QueueId, tracks: ScannedTrack[], options?: { clearAllState?: boolean }) => void;
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
  toggleShuffle: (queueId: QueueId) => void;
  toggleLoopMode: (queueId: QueueId) => void;
}

const defaultPlayerState: PlayerState = {
  currentTrack: null,
  queue: [],
  isPlaying: false,
  position: 0,
  duration: 0,
  sound: null,
  volume: 1.0,
  shuffle: false,
  loopMode: 'off',
  shuffledQueue: null,
};

export const PerQueuePlayerContext = createContext<PerQueuePlayerContextProps | undefined>(undefined);

export const PerQueuePlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [players, setPlayers] = useState<Record<QueueId, PlayerState>>({
    queue1: { ...defaultPlayerState },
    queue2: { ...defaultPlayerState },
    queue3: { ...defaultPlayerState },
  });

  // Show/update notification when any queue's track or playback state changes (Android only)
  React.useEffect(() => {
    const { Platform, NativeModules } = require('react-native');
    if (Platform.OS !== 'android') return;
    const { NowPlayingNotification } = NativeModules;
    if (!NowPlayingNotification) return;
    const queueToId: Record<string, number> = { queue1: 1001, queue2: 1002, queue3: 1003 };
    (Object.keys(players) as QueueId[]).forEach(queueId => {
      const player = players[queueId];
      if (!player.currentTrack) return;
      const notifTrack = {
        title: player.currentTrack.title,
        artist: player.currentTrack.artist,
        artwork: player.currentTrack.picture || null,
      };
      const notificationId = queueToId[queueId] || 1000;
      try {
        NowPlayingNotification.showNotification(notifTrack, player.isPlaying, notificationId);
      } catch { }
    });
  }, [players]);

  // Keep refs to Sound objects so they persist across renders
  const soundRefs = useRef<Record<QueueId, Sound | null>>({
    queue1: null,
    queue2: null,
    queue3: null,
  });

  type SetQueueOptions = { clearAllState?: boolean };
  const setQueue = useCallback((queueId: QueueId, tracks: ScannedTrack[], options?: SetQueueOptions) => {
    setPlayers(prev => {
      if (options?.clearAllState && tracks.length === 0) {
        // Clear all state for this queue, but keep volume, shuffle, and loopMode
        const { volume, shuffle, loopMode } = prev[queueId];
        return {
          ...prev,
          [queueId]: {
            ...prev[queueId],
            queue: [],
            currentTrack: null,
            sound: null,
            isPlaying: false,
            position: 0,
            duration: 0,
            volume,
            shuffle,
            loopMode,
          },
        };
      } else {
        return {
          ...prev,
          [queueId]: { ...prev[queueId], queue: tracks },
        };
      }
    });
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
        const shuffle = p?.shuffle ?? false;
        const loopMode = p?.loopMode ?? 'off';
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
                shuffle,
                loopMode,
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
                shuffle,
                loopMode,
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
              shuffle,
              loopMode,
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
          duration: t.duration,
          path: t.path,
          picture: t.picture,
        })),
        currentTrackId: p.currentTrack?.id || null,
        position: p.position,
        volume: p.volume,
        shuffle: p.shuffle,
        loopMode: p.loopMode,
      };
    });
    savePlayerState(state);
  }, [players]);
  // Save state every 10 seconds (queue, track, position, volume, shuffle, loopMode) for all queues, even if paused
  useEffect(() => {
    const interval = setInterval(() => {
      const state: PersistedState = {};
      (Object.keys(players) as QueueId[]).forEach(queueId => {
        const p = players[queueId];
        state[queueId] = {
          queue: p.queue.map((t: any) => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            album: t.album,
            duration: t.duration,
            path: t.path,
            picture: t.picture,
          })),
          currentTrackId: p.currentTrack?.id || null,
          position: p.position,
          volume: p.volume,
          shuffle: p.shuffle,
          loopMode: p.loopMode,
        };
      });
      savePlayerState(state);
    }, 10000); // every 10 seconds
    return () => clearInterval(interval);
  }, [players]);

  // --- End persistence ---
  // Global polling for all active players to update position in context (no auto-progression)
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers(prev => {
        (Object.keys(prev) as QueueId[]).forEach(queueId => {
          const sound = soundRefs.current[queueId];
          const player = prev[queueId];
          if (sound) {
            sound.getCurrentTime((seconds) => {
              // Only update if position actually changed
              if (Math.abs((player.position / 1000) - seconds) > 0.01) {
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
      } catch {
        // Defensive: ignore errors if sound is not ready
      }
    }
  }, [playNext]);

  // Get volume for a queue/player
  const getVolume = useCallback((queueId: QueueId) => {
    return players[queueId]?.volume ?? 1.0;
  }, [players]);



  // --- playNext must be defined before playTrack to avoid circular dependency ---
  // Use a ref to break the circular dependency between playNext and playTrack
  const playTrackRef = useRef<(queueId: QueueId, track: ScannedTrack) => void | undefined>(undefined);
  const playNext: (queueId: QueueId) => void = useCallback((queueId) => {
    setPlayers(prev => {
      const player = prev[queueId];
      const { queue, currentTrack, shuffle, loopMode, shuffledQueue } = player;
      const activeQueue = shuffle && shuffledQueue ? shuffledQueue : queue;
      if (!activeQueue.length || !currentTrack) return prev;
      const idx = activeQueue.findIndex(t => t.id === currentTrack.id);
      let nextIdx = idx + 1;
      let nextTrack: ScannedTrack | undefined;
      if (nextIdx < activeQueue.length) {
        nextTrack = activeQueue[nextIdx];
      } else if (loopMode === 'all') {
        nextTrack = activeQueue[0];
      } else {
        // Stop playback at end
        return {
          ...prev,
          [queueId]: { ...player, isPlaying: false }
        };
      }
      if (nextTrack) {
        setTimeout(() => playTrackRef.current?.(queueId, nextTrack!), 0);
      }
      return prev;
    });
  }, []);
  // Manual next: always skip/wrap
  // (see below for single correct playNext)



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
        debugPlaybackLog(`[${queueId}] Sound load error:`, error);
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
      const durationMs = sound.getDuration() * 1000;
      setPlayers(prev => {
        // Update duration in PlayerState and in the queue's track object
        const queue = prev[queueId].queue.map(t =>
          t.id === track.id ? { ...t, duration: durationMs } : t
        );
        return {
          ...prev,
          [queueId]: { ...prev[queueId], duration: durationMs, queue }
        };
      });
      debugPlaybackLog(`[${queueId}] Loaded. Duration: ${durationMs}ms`);
      sound.play((success) => {
        debugPlaybackLog(`[${queueId}] play() callback fired. Success: ${success}`);
        // Defensive: always get latest player state
        setPlayers(prev => {
          const player = prev[queueId];
          if (!player) return prev;
          if (success) {
            if (player.loopMode === 'one' && player.currentTrack) {
              debugPlaybackLog(`[${queueId}] Loop one: replaying current track (play callback).`);
              playTrackRef.current?.(queueId, player.currentTrack);
            } else if (player.loopMode === 'all') {
              const activeQueue = player.shuffle && player.shuffledQueue ? player.shuffledQueue : player.queue;
              if (activeQueue.length > 0) {
                debugPlaybackLog(`[${queueId}] Loop all: wrapping to next track (play callback).`);
                playNext(queueId);
              } else {
                debugPlaybackLog(`[${queueId}] Loop all: queue empty, cannot wrap.`);
                return {
                  ...prev,
                  [queueId]: { ...player, isPlaying: false }
                };
              }
            } else {
              debugPlaybackLog(`[${queueId}] Loop off: stopping playback (play callback).`);
              return {
                ...prev,
                [queueId]: { ...player, isPlaying: false, position: 0 }
              };
            }
          } else {
            debugPlaybackLog(`[${queueId}] play() callback fired with success=false, stopping playback.`);
            return {
              ...prev,
              [queueId]: { ...player, isPlaying: false, position: 0 }
            };
          }
          return prev;
        });
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
      const player = prev[queueId];
      const { queue, currentTrack, shuffle, shuffledQueue } = player;
      const activeQueue = shuffle && shuffledQueue ? shuffledQueue : queue;
      if (!activeQueue.length || !currentTrack) return prev;
      const idx = activeQueue.findIndex(t => t.id === currentTrack.id);
      const prevIdx = idx > 0 ? idx - 1 : 0;
      if (prevIdx < 0 || prevIdx >= activeQueue.length) return prev;
      const prevTrack = activeQueue[prevIdx];
      setTimeout(() => playTrack(queueId, prevTrack), 0);
      return prev;
    });
  }, [playTrack]);
  // Manual prev: always skip/wrap
  // (see below for single correct playPrevious)
  // Shuffle/loop logic
  function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const toggleShuffle = useCallback((queueId: QueueId) => {
    setPlayers(prev => {
      const player = prev[queueId];
      const newShuffle = !player.shuffle;
      let newShuffledQueue: ScannedTrack[] | null = null;
      if (newShuffle && player.queue.length > 1) {
        // Shuffle, but keep currentTrack at front if playing
        const rest = player.queue.filter(t => t.id !== player.currentTrack?.id);
        newShuffledQueue = player.currentTrack ? [player.currentTrack, ...shuffleArray(rest)] : shuffleArray(player.queue);
      }
      return {
        ...prev,
        [queueId]: {
          ...player,
          shuffle: newShuffle,
          shuffledQueue: newShuffle ? newShuffledQueue : null,
        }
      };
    });
  }, []);

  const toggleLoopMode = useCallback((queueId: QueueId) => {
    setPlayers(prev => {
      const player = prev[queueId];
      let newMode: LoopMode;
      if (player.loopMode === 'off') newMode = 'all';
      else if (player.loopMode === 'all') newMode = 'one';
      else newMode = 'off';
      return {
        ...prev,
        [queueId]: {
          ...player,
          loopMode: newMode,
        }
      };
    });
  }, []);

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
    setPlayers(prev => {
      const prevPlayer = prev[queueId];
      return {
        ...prev,
        [queueId]: { ...prevPlayer, position: ms }
      };
    });
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
  // Track last active queue for resume
  const lastActiveQueueRef = useRef<QueueId | null>(null);
  useEffect(() => {
    // Update lastActiveQueueRef when any queue is playing
    const playingQueue = (Object.keys(players) as QueueId[]).find(qid => players[qid].isPlaying);
    if (playingQueue) {
      lastActiveQueueRef.current = playingQueue;
    }
  }, [players]);

  if (typeof globalThis !== 'undefined') {
    // Toggle: current behavior
    (globalThis as any).mediaButtonToggleAllQueues = () => {
      const queueIds = ['queue1', 'queue2', 'queue3'] as QueueId[];
      const pausedWithTracks = queueIds.filter(qid => !players[qid].isPlaying && players[qid].queue.length > 0);
      if (pausedWithTracks.length > 0) {
        pausedWithTracks.forEach(qid => {
          const player = players[qid];
          if (player.currentTrack) {
            play(qid);
          } else if (player.queue.length > 0) {
            playTrack(qid, player.queue[0]);
          }
        });
      } else {
        queueIds.forEach(qid => {
          if (players[qid].isPlaying) pause(qid);
        });
      }
    };
    // Play all: play all queues with tracks
    (globalThis as any).mediaButtonPlayAllQueues = () => {
      const queueIds = ['queue1', 'queue2', 'queue3'] as QueueId[];
      queueIds.forEach(qid => {
        const player = players[qid];
        if (player.queue.length > 0) {
          if (player.currentTrack) {
            play(qid);
          } else {
            playTrack(qid, player.queue[0]);
          }
        }
      });
    };
    // Pause all: pause all playing queues
    (globalThis as any).mediaButtonPauseAllQueues = () => {
      const queueIds = ['queue1', 'queue2', 'queue3'] as QueueId[];
      queueIds.forEach(qid => {
        if (players[qid].isPlaying) pause(qid);
      });
    };
  }

  return (
    <PerQueuePlayerContext.Provider value={{ players, setQueue, playTrack, play, pause, seekTo, playNext, playPrevious, addToQueue, removeFromQueue, reorderQueue, setIsPlaying, setPosition, setDuration, setVolume, getVolume, toggleShuffle, toggleLoopMode }}>
      {children}
    </PerQueuePlayerContext.Provider>
  );
};


export const usePerQueuePlayer = () => {
  const ctx = useContext(PerQueuePlayerContext);
  if (!ctx) throw new Error('usePerQueuePlayer must be used within PerQueuePlayerProvider');
  return ctx;
};


