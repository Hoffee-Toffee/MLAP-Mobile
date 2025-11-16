
import React from 'react';
import { Appbar, useTheme } from 'react-native-paper';
import TopBar from '../components/TopBar';
import { View as RNView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const QueueHeader: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  return (
    <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.primary }]}>
      <Appbar.BackAction color={theme.colors.onPrimary} onPress={() => navigation.goBack()} />
      <RNView style={styles.flex1}>
        <TopBar showMenu={false} iconColor={theme.colors.onPrimary} />
      </RNView>
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  header: {
    margin: 0,
    padding: 0,
    elevation: 0,
    borderBottomWidth: 0,
  },
  flex1: {
    flex: 1,
  },
});

export default QueueHeader;
