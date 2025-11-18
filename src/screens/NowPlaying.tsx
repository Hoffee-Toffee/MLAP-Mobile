
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PanResponder, View, Pressable } from 'react-native';
import { Text, StyleSheet, TouchableOpacity, View as RNView } from 'react-native';
import { Avatar, useTheme } from 'react-native-paper';
import { useMultiQueue } from '../context/MultiQueueContext';
import { usePerQueuePlayer } from '../context/PerQueuePlayerContext';

// --- VolumeSlider component ---
interface VolumeSliderProps {
  value: number;
  onChange: (v: number) => void;
}
const VolumeSlider: React.FC<VolumeSliderProps> = ({ value, onChange }) => {
  const [dragging, setDragging] = useState(false);
  const [sliderValue, setSliderValue] = useState(value);
  const trackWidth = 180;
  const theme = useTheme();
  // Always use the latest onChange (which closes over the latest selectedQueue)
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    if (!dragging) setSliderValue(value);
  }, [value, dragging]);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setDragging(true);
        let x = evt.nativeEvent.locationX;
        x = Math.max(0, Math.min(trackWidth, x));
        const percent = x / trackWidth;
        setSliderValue(percent);
        onChangeRef.current(percent);
      },
      onPanResponderMove: (evt) => {
        let x = evt.nativeEvent.locationX;
        x = Math.max(0, Math.min(trackWidth, x));
        const percent = x / trackWidth;
        setSliderValue(percent);
        onChangeRef.current(percent);
      },
      onPanResponderRelease: (evt) => {
        setDragging(false);
        let x = evt.nativeEvent.locationX;
        x = Math.max(0, Math.min(trackWidth, x));
        const percent = x / trackWidth;
        setSliderValue(percent);
        onChangeRef.current(percent);
      },
      onPanResponderTerminate: () => {
        setDragging(false);
      },
    })
  ).current;
  return (
    <View
      style={styles.volumeSliderOuter}
      hitSlop={{ top: 16, bottom: 16, left: 0, right: 0 }}
      {...panResponder.panHandlers}
    >
      <View style={[styles.volumeSliderTrack, { backgroundColor: theme.colors.onBackground + '33' }]}>
        <View style={[styles.volumeSliderFill, { width: `${(sliderValue ?? 0) * 100}%`, backgroundColor: theme.colors.onPrimary }]} />
      </View>
    </View>
  );
};



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

import { Appbar, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import TopBar from '../components/TopBar';

const NowPlaying: React.FC = () => {
  const navigation = useNavigation();
  const { selectedQueue } = useMultiQueue();
  const { players, play, pause, seekTo, playNext, playPrevious, setVolume, getVolume, toggleShuffle, toggleLoopMode } = usePerQueuePlayer();
  const player = players[selectedQueue];
  const { currentTrack, position, duration, isPlaying, shuffle, loopMode } = player;

  // For measuring progress bar width
  const [barWidth, setBarWidth] = useState(0);

  // Seek bar drag state
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState<number | null>(null); // ms

  // Always derive volume from context for the selected queue
  const volume = getVolume(selectedQueue);
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


  // When slider changes, always update the current selectedQueue's volume
  const handleVolumeChange = useCallback((v: number) => {
    setVolume(selectedQueue, v);
  }, [setVolume, selectedQueue]);

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
    onPanResponderGrant: (evt) => {
      setIsSeeking(true);
      if (!duration || !barWidth) return;
      const percent = Math.max(0, Math.min(1, evt.nativeEvent.locationX / barWidth));
      setSeekPosition(Math.round(duration * percent));
    },
    onPanResponderMove: (evt) => {
      if (!duration || !barWidth) return;
      let x = evt.nativeEvent.locationX;
      x = Math.max(0, Math.min(barWidth, x));
      const percent = x / barWidth;
      setSeekPosition(Math.round(duration * percent));
    },
    onPanResponderRelease: (evt) => {
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

  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top bar with back and queue switcher, no menu, playlist-music icon for queue */}
      <Appbar.Header style={[styles.appbarHeader, { backgroundColor: theme.colors.primary }]}>
        <Appbar.BackAction color={theme.colors.onPrimary} onPress={() => navigation.goBack()} />
        <RNView style={styles.queueSwitcherWrap}>
          <TopBar showMenu={false} iconColor={theme.colors.onPrimary} />
        </RNView>
        <Appbar.Action icon="playlist-music" color={theme.colors.onPrimary} onPress={() => navigation.navigate('Queue')} accessibilityLabel="View Queue" />
      </Appbar.Header>

      {currentTrack ? (
        <>
          {/* Song artwork and info */}
          <View style={styles.artworkContainer}>
            {currentTrack.picture ? (
              <Avatar.Image size={180} source={{ uri: currentTrack.picture.startsWith('/') ? 'file://' + currentTrack.picture : currentTrack.picture }} />
            ) : (
              <Avatar.Icon size={180} icon="music" />
            )}
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.titleText, { color: theme.colors.onBackground }]} numberOfLines={1}>{currentTrack.title ?? 'Unknown'}</Text>
            <Text style={[styles.artistText, { color: theme.colors.onBackground }]} numberOfLines={1}>{currentTrack.artist ?? 'Unknown artist'}</Text>
          </View>

          {/* Progress bar with drag-to-seek and tap-to-seek (larger touch area) */}
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBarTrack, { backgroundColor: 'transparent', height: 32, paddingHorizontal: 0, marginHorizontal: 0 }]}
              onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
              {...seekBarPanResponder.panHandlers}
            >
              {/* Unfilled track */}
              <View style={[styles.progressBarBg, { backgroundColor: theme.colors.onBackground + '33' }]} />
              {/* Filled portion */}
              <View style={[styles.progressBarFill, { width: `${progressPercent * 100}%`, backgroundColor: theme.colors.onPrimary }]} />
              <Pressable
                style={styles.progressBarTouch}
                hitSlop={{ top: 16, bottom: 16, left: 0, right: 0 }}
                onPress={e => handleSeek(e.nativeEvent.locationX)}
              />
            </View>
            <View style={styles.progressBarTimeRow}>
              <Text style={{ color: theme.colors.onBackground }}>{formatDuration(isSeeking && seekPosition !== null ? seekPosition : position)}</Text>
              <Text style={{ color: theme.colors.onBackground }}>{formatDuration(duration)}</Text>
            </View>
          </View>

          {/* Volume slider with drag-to-set and expanded interaction area */}
          <View style={styles.volumeRow}>
            <Text style={[styles.volumePercent, { color: theme.colors.onBackground }]}>{Math.round(volume * 100)}%</Text>
            <View style={styles.volumeSliderTrackRow}>
              <VolumeSlider
                value={volume}
                onChange={handleVolumeChange}
              />
            </View>
          </View>

          {/* Controls with shuffle/loop */}
          <View style={styles.controlsRow}>
            <IconButton
              icon={shuffle ? 'shuffle-variant' : 'shuffle-disabled'}
              size={32}
              onPress={() => toggleShuffle(selectedQueue)}
              style={styles.controlButton}
              accessibilityLabel="Toggle Shuffle"
              iconColor={shuffle ? theme.colors.primary : theme.colors.onBackground}
            />
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
            <IconButton
              icon={
                loopMode === 'off' ? 'repeat-off'
                  : loopMode === 'all' ? 'repeat'
                    : 'repeat-once'
              }
              size={32}
              onPress={() => toggleLoopMode(selectedQueue)}
              style={styles.controlButton}
              accessibilityLabel="Toggle Loop Mode"
              iconColor={loopMode === 'off' ? theme.colors.onBackground : theme.colors.primary}
            />
          </View>
        </>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Avatar.Icon size={120} icon="music-off" style={{ marginBottom: 24 }} />
          <Text style={{ fontSize: 20, color: theme.colors.onBackground, marginBottom: 8 }}>No track playing</Text>
          <Text style={{ color: theme.colors.onBackground + '99' }}>Add songs to the queue to start playback.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  volumeSliderOuter: {
    height: 32,
    width: 180,
    position: 'relative',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appbarHeader: {
    margin: 0,
    padding: 0,
    elevation: 0,
    borderBottomWidth: 0,
  },
  queueSwitcherWrap: {
    flex: 1,
    marginLeft: 0,
    marginRight: 0,
    padding: 0,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 0,
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
    marginTop: 8,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
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
    backgroundColor: '#6200ee', // fallback, overridden inline
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
