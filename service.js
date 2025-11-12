/*
  Minimal TrackPlayer service to wire remote controls.
  This file is required by TrackPlayer.registerPlaybackService in index.js.
*/
import TrackPlayer, { Event } from 'react-native-track-player';

export default async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.destroy());
  TrackPlayer.addEventListener(Event.RemoteNext, () =>
    TrackPlayer.skipToNext().catch(() => {}),
  );
  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    TrackPlayer.skipToPrevious().catch(() => {}),
  );
}
