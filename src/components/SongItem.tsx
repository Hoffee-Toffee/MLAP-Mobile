import React from 'react';
import { Text } from 'react-native';
import { List, Avatar } from 'react-native-paper';
import { ScannedTrack } from '../utils/musicScanner';
import { formatDuration } from '../utils/formatDuration';
import { StyleSheet } from 'react-native';

interface SongItemProps {
  track: ScannedTrack;
  onPress: (track: ScannedTrack) => void;
  textColor?: string;
  backgroundColor?: string;
  isCurrent?: boolean;
  isPlaying?: boolean;
  style?: any;
  theme?: any;
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

const SongItem: React.FC<SongItemProps> = ({ track, onPress, textColor, backgroundColor, isCurrent, isPlaying, style, theme }) => {
  const duration = typeof track.duration === 'number' ? track.duration : 0;
  const durationStr = duration > 0 ? formatDuration(duration) : '';
  const artist = track.artist ?? 'Unknown artist';
  // Show play/pause icon for current track, using theme colors and swapped logic
  const left = isCurrent
    ? () => (
        <List.Icon
          icon={isPlaying ? 'play-circle' : 'pause-circle'}
          color={theme?.colors?.primaryContainer}
          style={{ marginRight: 0 }}
        />
      )
    : () => <SongItemLeft pic={track.picture} />;
  const titleColor = isCurrent && theme?.colors?.primary ? theme.colors.primary : textColor;
  return (
    <List.Item
      title={track.title ?? 'Unknown'}
      description={
        <Text numberOfLines={1} style={{ flexDirection: 'row', flexWrap: 'nowrap', color: textColor || undefined }}>
          {durationStr}
          {durationStr ? <Text style={{ opacity: 0.5 }}> • </Text> : null}
          {artist}
        </Text>
      }
      left={left}
      onPress={() => onPress(track)}
      style={[styles.item, backgroundColor ? { backgroundColor } : null, style]}
      titleStyle={[styles.title, titleColor ? { color: titleColor } : null]}
      descriptionStyle={textColor ? { color: textColor } : null}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    paddingLeft: 16, // Match List.Item default left padding
    // backgroundColor will be overridden by prop if provided
  },
  title: {
    fontWeight: 'bold',
  },
});

export default SongItem;
