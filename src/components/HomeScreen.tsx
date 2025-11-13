
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Modal, Drawer, ActivityIndicator } from 'react-native-paper';
import TopBar from './TopBar';
import SongList from './SongList';
import NowPlayingBar from './NowPlayingBar';
import NowPlaying from './NowPlaying';
import { usePlayer } from '../context/PlayerContext';
import { useQueue } from '../context/QueueContext';
import { useMultiQueue } from '../context/MultiQueueContext';
import { scanMusic } from '../utils/musicScanner';

const HomeScreen: React.FC = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [nowPlayingVisible, setNowPlayingVisible] = useState(false);
  const { setQueue: setPlayerQueue, playTrack: playPlayerTrack } = usePlayer();
  const { players } = useQueue();
  const { selectedQueue } = useMultiQueue();
  // Three independent queues
  const [queues, setQueues] = useState<{ [key: string]: any[] }>({
    queue1: [],
    queue2: [],
    queue3: [],
  });
  // For demo, loading state and scannedTracks can be managed here or via context
  // Replace with real scan logic as needed
  const [scanning, setScanning] = useState(false);
  const [scannedTracks, setScannedTracks] = useState<any[]>([]); // Replace any with ScannedTrack[]

  // Restore real scan logic
  useEffect(() => {
    let mounted = true;
    (async () => {
      setScanning(true);
      try {
        const tracks = await scanMusic();
        if (!mounted) return;
        setScannedTracks(tracks);
        // Initialize all queues with scanned tracks if they are empty
        setQueues(prev => {
          const newQueues = { ...prev };
          for (const key of Object.keys(newQueues)) {
            if (!newQueues[key] || newQueues[key].length === 0) {
              newQueues[key] = tracks;
            }
          }
          return newQueues;
        });
      } catch (e) {
        console.warn('Initial scan failed', e);
      } finally {
        if (mounted) setScanning(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // When selectedQueue changes, sync PlayerContext to match the selected queue's state for audio playback
  useEffect(() => {
    const player = players[selectedQueue];
    if (player && player.queue.length > 0 && player.currentTrack) {
      setPlayerQueue(player.queue);
      playPlayerTrack(player.currentTrack);
    }
  }, [selectedQueue, players, setPlayerQueue, playPlayerTrack]);

  // Handler to update the current queue (for SongList)
  const handleSetQueue = (tracks: any[]) => {
    setQueues(prev => ({ ...prev, [selectedQueue]: tracks }));
    // Do not update PlayerContext queue
  };

  const currentQueue = queues[selectedQueue] || [];
  return (
    <View style={styles.container}>
      <TopBar onMenuPress={() => setDrawerVisible(true)} />
      <Portal>
        <Modal
          visible={drawerVisible}
          onDismiss={() => setDrawerVisible(false)}
          contentContainerStyle={styles.drawerModal}
        >
          <Drawer.Section title="Menu">
            <Drawer.Item label="Library" icon="library-music" onPress={() => setDrawerVisible(false)} />
            <Drawer.Item label="Playlists" icon="playlist-music" onPress={() => setDrawerVisible(false)} />
            <Drawer.Item label="Queues" icon="queue-music" onPress={() => setDrawerVisible(false)} />
            <Drawer.Item label="Settings" icon="cog" onPress={() => setDrawerVisible(false)} />
          </Drawer.Section>
        </Modal>
      </Portal>

      {/* Main content area: either NowPlaying or SongList */}
      <View style={styles.flex1}>
        {nowPlayingVisible ? (
          <NowPlaying onClose={() => setNowPlayingVisible(false)} />
        ) : scanning ? (
          <View style={styles.centered}>
            <ActivityIndicator animating={true} size={36} />
          </View>
        ) : (
          <SongList
            tracks={scannedTracks}
            setQueue={handleSetQueue}
            scannedTracks={scannedTracks}
            onSongPlay={() => setNowPlayingVisible(true)}
          />
        )}
      </View>

      {!nowPlayingVisible && (
        <NowPlayingBar onPress={() => setNowPlayingVisible(true)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  centered: {
    padding: 16,
    alignItems: 'center',
  },
  drawerModal: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: 'white',
    paddingTop: 24,
  },
  nowPlayingModal: {
    flex: 1,
    margin: 0,
  },
});

export default HomeScreen;
