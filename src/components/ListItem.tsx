import React, { useState, useRef } from 'react';
import { List, Avatar, IconButton, Portal, useTheme } from 'react-native-paper';
import { StyleSheet, View, Modal, TouchableWithoutFeedback, TouchableOpacity, Dimensions, Text } from 'react-native';
import { ScannedTrack } from '../utils/musicScanner';

export type ListItemType =
  | { type: 'folder'; name: string; count: number; onPress: () => void }
  | { type: 'album'; name: string; artist?: string; count: number; onPress: () => void }
  | { type: 'artist'; name: string; albums: number; count: number; onPress: () => void }
  | { type: 'song'; track: ScannedTrack; onPress: () => void };

type MenuActionHandlers = {
  onPlayNext?: (item: ListItemType) => void;
  onAddToQueue?: (item: ListItemType) => void;
  onAddToPlaylist?: (item: ListItemType) => void;
  onGoToAlbum?: (item: ListItemType) => void;
  onGoToArtist?: (item: ListItemType) => void;
};

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

interface ListItemProps extends MenuActionHandlers {
  item: ListItemType;
  textColor?: string;
  backgroundColor?: string;
}

const ListItem: React.FC<ListItemProps> = ({
  item,
  textColor,
  backgroundColor,
  onPlayNext,
  onAddToQueue,
  onAddToPlaylist,
  onGoToAlbum,
  onGoToArtist,
}) => {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const iconRef = useRef<any>(null); // Use 'any' for compatibility with measure
  // Only song items get left padding for icon alignment
  const itemStyle = item.type === 'song' ? styles.item : null;
  // Menu actions (call props if provided)
  const handlePlayNext = () => {
    setMenuVisible(false);
    if (onPlayNext) onPlayNext(item);
  };
  const handleAddToQueue = () => {
    setMenuVisible(false);
    if (onAddToQueue) onAddToQueue(item);
  };
  const handleAddToPlaylist = () => {
    setMenuVisible(false);
    if (onAddToPlaylist) onAddToPlaylist(item);
  };
  const handleGoToAlbum = () => {
    setMenuVisible(false);
    if (onGoToAlbum) onGoToAlbum(item);
  };
  const handleGoToArtist = () => {
    setMenuVisible(false);
    if (onGoToArtist) onGoToArtist(item);
  };
  const handlePlay = () => {
    setMenuVisible(false);
    if (item.onPress) item.onPress();
  };


  // Compose right element with 3-dot menu using a custom modal
  const openMenu = () => {
    if (iconRef.current && typeof iconRef.current.measure === 'function') {
      iconRef.current.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
        setMenuPos({ x: px, y: py + height });
        setMenuVisible(true);
      });
    } else {
      setMenuVisible(true);
    }
  };
  const closeMenu = () => setMenuVisible(false);

  type MenuOption = { title: string; onPress: () => void; red?: boolean };
  const renderMenu = () => {
    if (!menuVisible || !menuPos) return null;
    // Menu width and item height
    const menuWidth = 200;
    const itemHeight = 44;
    let options: MenuOption[] = [];
    if (item.type === 'song') {
      options = [
        { title: 'Play Next', onPress: handlePlayNext },
        { title: 'Add to Queue', onPress: handleAddToQueue },
        { title: 'Add to Playlist', onPress: handleAddToPlaylist, red: true },
        { title: 'Go to Album', onPress: handleGoToAlbum },
        { title: 'Go to Artist', onPress: handleGoToArtist },
      ];
    } else if (item.type === 'album' || item.type === 'artist' || item.type === 'folder') {
      options = [
        { title: 'Play', onPress: handlePlay },
        { title: 'Play Next', onPress: handlePlayNext },
        { title: 'Add to Queue', onPress: handleAddToQueue },
        { title: 'Add to Playlist', onPress: handleAddToPlaylist, red: true },
      ];
    }
    // Clamp menu position to screen
    const { width: screenW, height: screenH } = Dimensions.get('window');
    let left = Math.max(8, Math.min(menuPos.x - menuWidth + 48, screenW - menuWidth - 8));
    let top = Math.max(8, Math.min(menuPos.y, screenH - options.length * itemHeight - 8));
    return (
      <Portal>
        <Modal visible transparent animationType="fade">
          <TouchableWithoutFeedback onPress={closeMenu}>
            <View style={styles.menuOverlay} />
          </TouchableWithoutFeedback>
          <View style={[styles.menu, { left, top, width: menuWidth, backgroundColor: theme.colors.onBackground }]}>
            {options.map((opt, i) => (
              <TouchableOpacity
                key={opt.title}
                style={[styles.menuItem, opt.red && styles.menuItemRed]}
                onPress={opt.onPress}
                activeOpacity={0.7}
              >
                <Text style={[styles.menuItemText, opt.red && styles.menuItemTextRed]}>{opt.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Modal>
      </Portal>
    );
  };

  // Make a dedicated right-side area for the menu button, so taps there never trigger the item
  const renderRight = () => (
    <View style={styles.menuRightArea}>
      <TouchableOpacity
        ref={iconRef}
        onPress={openMenu}
        style={styles.menuIconBtn}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <IconButton icon="dots-vertical" accessibilityLabel="More options" />
        {renderMenu()}
      </TouchableOpacity>
    </View>
  );

  if (item.type === 'folder') {
    return (
      <List.Item
        title={item.name}
        description={`${item.count} song${item.count !== 1 ? 's' : ''}`}
        left={FolderIcon}
        onPress={item.onPress}
        right={renderRight}
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
        right={renderRight}
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
        right={renderRight}
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
        right={renderRight}
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
  menuRightArea: {
    width: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -20,
  },
  menuIconBtn: {
    zIndex: 1,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
    zIndex: 10,
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    paddingVertical: 4,
    zIndex: 20,
  },
  menuItem: {
    paddingHorizontal: 20,
    height: 44,
    justifyContent: 'center',
  },
  menuItemRed: {
    backgroundColor: '#ffeaea',
  },
  menuItemText: {
    fontSize: 16,
  },
  menuItemTextRed: {
    color: 'red',
    fontWeight: 'bold',
  },
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
