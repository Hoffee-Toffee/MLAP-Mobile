import React from 'react';
import { List, Avatar } from 'react-native-paper';
import { ScannedTrack } from '../utils/musicScanner';
import { StyleSheet } from 'react-native';

interface SongItemProps {
  track: ScannedTrack;
  onPress: (track: ScannedTrack) => void;
  textColor?: string;
  backgroundColor?: string;
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
    <List.Icon icon="music" />
  );
});

const SongItem: React.FC<SongItemProps> = ({ track, onPress, textColor, backgroundColor }) => {
  return (
    <List.Item
      title={track.title ?? 'Unknown'}
      description={track.artist ?? 'Unknown artist'}
      left={() => <SongItemLeft pic={track.picture} />}
      onPress={() => onPress(track)}
      style={[styles.item, backgroundColor ? { backgroundColor } : null]}
      titleStyle={[styles.title, textColor ? { color: textColor } : null]}
      descriptionStyle={textColor ? { color: textColor } : null}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    // backgroundColor will be overridden by prop if provided
  },
  title: {
    fontWeight: 'bold',
  },
});

export default SongItem;
