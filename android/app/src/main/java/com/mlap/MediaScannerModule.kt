package com.mlap

import android.database.Cursor
import android.provider.MediaStore
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap

class MediaScannerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return "MediaScanner"
  }

  @ReactMethod
  fun getAll(promise: Promise) {
    try {
      val resolver = reactApplicationContext.contentResolver
      val uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
      val projection = arrayOf(
        MediaStore.Audio.Media._ID,
        MediaStore.Audio.Media.TITLE,
        MediaStore.Audio.Media.ARTIST,
        MediaStore.Audio.Media.ALBUM,
        MediaStore.Audio.Media.DURATION,
        MediaStore.Audio.Media.DATA
      )

      val cursor: Cursor? = resolver.query(uri, projection, null, null, null)
      val arr = WritableNativeArray()
      cursor?.use {
        val idIdx = it.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
        val titleIdx = it.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
        val artistIdx = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
        val albumIdx = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
        val durationIdx = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
        val dataIdx = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)

        while (it.moveToNext()) {
          val map = WritableNativeMap()
          map.putString("id", it.getString(idIdx))
          map.putString("title", it.getString(titleIdx))
          map.putString("artist", it.getString(artistIdx))
          map.putString("album", it.getString(albumIdx))
          map.putInt("duration", it.getInt(durationIdx))
          map.putString("path", it.getString(dataIdx))
          arr.pushMap(map)
        }
      }

      promise.resolve(arr)
    } catch (e: Exception) {
      promise.reject("ERR_MEDIA_SCAN", e.message)
    }
  }
}
