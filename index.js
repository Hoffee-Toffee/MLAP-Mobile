/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

// Register TrackPlayer playback service (optional; ensures background controls work when installed)
import TrackPlayer from 'react-native-track-player';
TrackPlayer.registerPlaybackService(() => require('./service').default);
