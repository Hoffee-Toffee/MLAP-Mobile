import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PlaylistsTab = () => (
  <View style={styles.container}>
    <Text>Playlists (placeholder)</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default PlaylistsTab;
