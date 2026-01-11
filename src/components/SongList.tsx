import React from 'react';
import { FlatList } from 'react-native';
import { ScannedTrack } from '../utils/musicScanner';
import SongItem from './SongItem';
import { usePerQueuePlayer } from '../context/PerQueuePlayerContext';
import { useMultiQueue } from '../context/MultiQueueContext';
import { useTheme } from 'react-native-paper';

interface SongListProps {
  tracks: ScannedTrack[];
  scannedTracks?: ScannedTrack[];
  onSongPlay?: () => void;
}

const SongList: React.FC<SongListProps> = ({ tracks, scannedTracks, onSongPlay }) => {
  const { playTrack, setQueue, players } = usePerQueuePlayer();
  const { selectedQueue } = useMultiQueue();
  const theme = useTheme();
  const currentTrackId = players[selectedQueue]?.currentTrack?.id;
  const isPlaying = players[selectedQueue]?.isPlaying;
  return (
    <FlatList
      data={tracks}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => {
        // Find index of current track in the queue
        const currentIdx = tracks.findIndex(t => t.id === currentTrackId);
        // Dim all items above the current track (50% opacity)
        const opacity = currentIdx !== -1 && index < currentIdx ? 0.5 : 1;
        return (
          <SongItem
            track={item}
            onPress={() => {
              const source = scannedTracks || tracks;
              const q = [item, ...source.slice(index + 1, index + 5)];
              setQueue(selectedQueue, q);
              playTrack(selectedQueue, item);
              if (onSongPlay) onSongPlay();
            }}
            textColor={theme.colors.onBackground}
            backgroundColor={theme.colors.background}
            isCurrent={item.id === currentTrackId}
            isPlaying={isPlaying}
            theme={theme}
            style={{ opacity }}
          />
        );
      }}
      style={{ backgroundColor: theme.colors.background }}
    />
  );
};

export default SongList;
