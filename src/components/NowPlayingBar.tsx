import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { List, Avatar } from 'react-native-paper';

import { useMultiQueue } from '../context/MultiQueueContext';
import { usePlayer } from '../context/PlayerContext';

interface NowPlayingBarProps {
  onPress?: () => void;
}

const NowPlayingBar: React.FC<NowPlayingBarProps> = ({ onPress }) => {
  const { selectedQueue } = useMultiQueue();
  const { queue, currentTrack, isPlaying, position, duration, play, pause } = usePlayer();
  // Only show bar if the selected queue matches the audio engine's queue
  // (You may want to add a queueId to PlayerContext for robust matching)
  if (!currentTrack) return null;
  const progress = duration ? Math.min(1, position / duration) : 0;
  return (
    <TouchableOpacity style={styles.bar} activeOpacity={0.9} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {currentTrack.picture ? (
          <Avatar.Image size={40} source={{ uri: currentTrack.picture && currentTrack.picture.startsWith('/') ? 'file://' + currentTrack.picture : currentTrack.picture }} />
        ) : (
          <List.Icon icon="music" />
        )}
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text numberOfLines={1} style={{ fontWeight: '600' }}>{currentTrack.title ?? 'Unknown'}</Text>
          <Text numberOfLines={1} style={{ color: '#666' }}>{currentTrack.artist ?? 'Unknown artist'}</Text>
          {/* mini progress bar */}
          <View style={{ marginTop: 4, height: 6, backgroundColor: '#eee', borderRadius: 3, width: '100%', overflow: 'hidden' }}>
            <View style={{ height: 6, backgroundColor: '#6200ee', borderRadius: 3, width: `${progress * 100}%` }} />
          </View>
        </View>
      </View>
      <TouchableOpacity onPress={() => (isPlaying ? pause() : play())} style={{ padding: 8 }}>
        <List.Icon icon={isPlaying ? 'pause' : 'play'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default NowPlayingBar;
