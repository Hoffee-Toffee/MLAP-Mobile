import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';

// We'll try to dynamically load a native MediaStore helper if available.
let MusicFiles: any = null;
try {
  MusicFiles = require('react-native-get-music-files');
} catch (e) {
  // Not installed - we'll fall back to scanning the filesystem via RNFS
  MusicFiles = null;
}

// Also try to load our native media scanner module if available
let NativeMediaScanner: any = null;
try {
  NativeMediaScanner = require('react-native').NativeModules.MediaScanner;
} catch (e) {
  NativeMediaScanner = null;
}

export type ScannedTrack = {
  id: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number; // milliseconds
  path?: string;
  picture?: string | null; // base64 or file path depending on platform
};

async function requestAndroidPermissions(): Promise<boolean> {
  try {
    if (Platform.OS !== 'android') return true;

    const sdkInt = Platform.Version as number;
    const permissions: any[] = [];

    // Android 13+ uses READ_MEDIA_AUDIO
    if (sdkInt >= 33) {
      permissions.push('android.permission.READ_MEDIA_AUDIO');
    } else {
      permissions.push(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE as string,
      );
    }

    const results = await PermissionsAndroid.requestMultiple(permissions);
    // consider granted if all are granted
    const allGranted = Object.values(results).every(
      v => v === PermissionsAndroid.RESULTS.GRANTED,
    );
    return allGranted;
  } catch (err) {
    console.warn('Permission request error', err);
    return false;
  }
}

export async function scanMusic(): Promise<ScannedTrack[]> {
  const ok = await requestAndroidPermissions();
  if (!ok) {
    console.warn('Storage permission not granted');
    return [];
  }

  // helper: compute and log unique parent directories from tracks
  function logUniqueDirs(tracks: ScannedTrack[], source: string) {
    try {
      const uniqueDirs = new Set<string>();
      for (const t of tracks) {
        if (!t.path) continue;
        const p = t.path.replace(/\\/g, '/');
        const lastSlash = p.lastIndexOf('/');
        const folder = lastSlash >= 0 ? p.slice(0, lastSlash) : p;
        uniqueDirs.add(folder || p);
      }
      const dirList = Array.from(uniqueDirs).sort();
      console.log(`scanMusic unique directories (${source}):`, dirList);
    } catch (e) {
      console.warn(
        `scanMusic: failed to compute unique directories for ${source}`,
        e,
      );
    }
  }

  // If native MediaStore helper is installed, prefer it (more metadata and duration)
  // Prefer our bundled native MediaScanner first
  if (NativeMediaScanner && typeof NativeMediaScanner.getAll === 'function') {
    try {
      const results = await NativeMediaScanner.getAll();
      const tracks: ScannedTrack[] = (results || []).map((t: any) => ({
        id: t.path?.toString() ?? t.id?.toString() ?? String(Math.random()),
        title: t.title,
        artist: t.artist,
        album: t.album,
        duration: t.duration,
        path: t.path,
      }));

      // dedupe
      const seen = new Set<string>();
      const unique: ScannedTrack[] = [];
      for (const tt of tracks) {
        const key = tt.path ?? `${tt.title ?? ''}-${tt.artist ?? ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(tt);
        }
      }

      console.log(
        `scanMusic (NativeMediaStore): found ${tracks.length} tracks, ${unique.length} unique`,
      );
      console.log('scanMusic sample:', unique.slice(0, 5));
      // log unique directories for NativeMediaScanner results
      logUniqueDirs(unique, 'NativeMediaStore');
      return unique;
    } catch (err) {
      console.warn('scanMusic (NativeMediaStore) error', err);
      // fall back to other methods
    }
  }

  if (MusicFiles && typeof MusicFiles.getAll === 'function') {
    try {
      const results = await MusicFiles.getAll({
        blured: false,
        artist: true,
        duration: true,
        cover: true,
        title: true,
        minimumSongDuration: 1000,
      });

      const tracks: ScannedTrack[] = (results || []).map((t: any) => ({
        // use combination of path/title as a more robust unique key when available
        id:
          t.path?.toString() ??
          t.id?.toString() ??
          t._id?.toString() ??
          String(Math.random()),
        title: t.title ?? t.displayName ?? t.filename,
        artist: t.author ?? t.artist,
        album: t.album,
        duration: t.duration ?? t.playableDuration ?? undefined,
        path: t.path ?? t.uri,
        picture: t.cover ?? t.picture ?? null,
      }));
      // dedupe by path or title+artist
      const seen = new Set<string>();
      const unique: ScannedTrack[] = [];
      for (const tt of tracks) {
        const key = tt.path ?? `${tt.title ?? ''}-${tt.artist ?? ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(tt);
        }
      }

      console.log(
        `scanMusic (MediaStore): found ${tracks.length} tracks, ${unique.length} unique`,
      );
      console.log('scanMusic sample:', unique.slice(0, 5));
      // log unique directories for MediaStore results
      logUniqueDirs(unique, 'MediaStore');
      return unique;
    } catch (err) {
      console.warn('scanMusic (MediaStore) error', err);
      // fall through to FS scan
    }
  }

  // Fallback: scan common filesystem music directories using RNFS
  try {
    const dirsToCheck: string[] = [];
    // Try to detect mounted storage points from /proc/mounts to find SD cards or other mounts
    try {
      const procPath = '/proc/mounts';
      const mounts: string[] = [];
      const existsProc = await RNFS.exists(procPath);
      if (existsProc) {
        const content = await RNFS.readFile(procPath, 'utf8');
        const lines = content.split('\n');
        for (const ln of lines) {
          if (!ln) continue;
          const parts = ln.split(' ');
          if (parts.length < 2) continue;
          const mountPoint = parts[1];
          const fsType = parts[2] ?? '';
          // common removable fs types
          if (fsType.match(/vfat|exfat|sdcardfs|fuse|ext4|fat32/i)) {
            if (
              !mountPoint.startsWith('/proc') &&
              !mountPoint.startsWith('/sys')
            ) {
              mounts.push(mountPoint);
            }
          }
        }
      }

      if (mounts.length > 0) {
        // We discovered mounts but to keep scanning fast/limited we do not
        // add arbitrary mounts here. We'll only scan the sdcard/storage
        // locations below.
        console.log(
          'scanMusic: discovered mounts from /proc/mounts (ignored)',
          mounts,
        );
      }
    } catch (e) {
      // ignore proc mounts parse errors
      console.warn('scanMusic: /proc/mounts parse failed', e);
    }

    if (Platform.OS === 'android') {
      // Only check common user storage areas (sdcard/storage) to avoid
      // probing system or vendor mounts.
      if (RNFS.ExternalStorageDirectoryPath) {
        dirsToCheck.push(RNFS.ExternalStorageDirectoryPath + '/Music');
        dirsToCheck.push(RNFS.ExternalStorageDirectoryPath + '/Download');
        dirsToCheck.push(RNFS.ExternalStorageDirectoryPath);
      }
      // Additional safe fallbacks
      dirsToCheck.push('/sdcard');
      dirsToCheck.push('/sdcard/Music');
      dirsToCheck.push('/sdcard/Download');
      dirsToCheck.push('/storage/emulated/0');
      dirsToCheck.push('/storage');
    } else if (Platform.OS === 'ios') {
      dirsToCheck.push(RNFS.DocumentDirectoryPath);
    }

    // Supported audio file extensions (see Android/ExoPlayer docs)
    const exts = [
      '.mp3','.m4a','.aac','.wav','.flac','.ogg','.opus',
      '.amr','.3gp','.mp4','.mid','.midi','.xmf','.mxmf',
      '.rtttl','.rtx','.ota','.imy',//'.wma','.aiff','.aif',
    ];
    const found: ScannedTrack[] = [];

    const visited = new Set<string>();
    // Paths to exclude (from user-provided mount list) -- treated as prefixes
    const excludedPathPrefixes: string[] = [
      '/mnt',
      '/metadata',
      '/prism',
      '/optics',
      '/apex',
      '/cache',
      '/efs',
      '/omr',
    ];
    async function scanDir(path: string) {
      console.log(`[scanMusic] Entering directory: ${path}`);
      try {
        // skip excluded mount prefixes
        for (const p of excludedPathPrefixes) {
          if (!p) continue;
          if (path === p || path.startsWith(p + '/') || path.startsWith(p)) {
            // logging for debug
            console.log(
              `scanMusic: skipping excluded path prefix ${p} for ${path}`,
            );
            return;
          }
        }

        if (visited.has(path)) return;
        visited.add(path);
        const exists = await RNFS.exists(path);
        if (!exists) return;
        const items = await RNFS.readDir(path);
        // log directory scan start
        console.log(
          `scanMusic: scanning dir ${path} (${items.length} entries)`,
        );
        for (const it of items) {
          if (it.isFile() && it.name.toLowerCase().endsWith('.opus')) {
            console.log(`[scanMusic] Found .opus file: ${it.path}`);
          }
          if (it.path && it.path.includes('Download')) {
            console.log(`[scanMusic] Found file in Download: ${it.path}`);
          }
          // skip hidden files/folders (names starting with a dot)
          if (it.name && it.name.startsWith('.')) continue;
          // skip paths with hidden segments like /foo/.bar/
          if (it.path && it.path.split('/').some(seg => seg.startsWith('.')))
            continue;

          if (it.isFile()) {
            const lower = it.name.toLowerCase();
            if (exts.some(e => lower.endsWith(e))) {
              // skip files that lie under excluded prefixes too
              let skip = false;
              for (const p of excludedPathPrefixes) {
                if (!p) continue;
                if (
                  it.path === p ||
                  it.path.startsWith(p + '/') ||
                  it.path.startsWith(p)
                ) {
                  skip = true;
                  break;
                }
              }
              if (skip) continue;

              found.push({
                id: it.path,
                title: it.name,
                path: it.path,
              });
            }
          } else if (it.isDirectory()) {
            // quick recursion but avoid very deep recursion into system dirs
            // skip obvious large or protected folders
            const skipNames = [
              'Android',
              'obb',
              'cache',
              'System Volume Information',
            ];
            if (skipNames.some(n => it.name.includes(n))) continue;
            await scanDir(it.path);
          }
        }
      } catch (e) {
        console.warn(`[scanMusic] Failed to read dir ${path}:`, e);
      }
    }

    for (const d of dirsToCheck) {
      await scanDir(d);
    }

    // dedupe FS results by path
    const seenFs = new Set<string>();
    const uniqueFs: ScannedTrack[] = [];
    for (const f of found) {
      const key = f.path ?? f.title ?? f.id;
      if (!seenFs.has(key)) {
        seenFs.add(key);
        uniqueFs.push(f);
      }
    }

    console.log(
      `scanMusic (FS): found ${found.length} files, ${uniqueFs.length} unique`,
    );
    console.log('scanMusic sample (FS):', uniqueFs.slice(0, 5));
    // Log unique parent directories for FS results
    logUniqueDirs(uniqueFs, 'FS');
    return uniqueFs;
  } catch (err) {
    console.warn('scanMusic (FS) error', err);
    return [];
  }
}
