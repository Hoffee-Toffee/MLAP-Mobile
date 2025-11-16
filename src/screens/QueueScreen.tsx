
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useMultiQueue } from '../context/MultiQueueContext';
import { usePerQueuePlayer } from '../context/PerQueuePlayerContext';
import { useTheme } from 'react-native-paper';
import QueueHeader from '../components/QueueHeader';
import SongList from '../components/SongList';

const QueueScreen: React.FC = () => {
  const { selectedQueue } = useMultiQueue();
  const { players } = usePerQueuePlayer();
  const player = players[selectedQueue];
  const { queue } = player;
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <QueueHeader />
      <SongList tracks={queue} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 0 },
});

export default QueueScreen;
