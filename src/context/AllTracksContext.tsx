import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { scanMusic, ScannedTrack } from '../utils/musicScanner';

interface AllTracksContextType {
  tracks: ScannedTrack[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const AllTracksContext = createContext<AllTracksContextType | undefined>(undefined);

export const AllTracksProvider = ({ children }: { children: ReactNode }) => {
  const [tracks, setTracks] = useState<ScannedTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTracks = async () => {
    setLoading(true);
    setError(null);
    try {
      const found = await scanMusic();
      setTracks(found);
    } catch (e) {
      setError('Failed to scan music');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  return (
    <AllTracksContext.Provider value={{ tracks, loading, error, refresh: fetchTracks }}>
      {children}
    </AllTracksContext.Provider>
  );
};

export const useAllTracks = () => {
  const ctx = useContext(AllTracksContext);
  if (!ctx) throw new Error('useAllTracks must be used within AllTracksProvider');
  return ctx;
};
