package com.mlap;

import android.content.BroadcastReceiver;
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

    public MediaButtonModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
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
                if (Intent.ACTION_MEDIA_BUTTON.equals(intent.getAction())) {
                    KeyEvent event = intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
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
    }
}
