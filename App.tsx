/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useContext } from 'react';
import { usePerQueuePlayer } from './src/context/PerQueuePlayerContext';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

// Force instantiation of the native module at startup
const _forceMediaButtonModule = NativeModules.MediaButton;
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { MultiQueueProvider } from './src/context/MultiQueueContext';
import { PerQueuePlayerProvider } from './src/context/PerQueuePlayerContext';
import { QueueProvider } from './src/context/QueueContext';
import { AllTracksProvider } from './src/context/AllTracksContext';

// Handles headset/media button events using the player context
function MediaButtonHandler() {
  const perQueuePlayer = usePerQueuePlayer();
  useEffect(() => {
    if (Platform.OS === 'android' && NativeModules.MediaButton) {
      const emitter = new NativeEventEmitter(NativeModules.MediaButton);
      const sub = emitter.addListener('MediaButton', (action: string) => {
        if (action === 'playpause') {
          if (typeof (globalThis as any).mediaButtonToggleAllQueues === 'function') {
            (globalThis as any).mediaButtonToggleAllQueues();
          }
        } else if (action === 'play') {
          if (typeof (globalThis as any).mediaButtonPlayAllQueues === 'function') {
            (globalThis as any).mediaButtonPlayAllQueues();
          }
        } else if (action === 'pause') {
          if (typeof (globalThis as any).mediaButtonPauseAllQueues === 'function') {
            (globalThis as any).mediaButtonPauseAllQueues();
          }
        }
      });
      return () => sub.remove();
    }
  }, [perQueuePlayer.players]);
  return null;
}
function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <PerQueuePlayerProvider>
      <QueueProvider>
        <MultiQueueProvider>
          <AllTracksProvider>
            <SafeAreaProvider>
              <PaperProvider>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <MediaButtonHandler />
                <AppNavigator />
              </PaperProvider>
            </SafeAreaProvider>
          </AllTracksProvider>
        </MultiQueueProvider>
      </QueueProvider>
    </PerQueuePlayerProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
