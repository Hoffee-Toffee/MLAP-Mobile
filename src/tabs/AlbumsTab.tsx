import React, { useState } from 'react';
import { FlatList, View, Text, TouchableOpacity } from 'react-native';
import { ScannedTrack } from '../utils/musicScanner';
import { useTheme } from 'react-native-paper';
import ListItem from '../components/ListItem';
import { usePerQueuePlayer } from '../context/PerQueuePlayerContext';
import { useMultiQueue } from '../context/MultiQueueContext';
import { StyleSheet } from 'react-native';

type AlbumsTabProps = { tracks: ScannedTrack[] };

const AlbumsTab: React.FC<AlbumsTabProps> = ({ tracks }) => {
  const theme = useTheme();
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

  // Group by album
  const albums = React.useMemo(() => {
    const map = new Map();
    for (const t of tracks) {
      if (!t.album) continue;
      if (!map.has(t.album)) map.set(t.album, { name: t.album, artist: t.artist, count: 0 });
      const entry = map.get(t.album);
      entry.count++;
      if (!entry.artist && t.artist) entry.artist = t.artist;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  // Songs for selected album
  const albumSongs = React.useMemo(() =>
    selectedAlbum ? tracks.filter(t => t.album === selectedAlbum) : [],
    [tracks, selectedAlbum]
  );

  const { setQueue, playTrack } = usePerQueuePlayer();
  const { selectedQueue } = useMultiQueue();
  if (selectedAlbum) {
    const album = albums.find(a => a.name === selectedAlbum);
    return (
      <View style={[styles.flex1, { backgroundColor: theme.colors.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setSelectedAlbum(null)}>
            <Text style={[styles.backText, { color: theme.colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>{album?.name}</Text>
        </View>
        <FlatList
          data={albumSongs}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <ListItem
              item={{
                type: 'song',
                track: item,
                onPress: () => {
                  const q = albumSongs.slice(index).concat(albumSongs.slice(0, index));
                  setQueue(selectedQueue, q);
                  playTrack(selectedQueue, item);
                },
              }}
              textColor={theme.colors.onBackground}
              backgroundColor={theme.colors.background}
            />
          )}
          style={{ backgroundColor: theme.colors.background }}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={albums}
      keyExtractor={item => item.name}
      renderItem={({ item }) => (
        <ListItem
          item={{
            type: 'album',
            name: item.name,
            artist: item.artist,
            count: item.count,
            onPress: () => setSelectedAlbum(item.name),
          }}
          textColor={theme.colors.onBackground}
          backgroundColor={theme.colors.background}
        />
      )}
      style={{ backgroundColor: theme.colors.background }}
    />
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  backText: { fontWeight: 'bold', marginRight: 12 },
  headerTitle: { fontWeight: 'bold', fontSize: 18 },
  description: {
    opacity: 0.7,
  },
});

export default AlbumsTab;
