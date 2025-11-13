import React, { createContext, useContext, useState } from 'react';

export type QueueId = 'queue1' | 'queue2' | 'queue3';

interface MultiQueueContextProps {
  selectedQueue: QueueId;
  setSelectedQueue: (id: QueueId) => void;
}

const MultiQueueContext = createContext<MultiQueueContextProps | undefined>(undefined);

export const MultiQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedQueue, setSelectedQueue] = useState<QueueId>('queue1');
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
