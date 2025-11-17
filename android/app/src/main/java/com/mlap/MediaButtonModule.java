package com.mlap;
import android.content.BroadcastReceiver;
import android.util.Log;
import android.media.AudioManager;
import android.media.session.MediaSession;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.Handler;
import android.os.Looper;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.view.KeyEvent;
import android.os.Build;
import androidx.core.content.ContextCompat;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class MediaButtonModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private BroadcastReceiver mediaButtonReceiver;
    private MediaSession mediaSession;

    public MediaButtonModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        Log.d("MediaButtonModule", "MediaButtonModule instantiated and used");
        registerMediaButtonReceiver();
    }

    @NonNull
    @Override
    public String getName() {
        return "MediaButton";
    }

    private void registerMediaButtonReceiver() {
    mediaButtonReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Log.d("MediaButtonModule", "onReceive called: " + intent);
                if (Intent.ACTION_MEDIA_BUTTON.equals(intent.getAction())) {
                    Log.d("MediaButtonModule", "MEDIA_BUTTON intent received");
                    KeyEvent event = intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
                    if (event != null) {
                        Log.d("MediaButtonModule", "KeyEvent: action=" + event.getAction() + ", code=" + event.getKeyCode());
                    }
                    if (event != null && event.getAction() == KeyEvent.ACTION_DOWN) {
                        int keyCode = event.getKeyCode();
                        String action = null;
                        switch (keyCode) {
                            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                                action = "playpause";
                                break;
                            case KeyEvent.KEYCODE_MEDIA_PLAY:
                                action = "play";
                                break;
                            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                                action = "pause";
                                break;
                            case KeyEvent.KEYCODE_MEDIA_NEXT:
                                action = "next";
                                break;
                            case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
                                action = "previous";
                                break;
                        }
                        if (action != null) {
                            Log.d("MediaButtonModule", "Sending JS event: " + action);
                            sendEvent(action);
                        }
                    }
                }
            }
        };
        IntentFilter filter = new IntentFilter(Intent.ACTION_MEDIA_BUTTON);
        filter.setPriority(IntentFilter.SYSTEM_HIGH_PRIORITY);
        if (Build.VERSION.SDK_INT >= 33) {
            ContextCompat.registerReceiver(
                reactContext,
                mediaButtonReceiver,
                filter,
                ContextCompat.RECEIVER_NOT_EXPORTED
            );
        } else {
            reactContext.registerReceiver(mediaButtonReceiver, filter);
        }

        // Register with AudioManager to receive media button events
        try {
            AudioManager audioManager = (AudioManager) reactContext.getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                audioManager.registerMediaButtonEventReceiver(
                    new android.content.ComponentName(reactContext, com.mlap.MediaButtonReceiver.class)
                );
                Log.d("MediaButtonModule", "Registered with AudioManager for media button events");

                // Request audio focus to ensure we receive media button events
                int result = audioManager.requestAudioFocus(
                    new AudioManager.OnAudioFocusChangeListener() {
                        @Override
                        public void onAudioFocusChange(int focusChange) {
                            Log.d("MediaButtonModule", "Audio focus changed: " + focusChange);
                        }
                    },
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN
                );
                if (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                    Log.d("MediaButtonModule", "Audio focus granted");
                } else {
                    Log.w("MediaButtonModule", "Audio focus NOT granted");
                }

                // Create and activate a MediaSession to receive media button events on the main thread
                try {
                    Handler mainHandler = new Handler(Looper.getMainLooper());
                    mainHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                mediaSession = new MediaSession(reactContext, "MLAPMediaSession");
                                mediaSession.setCallback(new MediaSession.Callback() {
                                    @Override
                                    public boolean onMediaButtonEvent(Intent mediaButtonIntent) {
                                        Log.d("MediaButtonModule", "MediaSession onMediaButtonEvent: " + mediaButtonIntent);
                                        if (mediaButtonIntent != null && Intent.ACTION_MEDIA_BUTTON.equals(mediaButtonIntent.getAction())) {
                                            KeyEvent event = mediaButtonIntent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
                                            if (event != null) {
                                                Log.d("MediaButtonModule", "MediaSession KeyEvent: action=" + event.getAction() + ", code=" + event.getKeyCode());
                                                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                                                    int keyCode = event.getKeyCode();
                                                    String action = null;
                                                    switch (keyCode) {
                                                        case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                                                            action = "playpause";
                                                            break;
                                                        case KeyEvent.KEYCODE_HEADSETHOOK:
                                                            action = "playpause";
                                                            break;
                                                        case KeyEvent.KEYCODE_MEDIA_PLAY:
                                                            action = "play";
                                                            break;
                                                        case KeyEvent.KEYCODE_MEDIA_PAUSE:
                                                            action = "pause";
                                                            break;
                                                        case KeyEvent.KEYCODE_MEDIA_NEXT:
                                                            action = "next";
                                                            break;
                                                        case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
                                                            action = "previous";
                                                            break;
                                                        default:
                                                            Log.d("MediaButtonModule", "MediaSession unknown keyCode: " + keyCode);
                                                            break;
                                                    }
                                                    Log.d("MediaButtonModule", "MediaSession action variable: " + action);
                                                    if (action != null) {
                                                        Log.d("MediaButtonModule", "MediaSession sending JS event: " + action);
                                                        sendEvent(action);
                                                    }
                                                }
                                            } else {
                                                Log.d("MediaButtonModule", "MediaSession KeyEvent: null");
                                            }
                                        }
                                        return super.onMediaButtonEvent(mediaButtonIntent);
                                    }
                                });
                                mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
                                PlaybackState state = new PlaybackState.Builder()
                                    .setActions(
                                        PlaybackState.ACTION_PLAY |
                                        PlaybackState.ACTION_PAUSE |
                                        PlaybackState.ACTION_PLAY_PAUSE |
                                        PlaybackState.ACTION_SKIP_TO_NEXT |
                                        PlaybackState.ACTION_SKIP_TO_PREVIOUS
                                    )
                                    .setState(PlaybackState.STATE_PLAYING, 0, 1.0f)
                                    .build();
                                mediaSession.setPlaybackState(state);
                                mediaSession.setActive(true);
                                Log.d("MediaButtonModule", "MediaSession created and activated");
                            } catch (Exception e) {
                                Log.e("MediaButtonModule", "Failed to create/activate MediaSession (main thread)", e);
                            }
                        }
                    });
                } catch (Exception e) {
                    Log.e("MediaButtonModule", "Failed to post MediaSession creation to main thread", e);
                }
            } else {
                Log.w("MediaButtonModule", "AudioManager is null, cannot register media button event receiver");
            }
        } catch (Exception e) {
            Log.e("MediaButtonModule", "Failed to register with AudioManager", e);
        }
    }

    private void sendEvent(String action) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("MediaButton", action);
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        if (mediaButtonReceiver != null) {
            reactContext.unregisterReceiver(mediaButtonReceiver);
            mediaButtonReceiver = null;
        }

        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
            Log.d("MediaButtonModule", "MediaSession released");
        }
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Required for RN built-in Event Emitter
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        // Required for RN built-in Event Emitter
    }
}
