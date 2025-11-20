import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Portal, Modal, Drawer } from 'react-native-paper';

import TopBar from '../components/TopBar';
import NowPlayingBar from '../components/NowPlayingBar';
import { useNavigation } from '@react-navigation/native';
import SongsTab from '../tabs/SongsTab';
import AlbumsTab from '../tabs/AlbumsTab';
import ArtistsTab from '../tabs/ArtistsTab';
import PlaylistsTab from '../tabs/PlaylistsTab';
import FoldersTab from '../tabs/FoldersTab';
import { useAllTracks } from '../context/AllTracksContext';
import { ActivityIndicator } from 'react-native-paper';

type TabButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

const TabButton: React.FC<TabButtonProps> = ({ label, active, onPress }) => {
  const theme = useTheme();
  return (
    <TouchableOpacity onPress={onPress} style={styles.tabBtnWrap}>
      <View style={styles.tabTextUnderlineWrap}>
        <Text style={[styles.tabBtnText, { color: active ? theme.colors.primary : theme.colors.onSurface }]}>{label}</Text>
        <View style={[
          styles.tabUnderline,
          {
            backgroundColor: 'transparent',
            borderBottomColor: active ? theme.colors.primary : 'transparent',
            borderBottomWidth: 3,
          },
        ]} />
      </View>
    </TouchableOpacity>
  );
};



const HomeScreen: React.FC = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const navigation = useNavigation();
  const [tab, setTab] = useState('Songs');
  const { tracks, loading } = useAllTracks();

  return (
    <View style={{ flex: 1, flexDirection: 'column' }}>
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

      {/* Tabs navigation */}
      <View style={{ width: '100%' }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabsRow, { backgroundColor: useTheme().colors.background, minWidth: '100%' }]}
          style={{ flexGrow: 1, flexShrink: 1, flexBasis: 'auto', height: 44, minWidth: '100%' }}
        >
          {['Songs', 'Albums', 'Artists', 'Playlists', 'Folders'].map((t, i, arr) => (
            <React.Fragment key={t}>
              <TabButton label={t} active={tab === t} onPress={() => setTab(t)} />
              {i < arr.length - 1 && <View style={styles.tabDivider} />}
            </React.Fragment>
          ))}
        </ScrollView>
      </View>

      <View style={{ flex: 1, flexDirection: 'column' }}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator animating={true} size={36} />
          </View>
        ) : (
          tab === 'Songs' ? (
            <SongsTab tracks={[...tracks].sort((a, b) => (a.title || '').localeCompare(b.title || ''))} onSongPlay={() => navigation.navigate('NowPlaying' as never)} />
          ) : tab === 'Albums' ? (
            <AlbumsTab tracks={tracks} />
          ) : tab === 'Artists' ? (
            <ArtistsTab tracks={tracks} />
          ) : tab === 'Playlists' ? (
            <PlaylistsTab />
          ) : tab === 'Folders' ? (
            <FoldersTab tracks={tracks} />
          ) : null
        )}
      </View>

      <NowPlayingBar onPress={() => navigation.navigate('NowPlaying' as never)} />
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
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 0,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    paddingHorizontal: 0,
    minHeight: 44,
    height: 44,
  },
  tabBtnWrap: {
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    backgroundColor: 'transparent',
    height: 44,
  },
  tabTextUnderlineWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 28,
    width: '100%',
  },
  tabBtnText: {
    fontSize: 18,
    fontWeight: '600',
    paddingBottom: 0,
    lineHeight: 24,
  },
  tabUnderline: {
    width: '100%',
    borderRadius: 2,
    marginTop: 2,
  },
  tabDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginHorizontal: 2,
  },
  tabTitleRow: {
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabTitleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  tabTitleText: {
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
    color: '#222',
    marginVertical: 4,
  },
  tabBtn: {
    margin: 0,
    paddingVertical: 0,
    minHeight: 36,
  },
});

export default HomeScreen;
