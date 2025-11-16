package com.mlap;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.view.KeyEvent;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;

public class MediaButtonReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_MEDIA_BUTTON.equals(intent.getAction())) {
            KeyEvent event = intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
            if (event != null && event.getAction() == KeyEvent.ACTION_DOWN) {
                ReactApplication reactApp = (ReactApplication) context.getApplicationContext();
                ReactInstanceManager manager = reactApp.getReactNativeHost().getReactInstanceManager();
                ReactContext reactContext = manager.getCurrentReactContext();
                if (reactContext != null) {
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
                        reactContext
                            .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("MediaButton", action);
                    }
                }
            }
        }
    }
}
