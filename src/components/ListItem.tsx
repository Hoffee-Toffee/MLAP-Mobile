import React from 'react';
import { List, Avatar } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { ScannedTrack } from '../utils/musicScanner';

export type ListItemType =
  | { type: 'folder'; name: string; count: number; onPress: () => void }
  | { type: 'album'; name: string; artist?: string; count: number; onPress: () => void }
  | { type: 'artist'; name: string; albums: number; count: number; onPress: () => void }
  | { type: 'song'; track: ScannedTrack; onPress: () => void };

function FolderIcon(props: { color: string; style?: any }) {
  return <List.Icon {...props} icon="folder-music" />;
}
function AlbumIcon(props: { color: string; style?: any }) {
  return <List.Icon {...props} icon="album" />;
}
function ArtistIcon(props: { color: string; style?: any }) {
  return <List.Icon {...props} icon="account-music" />;
}
function SongIcon(props: { color: string; style?: any }) {
  return <List.Icon {...props} icon="music" />;
}

const SongItemLeft = React.memo(({ pic }: { pic?: string | null }) => {
  let imgSource: { uri: string } | undefined;
  if (pic) {
    if (pic.startsWith('data:')) {
      imgSource = { uri: pic };
    } else if (pic.startsWith('/')) {
      imgSource = { uri: 'file://' + pic };
    } else {
      imgSource = { uri: pic };
    }
  }
  return imgSource ? (
    <Avatar.Image size={40} source={imgSource} />
  ) : (
    <SongIcon color="#888" style={{}} />
  );
});

const ListItem: React.FC<{
  item: ListItemType;
  textColor?: string;
  backgroundColor?: string;
}> = ({ item, textColor, backgroundColor }) => {
  // Only song items get left padding for icon alignment
  const itemStyle = item.type === 'song' ? styles.item : null;
  if (item.type === 'folder') {
    return (
      <List.Item
        title={item.name}
        description={`${item.count} song${item.count !== 1 ? 's' : ''}`}
        left={FolderIcon}
        onPress={item.onPress}
        style={[backgroundColor ? { backgroundColor } : null]}
        titleStyle={[styles.title, textColor ? { color: textColor } : null]}
        descriptionStyle={[styles.description, textColor ? { color: textColor } : null]}
      />
    );
  } else if (item.type === 'album') {
    return (
      <List.Item
        title={item.name}
        description={`${item.artist || 'Unknown'} - ${item.count} song${item.count !== 1 ? 's' : ''}`}
        left={AlbumIcon}
        onPress={item.onPress}
        style={[backgroundColor ? { backgroundColor } : null]}
        titleStyle={[styles.title, textColor ? { color: textColor } : null]}
        descriptionStyle={[styles.description, textColor ? { color: textColor } : null]}
      />
    );
  } else if (item.type === 'artist') {
    return (
      <List.Item
        title={item.name}
        description={`${item.albums} album${item.albums !== 1 ? 's' : ''} - ${item.count} song${item.count !== 1 ? 's' : ''}`}
        left={ArtistIcon}
        onPress={item.onPress}
        style={[backgroundColor ? { backgroundColor } : null]}
        titleStyle={[styles.title, textColor ? { color: textColor } : null]}
        descriptionStyle={[styles.description, textColor ? { color: textColor } : null]}
      />
    );
  } else if (item.type === 'song') {
    // Move SongItemLeft out of render
    const left = () => <SongItemLeft pic={item.track.picture} />;
    return (
      <List.Item
        title={item.track.title ?? 'Unknown'}
        description={item.track.artist ?? 'Unknown artist'}
        left={left}
        onPress={() => item.onPress()}
        style={[itemStyle, backgroundColor ? { backgroundColor } : null]}
        titleStyle={[styles.title, textColor ? { color: textColor } : null]}
        descriptionStyle={[styles.description, textColor ? { color: textColor } : null]}
      />
    );
  } else {
    return null;
  }
};

const styles = StyleSheet.create({
  item: {
    paddingLeft: 16,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  description: {
    opacity: 0.7,
    fontSize: 14,
  },
});

export default ListItem;
