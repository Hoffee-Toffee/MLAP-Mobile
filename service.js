/*
  Minimal TrackPlayer service to wire remote controls.
  This file is required by TrackPlayer.registerPlaybackService in index.js.
*/

// Import TrackPlayer and Event using require
let TrackPlayer, Event;
try {
  TrackPlayer = require('react-native-track-player').default;
  Event = require('react-native-track-player').Event;
} catch (e) {
  TrackPlayer = null;
  Event = {};
}

// Import a global handler for pausing/resuming all queues
let pauseAllQueues = null;
let resumeAllQueues = null;
try {
  // This file is loaded in a Node-like context, so require is available
  const playerControl = require('./src/context/PerQueuePlayerContext');
  pauseAllQueues = playerControl.pauseAllQueues;
  resumeAllQueues = playerControl.resumeAllQueues;
} catch (e) {
  // Defensive: fallback to no-op if not available
  pauseAllQueues = null;
  resumeAllQueues = null;
}

export default async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    if (typeof resumeAllQueues === 'function') {
      resumeAllQueues();
    }
  });
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    if (typeof pauseAllQueues === 'function') {
      pauseAllQueues();
    }
  });
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.destroy());
  TrackPlayer.addEventListener(Event.RemoteNext, () =>
    TrackPlayer.skipToNext().catch(() => {}),
  );
  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    TrackPlayer.skipToPrevious().catch(() => {}),
  );
}
