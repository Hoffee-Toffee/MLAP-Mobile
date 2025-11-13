
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import TrackPlayer, { Capability, AppKilledPlaybackBehavior } from 'react-native-track-player';
import type { ScannedTrack } from '../utils/musicScanner';

interface PlayerContextProps {
  currentTrack: ScannedTrack | null;
  queue: ScannedTrack[];
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  setVolume: (v: number) => void;
  play: () => void;
  pause: () => void;
  seekTo: (ms: number) => void;
  setQueue: (tracks: ScannedTrack[]) => void;
  playTrack: (track: ScannedTrack) => void;
  playNext: () => void;
  playPrevious: () => void;
}

const PlayerContext = createContext<PlayerContextProps | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<ScannedTrack | null>(null);
  const [queue, setQueue] = useState<ScannedTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const lastTrackIdRef = useRef<string | null>(null);

  // Setup TrackPlayer
  useEffect(() => {
    (async () => {
      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        },
        capabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious, Capability.SeekTo],
      });
      await TrackPlayer.setVolume(volume);
    })();
  }, []);

  // Poll position/duration and handle auto-next
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (isPlaying) {
        const progress = await TrackPlayer.getProgress();
        setPosition(Math.round(progress.position * 1000));
        setDuration(Math.round(progress.duration * 1000));
        // If track finished, go to next
        if (
          currentTrack &&
          progress.duration > 0 &&
          progress.position >= progress.duration - 0.5 &&
          lastTrackIdRef.current !== currentTrack.id
        ) {
          lastTrackIdRef.current = currentTrack.id;
          playNext();
        }
      }
      timer = setTimeout(poll, 1000);
    };
    poll();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentTrack, queue]);

  const setVolume = useCallback(async (v: number) => {
    setVolumeState(v);
    await TrackPlayer.setVolume(v);
  }, []);

  const play = useCallback(() => { setIsPlaying(true); TrackPlayer.play(); }, []);
  const pause = useCallback(() => { setIsPlaying(false); TrackPlayer.pause(); }, []);
  const seekTo = useCallback((ms: number) => { TrackPlayer.seekTo(ms / 1000); setPosition(ms); }, []);

  const playTrack = useCallback(async (track: ScannedTrack) => {
    setCurrentTrack(track);
    await TrackPlayer.reset();
    await TrackPlayer.add({
      id: String(track.id),
      url: track.path ? String(track.path) : '',
      title: track.title || 'Unknown',
      artist: track.artist || 'Unknown artist',
      artwork: track.picture || undefined,
      duration: track.duration ? track.duration / 1000 : undefined,
    });
    await TrackPlayer.play();
    setIsPlaying(true);
    lastTrackIdRef.current = null;
  }, []);

  const playNext = useCallback(async () => {
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    let nextIdx = idx >= 0 ? idx + 1 : 0;
    if (nextIdx >= queue.length) {
      // End of queue
      setIsPlaying(false);
      return;
    }
    const nextTrack = queue[nextIdx];
    if (nextTrack) {
      setCurrentTrack(nextTrack);
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: String(nextTrack.id),
        url: nextTrack.path ? String(nextTrack.path) : '',
        title: nextTrack.title || 'Unknown',
        artist: nextTrack.artist || 'Unknown artist',
        artwork: nextTrack.picture || undefined,
        duration: nextTrack.duration ? nextTrack.duration / 1000 : undefined,
      });
      await TrackPlayer.play();
      setIsPlaying(true);
      lastTrackIdRef.current = null;
    }
  }, [currentTrack, queue]);

  const playPrevious = useCallback(async () => {
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    let prevIdx = idx > 0 ? idx - 1 : 0;
    if (prevIdx < 0 || prevIdx >= queue.length) return;
    const prevTrack = queue[prevIdx];
    if (prevTrack) {
      setCurrentTrack(prevTrack);
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: String(prevTrack.id),
        url: prevTrack.path ? String(prevTrack.path) : '',
        title: prevTrack.title || 'Unknown',
        artist: prevTrack.artist || 'Unknown artist',
        artwork: prevTrack.picture || undefined,
        duration: prevTrack.duration ? prevTrack.duration / 1000 : undefined,
      });
      await TrackPlayer.play();
      setIsPlaying(true);
      lastTrackIdRef.current = null;
    }
  }, [currentTrack, queue]);

  return (
    <PlayerContext.Provider value={{ currentTrack, queue, isPlaying, position, duration, volume, setVolume, play, pause, seekTo, setQueue, playTrack, playNext, playPrevious }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};
