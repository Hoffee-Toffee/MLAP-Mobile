
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Avatar } from 'react-native-paper';
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
      {queue.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Avatar.Icon size={120} icon="playlist-remove" style={{ marginBottom: 24 }} />
          <Text style={{ fontSize: 20, color: theme.colors.onBackground, marginBottom: 8 }}>Queue is empty</Text>
          <Text style={{ color: theme.colors.onBackground + '99' }}>Add songs to this queue to get started.</Text>
        </View>
      ) : (
        <SongList tracks={queue} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 0 },
});

export default QueueScreen;
