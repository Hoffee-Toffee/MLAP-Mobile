import React, { useState } from 'react';
import { FlatList, View, Text, TouchableOpacity } from 'react-native';
import { ScannedTrack } from '../utils/musicScanner';
import { useTheme } from 'react-native-paper';
import ListItem from '../components/ListItem';
import { usePerQueuePlayer } from '../context/PerQueuePlayerContext';
import { useMultiQueue } from '../context/MultiQueueContext';
import { StyleSheet } from 'react-native';

type ArtistsTabProps = { tracks: ScannedTrack[] };

// ArtistIcon removed; using ListItem for all entries

const ArtistsTab: React.FC<ArtistsTabProps> = ({ tracks }) => {
  const theme = useTheme();
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  // Group by artist
  const artists = React.useMemo(() => {
    const map = new Map();
    for (const t of tracks) {
      if (!t.artist) continue;
      if (!map.has(t.artist)) map.set(t.artist, { name: t.artist, albums: new Set(), count: 0 });
      const entry = map.get(t.artist);
      entry.count++;
      if (t.album) entry.albums.add(t.album);
    }
    return Array.from(map.values()).map(a => ({ ...a, albums: a.albums.size })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  // Songs for selected artist
  const artistSongs = React.useMemo(() =>
    selectedArtist ? tracks.filter(t => t.artist === selectedArtist) : [],
    [tracks, selectedArtist]
  );

  const { setQueue, playTrack } = usePerQueuePlayer();
  const { selectedQueue } = useMultiQueue();
  if (selectedArtist) {
    const artist = artists.find(a => a.name === selectedArtist);
    return (
      <View style={[styles.flex1, { backgroundColor: theme.colors.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setSelectedArtist(null)}>
            <Text style={[styles.backText, { color: theme.colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>{artist?.name}</Text>
        </View>
        <FlatList
          data={artistSongs}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <ListItem
              item={{
                type: 'song',
                track: item,
                onPress: () => {
                  const q = artistSongs.slice(index).concat(artistSongs.slice(0, index));
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
      data={artists}
      keyExtractor={item => item.name}
      renderItem={({ item }) => (
        <ListItem
          item={{
            type: 'artist',
            name: item.name,
            albums: item.albums,
            count: item.count,
            onPress: () => setSelectedArtist(item.name),
          }}
          textColor={theme.colors.onBackground}
          backgroundColor={theme.colors.background}
        />
      )}
      style={{ backgroundColor: theme.colors.background }}
    />
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  backText: { fontWeight: 'bold', marginRight: 12 },
  headerTitle: { fontWeight: 'bold', fontSize: 18 },
  description: {
    opacity: 0.7,
  },
});

export default ArtistsTab;
