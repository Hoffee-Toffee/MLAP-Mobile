/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { MultiQueueProvider } from './src/context/MultiQueueContext';
import { PerQueuePlayerProvider } from './src/context/PerQueuePlayerContext';
import { QueueProvider } from './src/context/QueueContext';
import { AllTracksProvider } from './src/context/AllTracksContext';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Listen for headset/media button events from native module
  useEffect(() => {
    if (Platform.OS === 'android' && NativeModules.MediaButton) {
      const emitter = new NativeEventEmitter(NativeModules.MediaButton);
      const sub = emitter.addListener('MediaButton', (action: string) => {
        // You can customize this logic as needed
        if (action === 'playpause' || action === 'play' || action === 'pause') {
          // Pause/resume all queues
          if (typeof (globalThis as any).pauseAllQueues === 'function' && (action === 'pause' || action === 'playpause')) {
            (globalThis as any).pauseAllQueues();
          }
          if (typeof (globalThis as any).resumeAllQueues === 'function' && (action === 'play' || action === 'playpause')) {
            (globalThis as any).resumeAllQueues();
          }
        }
        // Add next/previous support if needed
      });
      return () => sub.remove();
    }
  }, []);

  return (
    <PerQueuePlayerProvider>
      <QueueProvider>
        <MultiQueueProvider>
          <AllTracksProvider>
            <SafeAreaProvider>
              <PaperProvider>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
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
