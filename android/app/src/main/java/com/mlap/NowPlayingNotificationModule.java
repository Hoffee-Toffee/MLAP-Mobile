package com.mlap;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import androidx.core.app.NotificationCompat;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.Promise;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import android.util.Log;

public class NowPlayingNotificationModule extends ReactContextBaseJavaModule {
    // Required for NativeEventEmitter compatibility
    @ReactMethod
    public void addListener(String eventName) {
        // No-op: Required for RN built-in Event Emitter
    }

    @ReactMethod
    public void removeListeners(double count) {
        // No-op: Required for RN built-in Event Emitter
    }
    private static final String CHANNEL_ID = "now_playing_channel";
    private static final int NOTIFICATION_ID = 1002;
    private final ReactApplicationContext reactContext;
    private NotificationManager notificationManager;
    private BroadcastReceiver actionReceiver;

    public NowPlayingNotificationModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        registerInternalReceiver();
    }

    private void registerInternalReceiver() {
        if (actionReceiver != null) return;
        actionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                int notificationId = intent.getIntExtra("notificationId", -1);
                Log.d("NowPlayingNotif", "Received action: " + action + ", notificationId=" + notificationId);
                String jsAction = null;
                if (action == null) return;
                if (action.equals("com.mlap.NP_PREV")) jsAction = "previous";
                else if (action.equals("com.mlap.NP_PLAY_PAUSE")) jsAction = "playpause";
                else if (action.equals("com.mlap.NP_NEXT")) jsAction = "next";
                if (jsAction != null && notificationId != -1) {
                    // Emit as an object: { action, notificationId }
                    android.os.Bundle bundle = new android.os.Bundle();
                    bundle.putString("action", jsAction);
                    bundle.putInt("notificationId", notificationId);
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit("NowPlayingNotification", bundleToWritableMap(bundle));
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction("com.mlap.NP_PREV");
        filter.addAction("com.mlap.NP_PLAY_PAUSE");
        filter.addAction("com.mlap.NP_NEXT");
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(actionReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            reactContext.registerReceiver(actionReceiver, filter);
        }
    }

    // Helper to convert Bundle to WritableMap
    private com.facebook.react.bridge.WritableMap bundleToWritableMap(android.os.Bundle bundle) {
        com.facebook.react.bridge.WritableMap map = new com.facebook.react.bridge.WritableNativeMap();
        for (String key : bundle.keySet()) {
            Object value = bundle.get(key);
            if (value instanceof String) {
                map.putString(key, (String) value);
            } else if (value instanceof Integer) {
                map.putInt(key, (Integer) value);
            }
        }
        return map;
    }

    @Override
    public String getName() {
        return "NowPlayingNotification";
    }

    @ReactMethod
    public void showNotification(ReadableMap track, boolean isPlaying, int notificationId, Promise promise) {
        try {
            String title = track.hasKey("title") ? track.getString("title") : "Unknown Title";
            String artist = track.hasKey("artist") ? track.getString("artist") : "Unknown Artist";
            String artworkPath = track.hasKey("artwork") ? track.getString("artwork") : null;
            Log.d("NowPlayingNotif", "showNotification called: title=" + title + ", artist=" + artist + ", isPlaying=" + isPlaying + ", artworkPath=" + artworkPath + ", notificationId=" + notificationId);
            Bitmap artwork = null;
            if (artworkPath != null && artworkPath.length() > 0) {
                artwork = BitmapFactory.decodeFile(artworkPath);
            }
            if (artwork == null) {
                artwork = BitmapFactory.decodeResource(reactContext.getResources(), reactContext.getApplicationInfo().icon);
            }
            createNotificationChannel();


            Intent prevIntent = new Intent("com.mlap.NP_PREV");
            prevIntent.putExtra("notificationId", notificationId);
            Intent playPauseIntent = new Intent("com.mlap.NP_PLAY_PAUSE");
            playPauseIntent.putExtra("notificationId", notificationId);
            Intent nextIntent = new Intent("com.mlap.NP_NEXT");
            nextIntent.putExtra("notificationId", notificationId);
            PendingIntent prevPending = PendingIntent.getBroadcast(reactContext, notificationId * 10 + 0, prevIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            PendingIntent playPausePending = PendingIntent.getBroadcast(reactContext, notificationId * 10 + 1, playPauseIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            PendingIntent nextPending = PendingIntent.getBroadcast(reactContext, notificationId * 10 + 2, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(reactContext, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(artist)
                .setSmallIcon(reactContext.getApplicationInfo().icon)
                .setLargeIcon(artwork)
                .addAction(android.R.drawable.ic_media_previous, "Prev", prevPending)
                .addAction(isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play, isPlaying ? "Pause" : "Play", playPausePending)
                .addAction(android.R.drawable.ic_media_next, "Next", nextPending)
                .setOngoing(isPlaying)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOnlyAlertOnce(true)
                .setStyle(new androidx.media.app.NotificationCompat.MediaStyle());

            Log.d("NowPlayingNotif", "Notifying notificationManager with id=" + notificationId);
            notificationManager.notify(notificationId, builder.build());
            promise.resolve(true);
        } catch (Exception e) {
            Log.e("NowPlayingNotif", "Error in showNotification", e);
            promise.reject("notification_error", e);
        }
    }

    private void createNotificationChannel() {
        // Create the notification channel if needed (Android O+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            String name = "Now Playing";
            String description = "Now playing music controls";
            int importance = NotificationManager.IMPORTANCE_LOW;
            android.app.NotificationChannel channel = new android.app.NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            NotificationManager manager = (NotificationManager) reactContext.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    // Removed old receiver logic. Notification actions should be routed per-queue via notificationId in JS.

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        if (actionReceiver != null) {
            reactContext.unregisterReceiver(actionReceiver);
            actionReceiver = null;
        }
    }
}
