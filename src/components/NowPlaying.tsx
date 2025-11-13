import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, FlatList } from 'react-native';
import { Avatar, List, Button, useTheme } from 'react-native-paper';
import { useQueue } from '../context/QueueContext';
import { useMultiQueue } from '../context/MultiQueueContext';
import { usePlayer } from '../context/PlayerContext';

interface NowPlayingProps {
  onClose?: () => void;
}

function formatDuration(ms?: number) {
  if (!ms && ms !== 0) return '';
  const totalSec = Math.max(0, Math.round((ms || 0) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const NowPlaying: React.FC<NowPlayingProps> = ({ onClose }) => {
  const theme = useTheme();
  const { selectedQueue } = useMultiQueue();
  const { players, setIsPlaying, setPosition, playTrack } = useQueue();
  const { currentTrack, queue, position, duration, isPlaying, play, pause, seekTo } = usePlayer();

  return (
    <View style={styles.container}>
      {/* Artwork */}
      <View style={styles.artworkContainer}>
        {/* You can add an Image here if you have artwork in your track data */}
        <Avatar.Icon size={128} icon="music" />
      </View>

      {/* Title and artist */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>{currentTrack?.title ?? 'No Track'}</Text>
        <Text style={styles.artistText}>{currentTrack?.artist ?? ''}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarTrack}>
          <View style={styles.progressBarBg} />
          <View style={[styles.progressBarFill, { width: duration ? `${Math.max(0, Math.min(1, position / duration)) * 100}%` : '0%' }]} />
        </View>
        <View style={styles.progressBarTimeRow}>
          <Text>{formatDuration(position)}</Text>
          <Text>{formatDuration(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.controlButton}>
          <Avatar.Icon size={48} icon="skip-previous" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            isPlaying ? pause() : play();
          }}
        >
          <Avatar.Icon size={64} icon={isPlaying ? 'pause-circle' : 'play-circle'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton}>
          <Avatar.Icon size={48} icon="skip-next" />
        </TouchableOpacity>
      </View>

      {/* Queue list */}
      {queue && queue.length > 0 && (
        <View style={styles.queueListContainer}>
          <Text style={[styles.queueListTitle, { color: theme.colors.onBackground }]}>Queue</Text>
          <FlatList
            data={queue}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => playTrack(selectedQueue, item)}
                style={[styles.queueListItem, {
                  backgroundColor: item.id === currentTrack?.id ? theme.colors.primary : theme.colors.background
                }]}
              >
                <Text style={{
                  color: item.id === currentTrack?.id ? theme.colors.onPrimary : theme.colors.onBackground,
                  fontWeight: item.id === currentTrack?.id ? 'bold' : 'normal'
                }}>
                  {item.title ?? 'Unknown'}
                  {item.artist ? ` — ${item.artist}` : ''}
                </Text>
              </TouchableOpacity>
            )}
            style={styles.queueList}
          />
        </View>
      )}

      <Button mode="outlined" onPress={onClose} style={styles.closeButton}>
        Back
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
  },
  artworkContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  titleContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
  },
  artistText: {
    color: '#666',
    marginTop: 4,
  },
  progressBarContainer: {
    marginTop: 24,
    paddingHorizontal: 8,
  },
  progressBarTrack: {
    height: 32,
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#6200ee',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
  },
  progressBarTouch: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -12,
    height: 32,
  },
  progressBarTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
    paddingHorizontal: 0,
  },
  controlButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  volumeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    minHeight: 64,
  },
  volumeIconPress: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  volumePercent: {
    fontSize: 12,
    marginRight: 8,
  },
  volumeSliderTrackRow: {
    width: 180,
    height: 32,
    justifyContent: 'center',
  },
  volumeSliderPopup: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  queueListContainer: {
    marginTop: 32,
    flex: 1,
  },
  queueListTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  queueList: {
    maxHeight: 200,
  },
  queueListItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  closeButton: {
    marginTop: 24,
  },
  volumeSliderOverlay: {
    flex: 1,
  },
  volumeSliderBox: {
    position: 'absolute',
    left: 48,
    bottom: 0,
    width: 260,
    height: 64,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    paddingHorizontal: 16,
  },
  volumeSliderTrack: {
    height: 12,
    width: 180,
    backgroundColor: '#eee',
    borderRadius: 6,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  volumeSliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 12,
    backgroundColor: '#6200ee',
    borderRadius: 6,
  },
  volumeSliderTouch: {
    position: 'absolute',
    left: 0,
    top: -10,
    width: 180,
    height: 52,
  },
});

export default NowPlaying;
