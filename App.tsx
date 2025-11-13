/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { MultiQueueProvider } from './src/context/MultiQueueContext';
import { PlayerProvider } from './src/context/PlayerContext';
import { QueueProvider } from './src/context/QueueContext';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <PlayerProvider>
      <QueueProvider>
        <MultiQueueProvider>
          <SafeAreaProvider>
            <PaperProvider>
              <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
              <AppNavigator />
            </PaperProvider>
          </SafeAreaProvider>
        </MultiQueueProvider>
      </QueueProvider>
    </PlayerProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
