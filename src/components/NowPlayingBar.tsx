import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Pressable } from 'react-native';
import { List, Avatar, useTheme } from 'react-native-paper';

import { useMultiQueue } from '../context/MultiQueueContext';
import { usePerQueuePlayer } from '../context/PerQueuePlayerContext';

interface NowPlayingBarProps {
  onPress?: () => void;
}

const NowPlayingBar: React.FC<NowPlayingBarProps> = ({ onPress }) => {
  const { selectedQueue } = useMultiQueue();
  const { players, play, pause } = usePerQueuePlayer();
  const playerState = players[selectedQueue];
  const { currentTrack, isPlaying, position, duration } = playerState;
  const theme = useTheme();
  // Real-time progress bar update (poll context every 250ms)
  const [progress, setProgress] = useState(() => duration ? Math.min(1, position / duration) : 0);
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(() => {
      if (!mounted) return;
      const p = players[selectedQueue]?.position ?? 0;
      const d = players[selectedQueue]?.duration ?? 0;
      setProgress(d ? Math.max(0, Math.min(1, p / d)) : 0);
    }, 250);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [players, selectedQueue]);
  if (!currentTrack) return null;
  const navigation = require('@react-navigation/native').useNavigation();
  return (
    <TouchableOpacity style={[styles.bar, { backgroundColor: theme.colors.primary }]} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.row}>
        {currentTrack.picture ? (
          <Avatar.Image size={40} source={{ uri: currentTrack.picture && currentTrack.picture.startsWith('/') ? 'file://' + currentTrack.picture : currentTrack.picture }} />
        ) : (
          <List.Icon icon="music" color={theme.colors.onPrimary} />
        )}
        <View style={styles.infoContainer}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.colors.onPrimary }]}>{currentTrack.title ?? 'Unknown'}</Text>
          <Text numberOfLines={1} style={[styles.artist, { color: theme.colors.onPrimary }]}>{currentTrack.artist ?? 'Unknown artist'}</Text>
          {/* mini progress bar with larger touch area */}
          <View style={[styles.progressBarBg, { backgroundColor: theme.colors.onBackground + '33' }]}>
            <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: theme.colors.onPrimary }]} />
            <Pressable style={StyleSheet.absoluteFill} hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }} />
          </View>
        </View>
        {/* Queue button on the right */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Queue' as never)}
          style={styles.queueButton}
          accessibilityLabel="View Queue"
        >
          <List.Icon icon="playlist-music" color={theme.colors.onPrimary} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => (isPlaying ? pause(selectedQueue) : play(selectedQueue))} style={styles.playPauseBtn}>
        <List.Icon icon={isPlaying ? 'pause' : 'play'} color={theme.colors.onPrimary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  queueButton: {
    marginLeft: 12,
    padding: 8,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoContainer: {
    marginLeft: 8,
    flex: 1,
  },
  title: {
    fontWeight: '600',
  },
  artist: {
    color: '#666',
  },
  progressBarBg: {
    marginTop: 4,
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#6200ee',
    borderRadius: 3,
  },
  playPauseBtn: {
    padding: 8,
  },
});

export default NowPlayingBar;
