import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { usePerQueuePlayer } from './PerQueuePlayerContext';

export type QueueId = 'queue1' | 'queue2' | 'queue3';

interface MultiQueueContextProps {
  selectedQueue: QueueId;
  setSelectedQueue: (id: QueueId) => void;
}

const MultiQueueContext = createContext<MultiQueueContextProps | undefined>(undefined);

export const MultiQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedQueue, setSelectedQueue] = useState<QueueId>('queue1');
  const { play, pause, playNext, playPrevious, players } = usePerQueuePlayer();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const NPNotification = NativeModules.NowPlayingNotification;
    if (!NPNotification) return;
    const emitter = new NativeEventEmitter(NPNotification);
    const queueIdForNotification: Record<number, QueueId> = { 1001: 'queue1', 1002: 'queue2', 1003: 'queue3' };
    const sub = emitter.addListener('NowPlayingNotification', (event) => {
      // Expect event to be { action: string, notificationId: number }
      let action, notificationId;
      if (typeof event === 'object' && event !== null) {
        action = event.action;
        notificationId = event.notificationId;
      } else if (typeof event === 'string') {
        // fallback: old style, ignore
        return;
      }
      const queueId = queueIdForNotification[notificationId];
      if (!queueId) return;
      if (!players[queueId]) return;
      if (action === 'playpause') {
        players[queueId].isPlaying ? pause(queueId) : play(queueId);
      } else if (action === 'next') {
        playNext(queueId);
      } else if (action === 'previous') {
        playPrevious(queueId);
      }
    });
    return () => sub.remove();
  }, [play, pause, playNext, playPrevious, players]);

  return (
    <MultiQueueContext.Provider value={{ selectedQueue, setSelectedQueue }}>
      {children}
    </MultiQueueContext.Provider>
  );
};

export const useMultiQueue = () => {
  const ctx = useContext(MultiQueueContext);
  if (!ctx) throw new Error('useMultiQueue must be used within MultiQueueProvider');
  return ctx;
};
