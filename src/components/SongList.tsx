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
  const { playTrack, setQueue } = usePerQueuePlayer();
  const { selectedQueue } = useMultiQueue();
  const theme = useTheme();
  return (
    <FlatList
      data={tracks}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <SongItem
          track={item}
          onPress={() => {
            // Set the selected queue's player queue to tapped song + next 4, and start playback for that queue
            const source = scannedTracks || tracks;
            const q = [item, ...source.slice(index + 1, index + 5)];
            setQueue(selectedQueue, q);
            playTrack(selectedQueue, item);
            if (onSongPlay) onSongPlay();
          }}
          textColor={theme.colors.onBackground}
          backgroundColor={theme.colors.background}
        />
      )}
      style={{ backgroundColor: theme.colors.background }}
    />
  );
};

export default SongList;
