// FolderIcon and MusicIcon removed; using ListItem for all entries
import React, { useState, useMemo, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { ScannedTrack } from '../utils/musicScanner';
import { useTheme } from 'react-native-paper';
import ListItem from '../components/ListItem';
import { usePerQueuePlayer } from '../context/PerQueuePlayerContext';
import { useMultiQueue } from '../context/MultiQueueContext';
import { StyleSheet } from 'react-native';

type FoldersTabProps = { tracks: ScannedTrack[] };

type FolderNode = {
  [key: string]: FolderNode;
} & { __tracks?: ScannedTrack[] };
function getFolderTree(tracks: ScannedTrack[]): FolderNode {
  const tree: FolderNode = {};
  for (const t of tracks) {
    if (!t.path) continue;
    const parts = t.path.replace(/\\/g, '/').split('/');
    let node: FolderNode = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!node[part] || typeof node[part] !== 'object' || Array.isArray(node[part])) node[part] = {};
      node = node[part] as FolderNode;
    }
    if (!node.__tracks) node.__tracks = [];
    node.__tracks.push(t);
  }
  return tree;
}

function getCommonRoot(tracks: ScannedTrack[]): string[] {
  if (!tracks.length) return [];
  const splitPaths = tracks.map(t => (t.path || '').replace(/\\/g, '/').split('/'));
  let root: string[] = [];
  for (let i = 0; ; i++) {
    const segment = splitPaths[0][i];
    if (segment === undefined) break;
    if (splitPaths.every(parts => parts[i] === segment)) {
      root.push(segment);
    } else {
      break;
    }
  }
  return root;
}

const FoldersTab: React.FC<FoldersTabProps> = ({ tracks }) => {
  const theme = useTheme();
  const commonRoot = useMemo(() => getCommonRoot(tracks), [tracks]);
  const [breadcrumb, setBreadcrumb] = useState<string[]>(commonRoot);

  // Helper to get current folder path as string
  const currentPath = breadcrumb.length ? breadcrumb.join('/') + '/' : '';

  // Get all folders and files in the current folder
  const entries = useMemo(() => {
    const foldersSet = new Set<string>();
    const files: ScannedTrack[] = [];
    for (const t of tracks) {
      if (!t.path) continue;
      const parts = t.path.replace(/\\/g, '/').split('/');
      // Check if this track is in the current folder or a subfolder
      const isInCurrentFolder = breadcrumb.every((seg, idx) => parts[idx] === seg);
      if (!isInCurrentFolder) continue;
      const rel = parts.slice(breadcrumb.length);
      if (rel.length === 0) continue;
      if (rel.length === 1) {
        // Direct file in this folder
        files.push(t);
      } else if (rel.length > 1) {
        // Direct subfolder in this folder
        foldersSet.add(rel[0]);
      }
    }
    const folders = Array.from(foldersSet).sort();
    type FolderEntry = { type: 'folder'; name: string };
    type FileEntry = { type: 'file'; track: ScannedTrack };
    const folderEntries: FolderEntry[] = folders.map(name => ({ type: 'folder', name }));
    const fileEntries: FileEntry[] = files.map(track => ({ type: 'file', track }));
    return [...folderEntries, ...fileEntries];
  }, [tracks, breadcrumb]);

  // Count all tracks in a folder and its subfolders (recursive)
  function countTracksInFolder(folderName: string) {
    const folderPath = (breadcrumb.length ? breadcrumb.join('/') + '/' : '') + folderName + '/';
    return tracks.filter(t => (t.path || '').replace(/\\/g, '/').startsWith(folderPath)).length;
  }



  // Render breadcrumb as a horizontal ScrollView with clickable segments and muted slashes
  const scrollViewRef = useRef<ScrollView>(null);
  React.useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [breadcrumb]);

  const handleBreadcrumbPress = (idx: number) => {
    if (idx === -1) {
      setBreadcrumb(commonRoot);
    } else {
      setBreadcrumb([...breadcrumb.slice(0, idx + 1)]);
    }
  };

  // Build breadcrumb segments
  const segments = [
    { label: commonRoot.length ? commonRoot.join('/').slice(1) : 'Root', idx: -1 }
  ];
  breadcrumb.slice(commonRoot.length).forEach((part, idx) => {
    segments.push({ label: part, idx: commonRoot.length + idx });
  });

  const { setQueue, playTrack } = usePerQueuePlayer();
  const { selectedQueue } = useMultiQueue();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.breadcrumbRow}
        >
          {segments.map((seg, i) => (
            <React.Fragment key={seg.idx}>
              {i !== 0 && (
                <Text style={[styles.breadcrumbSlash, { color: theme.colors.onBackground }]}>/</Text>
              )}
              <TouchableOpacity onPress={() => handleBreadcrumbPress(seg.idx)}>
                <Text
                  style={[styles.breadcrumb, { color: theme.colors.primary }]}
                  numberOfLines={1}
                  ellipsizeMode="head"
                >
                  {seg.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={entries}
        keyExtractor={item =>
          item.type === 'folder'
            ? 'folder:' + (item as { type: 'folder'; name: string }).name
            : 'file:' + (item as { type: 'file'; track: ScannedTrack }).track.id
        }
        renderItem={({ item, index }) => {
          if (item.type === 'folder') {
            const folder = item as { type: 'folder'; name: string };
            return (
              <ListItem
                item={{
                  type: 'folder',
                  name: folder.name,
                  count: countTracksInFolder(folder.name),
                  onPress: () => setBreadcrumb([...breadcrumb, folder.name]),
                }}
                textColor={theme.colors.onBackground}
                backgroundColor={theme.colors.background}
              />
            );
          } else {
            // Only direct files in this folder
            const file = item as { type: 'file'; track: ScannedTrack };
            // Get all direct files in this folder
            const directFiles = entries.filter(e => e.type === 'file').map(e => (e as { type: 'file'; track: ScannedTrack }).track);
            return (
              <ListItem
                item={{
                  type: 'song',
                  track: file.track,
                  onPress: () => {
                    setQueue(selectedQueue, directFiles);
                    playTrack(selectedQueue, file.track);
                  },
                }}
                textColor={theme.colors.onBackground}
                backgroundColor={theme.colors.background}
              />
            );
          }
        }}
        style={{ backgroundColor: theme.colors.background }}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1 },
  breadcrumbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2, paddingHorizontal: 8, minHeight: 0 },
  breadcrumb: { color: '#007AFF', fontWeight: 'bold', paddingHorizontal: 2 },
  breadcrumbSlash: { fontWeight: 'bold', opacity: 0.5 },
  tracksHeader: { margin: 8, fontWeight: 'bold' },
  description: {
    opacity: 0.7,
  },
});

export default FoldersTab;
