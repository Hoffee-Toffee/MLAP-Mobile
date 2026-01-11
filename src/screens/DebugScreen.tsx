import React, { useState, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { Appbar, Button, useTheme } from 'react-native-paper';

const DebugScreen: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const theme = useTheme();
  const navigation = useNavigation();


  // Listen for media button and NowPlayingNotification events
  useEffect(() => {
    const { Platform, NativeModules, NativeEventEmitter } = require('react-native');
    const listeners: any[] = [];
    if (Platform.OS === 'android') {
      // MediaButton events
      if (NativeModules.MediaButton) {
        const emitter = new NativeEventEmitter(NativeModules.MediaButton);
        listeners.push(
          emitter.addListener('MediaButton', (action: string) => {
            setLogs(logs => [...logs, `[MediaButton] ${action} (${new Date().toLocaleTimeString()})`]);
          })
        );
      }
      // NowPlayingNotification events
      if (NativeModules.NowPlayingNotification) {
        const emitter = new NativeEventEmitter(NativeModules.NowPlayingNotification);
        listeners.push(
          emitter.addListener('NowPlayingNotification', (event: any) => {
            if (typeof event === 'object' && event !== null) {
              setLogs(logs => [...logs, `[NowPlayingNotification] action=${event.action} notificationId=${event.notificationId} (${new Date().toLocaleTimeString()})`]);
            } else if (typeof event === 'string') {
              setLogs(logs => [...logs, `[NowPlayingNotification] ${event} (${new Date().toLocaleTimeString()})`]);
            }
          })
        );
      }
    }
    // TODO: Add listeners for Bluetooth, headset, call events if available
    return () => {
      listeners.forEach(sub => sub.remove && sub.remove());
    };
  }, []);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [logs]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction color={theme.colors.onPrimary} onPress={() => navigation.goBack()} accessibilityLabel="Back" />
        <Appbar.Content title="Debug" color={theme.colors.onPrimary} />
      </Appbar.Header>
      <Button mode="contained" style={styles.button} onPress={() => setLogs([])}>
        Clear Logs
      </Button>
      <ScrollView ref={scrollViewRef} style={styles.logContainer}>
        {logs.length === 0 ? (
          <Text style={{ color: theme.colors.onBackground, opacity: 0.6, margin: 16 }}>No events yet.</Text>
        ) : (
          logs.map((log, idx) => (
            <Text key={idx} style={{ color: theme.colors.onBackground, marginHorizontal: 16, marginVertical: 2 }}>{log}</Text>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  button: { margin: 16 },
  logContainer: { flex: 1, marginTop: 8 },
});

export default DebugScreen;
