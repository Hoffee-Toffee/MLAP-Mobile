
package com.mlap;

import android.net.Uri;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.google.android.exoplayer2.*;
import com.google.android.exoplayer2.source.*;
import com.google.android.exoplayer2.upstream.*;
import com.google.android.exoplayer2.util.*;

public class ExoPlayerModule extends ReactContextBaseJavaModule {
    private SimpleExoPlayer player;
    private ReactApplicationContext reactContext;

    public ExoPlayerModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @NonNull
    @Override
    public String getName() {
        return "ExoPlayerModule";
    }

    @ReactMethod
    public void play(String url) {
        if (player != null) {
            player.release();
        }
        player = new SimpleExoPlayer.Builder(reactContext).build();
        MediaItem mediaItem = MediaItem.fromUri(Uri.parse(url));
        player.setMediaItem(mediaItem);
        player.prepare();
        player.play();

        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int state) {
                WritableMap params = Arguments.createMap();
                if (state == Player.STATE_ENDED) {
                    params.putString("event", "ended");
                    sendEvent("onPlaybackEvent", params);
                } else if (state == Player.STATE_READY) {
                    params.putString("event", "ready");
                    sendEvent("onPlaybackEvent", params);
                }
            }
            @Override
            public void onPlayerError(@NonNull PlaybackException error) {
                WritableMap params = Arguments.createMap();
                params.putString("event", "error");
                params.putString("message", error.getMessage());
                sendEvent("onPlaybackEvent", params);
            }
        });
    }

    @ReactMethod
    public void pause() {
        if (player != null) player.pause();
    }

    @ReactMethod
    public void resume() {
        if (player != null) player.play();
    }

    @ReactMethod
    public void stop() {
        if (player != null) {
            player.stop();
            player.release();
            player = null;
        }
    }

    @ReactMethod
    public void seekTo(double ms) {
        if (player != null) player.seekTo((long) ms);
    }

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }
}
