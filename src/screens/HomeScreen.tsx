import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text } from 'react-native';
import {
  Appbar,
  Searchbar,
  Portal,
  Modal,
  Drawer,
  List,
  Button,
  ActivityIndicator,
  Avatar,
} from 'react-native-paper';
import { scanMusic, ScannedTrack } from '../utils/musicScanner';
const RNFS = require('react-native-fs');
// use react-native-track-player for playback

import TrackPlayer, { Capability, AppKilledPlaybackBehavior, getProgress } from 'react-native-track-player';

// Types for TrackPlayer methods are dynamically used through require to avoid
// type setup in this quick iteration. The runtime object supports
// setupPlayer(), add(), play(), pause(), reset(), destroy(), setVolume(), getPosition(), getDuration().

const SAMPLE_DATA: ScannedTrack[] = Array.from({ length: 20 }).map((_, i) => ({
  id: String(i + 1),
  title: `Song ${i + 1}`,
  artist: `Artist ${Math.ceil(Math.random() * 10)}`,
}));

export default function HomeScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedTracks, setScannedTracks] = useState<ScannedTrack[] | null>(null);
  const [currentTrack, setCurrentTrack] = useState<ScannedTrack | null>(null);
  const [queue, setQueue] = useState<ScannedTrack[]>([]);
  const [nowPlayingVisible, setNowPlayingVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0); // milliseconds
  const playbackTimer = useRef<number | null>(null);
  const soundRef = useRef<any>(null);
  const playerInited = useRef<boolean>(false);
  const nativeSoundSupported = useRef<boolean | null>(null);
  // results modal removed — display results inline on the main screen
  const tempFiles = useRef<string[]>([]);
  const [volume, setVolume] = useState<number>(1); // 0.0 - 1.0

  async function getPlayablePath(src: string) {
    if (!src) return src;
    try {
      if (src.startsWith('content://')) {
        // attempt to read content URI as base64 and write to cache
        const dest = `${RNFS.CachesDirectoryPath}/mlap_tmp_${Date.now()}`;
        try {
          const b64 = await RNFS.readFile(src, 'base64');
          await RNFS.writeFile(dest, b64, 'base64');
          tempFiles.current.push(dest);
          return 'file://' + dest;
        } catch (e) {
          console.warn('getPlayablePath: failed to copy content URI', e);
          return src; // fall back
        }
      }
      if (src.startsWith('/')) return 'file://' + src;
      return src;
    } catch (e) {
      console.warn('getPlayablePath error', e);
      return src;
    }
  }

  // initialize TrackPlayer once
  useEffect(() => {
    let mounted = true;
    (async () => {
      console.log('TrackPlayer object:', TrackPlayer);
      console.log('setupPlayer type:', typeof TrackPlayer.setupPlayer);
      try {
        await TrackPlayer.setupPlayer();
        // optional: set options for notification, capabilities
        if (!mounted) return;
        playerInited.current = true;
        try {
          await TrackPlayer.updateOptions({
            android: {
              appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
            },
            capabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious, Capability.SeekTo],
          });
        } catch (e) { /* ignore if not supported */ }
        // set initial volume
        try { await TrackPlayer.setVolume(volume); } catch (e) { }
      } catch (e) {
        console.warn('TrackPlayer setup failed', e);
        playerInited.current = false;
      }
    })();
    return () => { mounted = false; };
  }, []);

  // choose data to display: scannedTracks when available, otherwise sample data
  const displayData = (scannedTracks && scannedTracks.length > 0)
    ? scannedTracks.filter(t => (t.title ?? '').toLowerCase().includes(searchQuery.toLowerCase()) || (t.artist ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
    : SAMPLE_DATA.filter(
      (s) =>
        (s.title ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.artist ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  // run scan on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      setScanning(true);
      try {
        const tracks = await scanMusic();
        if (!mounted) return;
        setScannedTracks(tracks);
      } catch (e) {
        console.warn('Initial scan failed', e);
      } finally {
        if (mounted) setScanning(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current as unknown as number);
        playbackTimer.current = null;
      }
      if (soundRef.current) {
        try {
          soundRef.current.release();
        } catch (e) { }
        soundRef.current = null;
      }
      // remove any temp files we created
      if (tempFiles.current && tempFiles.current.length > 0) {
        for (const f of tempFiles.current) {
          try {
            RNFS.exists(f).then((ex: boolean) => { if (ex) RNFS.unlink(f).catch(() => { }); });
          } catch (e) { }
        }
        tempFiles.current = [];
      }
    };
  }, []);

  function formatDuration(ms?: number) {
    if (!ms && ms !== 0) return '';
    const totalSec = Math.max(0, Math.round((ms || 0) / 1000));
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
      // show H:MM:SS
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    // show M:SS
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  async function startPlayback(track: ScannedTrack) {
    // stop existing timer
    if (playbackTimer.current) {
      clearInterval(playbackTimer.current as unknown as number);
      playbackTimer.current = null;
    }

    setCurrentTrack(track);
    setPosition(0);
    setIsPlaying(true);
    setNowPlayingVisible(true);

    // prepare playable path
    const sourcePath = (track.path ?? (track as any).uri) || '';
    const playablePath = sourcePath ? await getPlayablePath(sourcePath) : '';

    // if TrackPlayer isn't initialized, fallback to simulated timer
    if (!playerInited.current) {
      console.warn('TrackPlayer not initialized, falling back to simulated playback');
      const dur = track.duration ?? 180000;
      playbackTimer.current = setInterval(() => {
        if (!isPlaying) return;
        setPosition((pos) => {
          const next = pos + 1000;
          if (next >= dur) {
            handleSkip();
            return dur;
          }
          return next;
        });
      }, 1000) as unknown as number;
      return;
    }

    try {
      // reset player and add the single track (we manage the queue in state)
      await TrackPlayer.reset();
      const trackObj: any = {
        id: track.id,
        url: playablePath || (track as any).uri || '',
        title: track.title || 'Unknown',
        artist: track.artist || 'Unknown artist',
      };
      if (track.picture) {
        trackObj.artwork = track.picture.startsWith('/') ? 'file://' + track.picture : track.picture;
      }
      if (track.duration) trackObj.duration = (track.duration / 1000);

      await TrackPlayer.add([trackObj]);
      // apply fade-in if volume > 0
      if (volume > 0) {
        try { await TrackPlayer.setVolume(0); } catch (e) { }
        await TrackPlayer.play();
        // fade in over 500ms in 10 steps
        const steps = 10;
        const stepDelay = 50;
        for (let i = 1; i <= steps; i++) {
          // eslint-disable-next-line no-await-in-loop
          await TrackPlayer.setVolume((volume * i) / steps);
          // small typed pause between steps
          // eslint-disable-next-line no-await-in-loop
          await new Promise<void>((res) => setTimeout(() => res(), stepDelay));
        }
      } else {
        await TrackPlayer.setVolume(0);
        await TrackPlayer.play();
      }

      // poll position via TrackPlayer
      playbackTimer.current = setInterval(async () => {
        try {
          const progress = await getProgress();
          const ms = Math.round(progress.position * 1000);
          setPosition(ms);
          if (progress.duration && progress.position >= progress.duration - 0.8) {
            handleSkip();
          }
        } catch (e) {
          // fallback: do nothing
        }
      }, 1000) as unknown as number;
    } catch (e) {
      console.warn('TrackPlayer startPlayback failed, falling back to simulated', e);
      const dur = track.duration ?? 180000;
      playbackTimer.current = setInterval(() => {
        if (!isPlaying) return;
        setPosition((pos) => {
          const next = pos + 1000;
          if (next >= dur) {
            handleSkip();
            return dur;
          }
          return next;
        });
      }, 1000) as unknown as number;
    }
  }

  function stopPlayback() {
    if (playbackTimer.current) {
      clearInterval(playbackTimer.current as unknown as number);
      playbackTimer.current = null;
    }
    if (playerInited.current) {
      try { TrackPlayer.pause(); } catch (e) { }
    }
    setIsPlaying(false);
  }

  function togglePlayPause() {
    if (!currentTrack) return;
    if (isPlaying) {
      // pause
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current as unknown as number);
        playbackTimer.current = null;
      }
      if (playerInited.current) {
        try { TrackPlayer.pause(); } catch (e) { }
      }
      setIsPlaying(false);
    } else {
      // resume
      setIsPlaying(true);
      if (playerInited.current) {
        try {
          TrackPlayer.play();
          playbackTimer.current = setInterval(async () => {
            try {
              const progress = await getProgress();
              setPosition(Math.round(progress.position * 1000));
            } catch (e) { }
          }, 1000) as unknown as number;
        } catch (e) {
          console.warn('Resume failed, fallback to simulated timer', e);
        }
      } else {
        const dur = currentTrack.duration ?? 180000;
        playbackTimer.current = setInterval(() => {
          setPosition((pos) => {
            const next = pos + 1000;
            if (next >= dur) {
              handleSkip();
              return dur;
            }
            return next;
          });
        }, 1000) as unknown as number;
      }
    }
  }

  function handleSkip() {
    // move to next in queue
    if (playbackTimer.current) {
      clearInterval(playbackTimer.current as unknown as number);
      playbackTimer.current = null;
    }
    if (playerInited.current) {
      try { TrackPlayer.stop(); } catch (e) { }
    }
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      // small timeout to ensure previous track stopped
      setTimeout(() => startPlayback(next), 50);
    } else {
      // stop
      stopPlayback();
      setCurrentTrack(null);
    }
  }

  function handlePrev() {
    // naive: reset to start of current track
    setPosition(0);
    if (playerInited.current) {
      try { TrackPlayer.seekTo(0); } catch (e) { }
    }
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Action
          icon="menu"
          onPress={() => setDrawerVisible(true)}
          accessibilityLabel="Open drawer"
        />
        <Appbar.Content title="MLAP" />

        {/* Search icon — in future this will expand to a Searchbar */}
        <Appbar.Action
          icon="magnify"
          onPress={() => {
            console.log('Search button pressed — future expansion');
            // Future: set state to expand search bar
          }}
          accessibilityLabel="Search"
        />

        {/* Overflow / three-dot — triggers storage scan for now */}
        <Appbar.Action
          icon={scanning ? 'cloud-sync' : 'refresh'}
          onPress={async () => {
            setScanning(true);
            try {
              const tracks = await scanMusic();
              console.log('Scanned tracks count:', tracks.length);
              setScannedTracks(tracks);
            } catch (e) {
              console.warn('Scan failed', e);
            } finally {
              setScanning(false);
            }
          }}
          accessibilityLabel="Rescan storage"
        />
      </Appbar.Header>

      <View style={{ flex: 1 }}>
        {scanning ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator animating={true} size={36} />
          </View>
        ) : null}

        <FlatList
          data={displayData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            // choose image source from item.picture if available
            const pic = item.picture as string | undefined | null;
            let imgSource: { uri: string } | undefined;
            if (pic) {
              if (pic.startsWith('data:')) {
                imgSource = { uri: pic };
              } else if (pic.startsWith('/')) {
                // local file path
                imgSource = { uri: 'file://' + pic };
              } else {
                // content:// or http(s) or already a data URI
                imgSource = { uri: pic };
              }
            }

            return (
              <List.Item
                title={item.title ?? 'Unknown'}
                description={`${item.artist ?? 'Unknown artist'}${item.duration ? ' · ' + formatDuration(item.duration) : ''}`}
                left={(props: any) => (
                  imgSource ? (
                    <Avatar.Image size={40} source={imgSource} />
                  ) : (
                    <List.Icon {...props} icon="music" />
                  )
                )}
                onPress={() => {
                  // when a track is pressed: set as current, load next 5 into queue, start playback and open now playing
                  const all = displayData;
                  const idx = all.findIndex(a => a.id === item.id);
                  const q = idx >= 0 ? all.slice(idx + 1, idx + 1 + 5) : [];
                  setQueue(q);
                  startPlayback(item);
                }}
              />
            );
          }}
          contentContainerStyle={styles.list}
        />
      </View>
      {/* bottom player bar */}
      {currentTrack ? (
        <TouchableOpacity style={styles.bottomBar} activeOpacity={0.9} onPress={() => setNowPlayingVisible(true)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {currentTrack.picture ? (
              <Avatar.Image size={40} source={{ uri: currentTrack.picture.startsWith('/') ? 'file://' + currentTrack.picture : currentTrack.picture }} />
            ) : (
              <List.Icon icon="music" />
            )}
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text numberOfLines={1} style={{ fontWeight: '600' }}>{currentTrack.title ?? 'Unknown'}</Text>
              <Text numberOfLines={1} style={{ color: '#666' }}>{currentTrack.artist ?? 'Unknown artist'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => togglePlayPause()} style={{ padding: 8 }}>
            <List.Icon icon={isPlaying ? 'pause' : 'play'} />
          </TouchableOpacity>
        </TouchableOpacity>
      ) : null}
      <Portal>
        <Modal
          visible={drawerVisible}
          onDismiss={() => setDrawerVisible(false)}
          contentContainerStyle={styles.drawerModal}
        >
          <Drawer.Section title="Menu">
            <Drawer.Item
              label="Library"
              icon="library-music"
              onPress={() => setDrawerVisible(false)}
            />
            <Drawer.Item
              label="Playlists"
              icon="playlist-music"
              onPress={() => setDrawerVisible(false)}
            />
            <Drawer.Item
              label="Queues"
              icon="queue-music"
              onPress={() => setDrawerVisible(false)}
            />
            <Drawer.Item
              label="Settings"
              icon="cog"
              onPress={() => setDrawerVisible(false)}
            />
          </Drawer.Section>
        </Modal>

        {/* Now Playing modal */}
        <Modal
          visible={nowPlayingVisible}
          onDismiss={() => setNowPlayingVisible(false)}
          contentContainerStyle={{ flex: 1, margin: 0 }}
        >
          <View style={{ flex: 1, backgroundColor: 'white', padding: 16 }}>
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              {currentTrack?.picture ? (
                <Avatar.Image size={240} source={{ uri: currentTrack.picture.startsWith('/') ? 'file://' + currentTrack.picture : currentTrack.picture }} />
              ) : (
                <Avatar.Icon size={240} icon="music" />
              )}
            </View>
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700' }}>{currentTrack?.title ?? 'Unknown'}</Text>
              <Text style={{ color: '#666', marginTop: 4 }}>{currentTrack?.artist ?? 'Unknown artist'}</Text>
            </View>

            {/* progress bar */}
            <View style={{ marginTop: 24, paddingHorizontal: 8 }}>
              <View style={{ height: 8, backgroundColor: '#eee', borderRadius: 4 }}>
                <View style={{ height: 8, backgroundColor: '#6200ee', width: `${currentTrack && currentTrack.duration ? Math.min(100, (position / (currentTrack.duration || 1)) * 100) : 0}%`, borderRadius: 4 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text>{formatDuration(position)}</Text>
                <Text>{formatDuration(currentTrack?.duration)}</Text>
              </View>
            </View>

            {/* controls */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 24 }}>
              <TouchableOpacity onPress={handlePrev}>
                <Avatar.Icon size={64} icon="skip-previous" />
              </TouchableOpacity>
              <TouchableOpacity onPress={togglePlayPause}>
                <Avatar.Icon size={80} icon={isPlaying ? 'pause-circle' : 'play-circle'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSkip}>
                <Avatar.Icon size={64} icon="skip-next" />
              </TouchableOpacity>
            </View>

            {/* volume controls */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16 }}>
              <Button mode="outlined" onPress={async () => {
                const next = Math.max(0, Math.round((volume - 0.05) * 100) / 100);
                setVolume(next);
                try { await TrackPlayer.setVolume(next); } catch (e) { }
              }}>-</Button>
              <View style={{ width: 12 }} />
              <Text style={{ alignSelf: 'center' }}>{Math.round(volume * 100)}%</Text>
              <View style={{ width: 12 }} />
              <Button mode="outlined" onPress={async () => {
                const next = Math.min(1, Math.round((volume + 0.05) * 100) / 100);
                setVolume(next);
                try { await TrackPlayer.setVolume(next); } catch (e) { }
              }}>+</Button>
            </View>

            <Button mode="outlined" onPress={() => setNowPlayingVisible(false)} style={{ marginTop: 24 }}>
              Close
            </Button>
          </View>
        </Modal>
        {/* results are shown inline on the main screen; modal removed */}
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  search: {
    marginHorizontal: 8,
    marginVertical: 8,
  },
  list: {
    paddingBottom: 120,
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
  resultsModal: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 8,
  },
  bottomBar: {
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
