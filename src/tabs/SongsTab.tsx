import React from 'react';

import { FlatList } from 'react-native';
import { useTheme } from 'react-native-paper';
import ListItem from '../components/ListItem';
import { usePerQueuePlayer } from '../context/PerQueuePlayerContext';
import { useMultiQueue } from '../context/MultiQueueContext';
import { ScannedTrack } from '../utils/musicScanner';

type SongsTabProps = {
  tracks: ScannedTrack[];
  onSongPlay?: () => void;
};

const SongsTab: React.FC<SongsTabProps> = ({ tracks, onSongPlay }) => {
  const theme = useTheme();
  const { setQueue, playTrack } = usePerQueuePlayer();
  const { selectedQueue } = useMultiQueue();
  return (
    <FlatList
      data={tracks}
      keyExtractor={item => item.id}
      renderItem={({ item, index }) => (
        <ListItem
          item={{
            type: 'song',
            track: item,
            onPress: () => {
              // Queue all songs from the tapped one onward
              const q = tracks.slice(index).concat(tracks.slice(0, index));
              setQueue(selectedQueue, q);
              playTrack(selectedQueue, item);
              if (onSongPlay) onSongPlay();
            },
          }}
          textColor={theme.colors.onBackground}
          backgroundColor={theme.colors.background}
        />
      )}
      style={{ backgroundColor: theme.colors.background }}
    />
  );
};

export default SongsTab;
