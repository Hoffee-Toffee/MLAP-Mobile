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
      val uri = MediaStore.Files.getContentUri("external")
      val projection = arrayOf(
        MediaStore.Files.FileColumns._ID,
        MediaStore.Files.FileColumns.TITLE,
        MediaStore.Files.FileColumns.MIME_TYPE,
        MediaStore.Files.FileColumns.DATA,
        MediaStore.Files.FileColumns.DURATION,
        MediaStore.Files.FileColumns.ARTIST,
        MediaStore.Files.FileColumns.ALBUM
      )

      // List of supported audio file extensions (must match JS)
      val exts = listOf(
        ".mp3", ".m4a", ".aac", ".wav", ".flac", ".ogg", ".opus", ".amr", ".3gp", ".mp4",
        // ".wma", // (only some Android devices)
        ".mid", ".midi", ".xmf", ".mxmf", ".rtttl", ".rtx", ".ota", ".imy"
        // ".aiff", ".aif" // (only some devices)
      )

      // Build selection string to match audio MIME types or extensions
      val audioMimeTypes = listOf(
        "audio/mpeg", "audio/mp4", "audio/aac", "audio/x-wav", "audio/wav", "audio/flac", "audio/x-flac",
        "audio/ogg", "audio/opus", "audio/amr", "audio/3gpp", "audio/mp4a-latm", "audio/x-ms-wma",
        "audio/midi", "audio/x-midi", "audio/xmf", "audio/imelody"
      )
      val mimeSelection = audioMimeTypes.joinToString(" OR ") { "${MediaStore.Files.FileColumns.MIME_TYPE}='" + it + "'" }
      val extSelection = exts.joinToString(" OR ") { "${MediaStore.Files.FileColumns.DATA} LIKE '%" + it + "'" }
      val selection = "($mimeSelection) OR ($extSelection)"

      val cursor: Cursor? = resolver.query(uri, projection, selection, null, null)
      val arr = WritableNativeArray()
      cursor?.use {
        val idIdx = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID)
        val titleIdx = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns.TITLE)
        val mimeIdx = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MIME_TYPE)
        val dataIdx = it.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DATA)
        val durationIdx = if (it.getColumnIndex(MediaStore.Files.FileColumns.DURATION) >= 0) it.getColumnIndex(MediaStore.Files.FileColumns.DURATION) else -1
        val artistIdx = if (it.getColumnIndex(MediaStore.Files.FileColumns.ARTIST) >= 0) it.getColumnIndex(MediaStore.Files.FileColumns.ARTIST) else -1
        val albumIdx = if (it.getColumnIndex(MediaStore.Files.FileColumns.ALBUM) >= 0) it.getColumnIndex(MediaStore.Files.FileColumns.ALBUM) else -1

        while (it.moveToNext()) {
          val path = it.getString(dataIdx)
          // Only include files in Download, Music, or Documents folders
          if (path != null && (path.contains("Download") || path.contains("Music") || path.contains("Documents"))) {
            val map = WritableNativeMap()
            map.putString("id", it.getString(idIdx))
            map.putString("title", it.getString(titleIdx))
            map.putString("artist", if (artistIdx >= 0) it.getString(artistIdx) else null)
            map.putString("album", if (albumIdx >= 0) it.getString(albumIdx) else null)
            if (durationIdx >= 0) map.putInt("duration", it.getInt(durationIdx))
            map.putString("path", path)
            map.putString("mimeType", it.getString(mimeIdx))
            arr.pushMap(map)
          }
        }
      }

      // Explicitly scan the Downloads folder for supported extensions if not already found
      val foundPaths = mutableSetOf<String>()
      for (i in 0 until arr.size()) {
        val map = arr.getMap(i)
        if (map != null && map.hasKey("path")) {
          val path = map.getString("path")
          if (path != null) foundPaths.add(path)
        }
      }

      val downloadsPath = "/storage/emulated/0/Download"
      val downloadsDir = java.io.File(downloadsPath)
      if (downloadsDir.exists() && downloadsDir.isDirectory) {
        val files = downloadsDir.listFiles()
        if (files != null) {
          for (file in files) {
            val path = file.absolutePath
            if (!foundPaths.contains(path) && exts.any { path.lowercase().endsWith(it) }) {
              val map = WritableNativeMap()
              map.putString("id", path)
              map.putString("title", file.name)
              map.putString("artist", null)
              map.putString("album", null)
              map.putInt("duration", 0)
              map.putString("path", path)
              map.putString("mimeType", null)
              arr.pushMap(map)
            }
          }
        }
      }

      promise.resolve(arr)
    } catch (e: Exception) {
      promise.reject("ERR_MEDIA_SCAN", e.message)
    }
  }
}
