
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PanResponder, GestureResponderEvent, PanResponderGestureState, View, Pressable } from 'react-native';
import { Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Avatar, List, Button, useTheme } from 'react-native-paper';
import { useMultiQueue } from '../context/MultiQueueContext';
import { usePerQueuePlayer } from '../context/PerQueuePlayerContext';

// --- VolumeSlider component ---
const VolumeSlider = ({ value, onChange }) => {
  const [dragging, setDragging] = useState(false);
  const [sliderValue, setSliderValue] = useState(value);
  const trackWidth = 180;
  useEffect(() => {
    if (!dragging) setSliderValue(value);
  }, [value, dragging]);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        setDragging(true);
        let x = evt.nativeEvent.locationX;
        x = Math.max(0, Math.min(trackWidth, x));
        const percent = x / trackWidth;
        setSliderValue(percent);
        onChange(percent);
      },
      onPanResponderMove: (evt, gestureState) => {
        let x = evt.nativeEvent.locationX;
        x = Math.max(0, Math.min(trackWidth, x));
        const percent = x / trackWidth;
        setSliderValue(percent);
        onChange(percent);
      },
      onPanResponderRelease: (evt, gestureState) => {
        setDragging(false);
        let x = evt.nativeEvent.locationX;
        x = Math.max(0, Math.min(trackWidth, x));
        const percent = x / trackWidth;
        setSliderValue(percent);
        onChange(percent);
      },
      onPanResponderTerminate: () => {
        setDragging(false);
      },
    })
  ).current;
  return (
    <View
      style={{ height: 32, width: 180, position: 'relative', top: 0, alignItems: 'center', justifyContent: 'center' }}
      hitSlop={{ top: 16, bottom: 16, left: 0, right: 0 }}
      {...panResponder.panHandlers}
    >
      <View style={styles.volumeSliderTrack}>
        <View style={[styles.volumeSliderFill, { width: `${(sliderValue ?? 0) * 100}%` }]} />
      </View>
    </View>
  );
};

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

const NowPlaying = ({ onClose }) => {
  const theme = useTheme();
  const { selectedQueue } = useMultiQueue();
  const { players, play, pause, seekTo, playNext, playPrevious, playTrack, setVolume, getVolume } = usePerQueuePlayer();
  const player = players[selectedQueue];
  const { currentTrack, queue, position, duration, isPlaying } = player;

  // For measuring progress bar width
  const [barWidth, setBarWidth] = useState(0);

  // Seek bar drag state
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState<number | null>(null); // ms

  // Volume state for slider UI (controlled by context)
  const [volume, setVolumeState] = useState(() => getVolume(selectedQueue));
  // Progress state for real-time updates
  const [progress, setProgress] = useState(() => {
    return duration ? Math.max(0, Math.min(1, position / duration)) : 0;
  });

  // Real-time progress bar update (poll context every 250ms)
  useEffect(() => {
    if (isSeeking) return; // Don't update while dragging
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
  }, [players, selectedQueue, isSeeking]);

  // Always sync local volume state with context value for selectedQueue
  useEffect(() => {
    setVolumeState(getVolume(selectedQueue));
  }, [selectedQueue, getVolume]);

  // When slider changes, update context and local state
  const handleVolumeChange = useCallback((v: number) => {
    setVolumeState(v);
    setVolume(selectedQueue, v);
  }, [selectedQueue, setVolume]);

  // Real-time progress bar update (animation frame) - only if not seeking
  useEffect(() => {
    if (isSeeking) return;
    let mounted = true;
    function update() {
      if (!mounted) return;
      setProgress(duration ? Math.max(0, Math.min(1, position / duration)) : 0);
      requestAnimationFrame(update);
    }
    update();
    return () => { mounted = false; };
  }, [duration, position, isSeeking]);

  // Handler for seeking (tap or drag end)
  const handleSeek = (locationX: number) => {
    if (!duration || !barWidth) return;
    const percent = Math.max(0, Math.min(1, locationX / barWidth));
    const newPos = Math.round(duration * percent);
    seekTo(selectedQueue, newPos);
    setSeekPosition(null);
    setIsSeeking(false);
  };

  // PanResponder for seek bar
  const seekBarPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt, gestureState) => {
      setIsSeeking(true);
      if (!duration || !barWidth) return;
      const percent = Math.max(0, Math.min(1, evt.nativeEvent.locationX / barWidth));
      setSeekPosition(Math.round(duration * percent));
    },
    onPanResponderMove: (evt, gestureState) => {
      if (!duration || !barWidth) return;
      let x = evt.nativeEvent.locationX;
      x = Math.max(0, Math.min(barWidth, x));
      const percent = x / barWidth;
      setSeekPosition(Math.round(duration * percent));
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (!duration || !barWidth) {
        setIsSeeking(false);
        setSeekPosition(null);
        return;
      }
      let x = evt.nativeEvent.locationX;
      x = Math.max(0, Math.min(barWidth, x));
      const percent = x / barWidth;
      const newPos = Math.round(duration * percent);
      seekTo(selectedQueue, newPos);
      setSeekPosition(null);
      setIsSeeking(false);
    },
    onPanResponderTerminate: () => {
      setIsSeeking(false);
      setSeekPosition(null);
    },
  });

  // Use real-time progress state, or show seekPosition if dragging
  const progressPercent = isSeeking && seekPosition !== null && duration ? Math.max(0, Math.min(1, seekPosition / duration)) : progress;

  return (
    <View style={styles.container}>
      {/* Artwork */}
      <View style={styles.artworkContainer}>
        <Avatar.Icon size={128} icon="music" />
      </View>

      {/* Title and artist */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>{currentTrack?.title ?? 'No Track'}</Text>
        <Text style={styles.artistText}>{currentTrack?.artist ?? ''}</Text>
      </View>

      {/* Progress bar with drag-to-seek and tap-to-seek (larger touch area) */}
      <View style={styles.progressBarContainer}>
        <View
          style={styles.progressBarTrack}
          onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
          {...seekBarPanResponder.panHandlers}
        >
          <View style={styles.progressBarBg} />
          <View style={[styles.progressBarFill, { width: `${progressPercent * 100}%` }]} />
          <Pressable
            style={styles.progressBarTouch}
            hitSlop={{ top: 16, bottom: 16, left: 0, right: 0 }}
            onPress={e => handleSeek(e.nativeEvent.locationX)}
          />
        </View>
        <View style={styles.progressBarTimeRow}>
          <Text>{formatDuration(isSeeking && seekPosition !== null ? seekPosition : position)}</Text>
          <Text>{formatDuration(duration)}</Text>
        </View>
      </View>

      {/* Volume slider with drag-to-set and expanded interaction area */}
      <View style={styles.volumeRow}>
        <Text style={styles.volumePercent}>{Math.round(volume * 100)}%</Text>
        <View style={styles.volumeSliderTrackRow}>
          <VolumeSlider
            value={volume}
            onChange={handleVolumeChange}
          />
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.controlButton} onPress={() => playPrevious(selectedQueue)}>
          <Avatar.Icon size={48} icon="skip-previous" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            isPlaying ? pause(selectedQueue) : play(selectedQueue);
          }}
        >
          <Avatar.Icon size={64} icon={isPlaying ? 'pause-circle' : 'play-circle'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={() => playNext(selectedQueue)}>
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
                <Text
                  style={[
                    {
                      color: item.id === currentTrack?.id ? theme.colors.onPrimary : theme.colors.onBackground,
                    },
                    item.id === currentTrack?.id ? styles.queueListItemBold : null,
                  ]}
                >
                  {item.title ?? 'Unknown'}
                  {item.artist ? ` \u2014 ${item.artist}` : ''}
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
}

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
  queueListItemBold: {
    fontWeight: 'bold',
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
