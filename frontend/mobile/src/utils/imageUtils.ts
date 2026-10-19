import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Downsamples an image (local file URI or base64) to a maximum dimension
 * (e.g. 480x480 max bounding box) before uploading to the backend.
 *
 * This reduces payload size by ~98% (from ~10MB down to ~35-50KB)
 * and prevents backend OOM crashes on memory-constrained servers like Render.
 *
 * FIX: expo-image-manipulator cannot process data: URIs — it only accepts
 * real file:// filesystem paths. Raw base64 strings are now written to a
 * temporary file before being passed to manipulateAsync, which eliminates
 * the "Context.renderAsync has been rejected" crash.
 */
export async function downsampleFaceImage(
  uriOrBase64: string,
  maxDim: number = 480,
  quality: number = 0.6
): Promise<string> {
  if (!uriOrBase64) return '';

  let sourceUri = uriOrBase64;
  let tempFilePath: string | null = null;

  // Determine if this is already a usable URI or needs to be written to disk
  if (
    sourceUri.startsWith('file://') ||
    sourceUri.startsWith('content://') ||
    sourceUri.startsWith('http://') ||
    sourceUri.startsWith('https://')
  ) {
    // Already a real URI — manipulateAsync can handle these directly
  } else {
    // It's raw base64 (with or without data: prefix).
    // manipulateAsync CANNOT process data: URIs — write to a temp file first.
    const rawB64 = sourceUri.startsWith('data:')
      ? sourceUri.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '')
      : sourceUri;

    tempFilePath = `${FileSystem.cacheDirectory ?? ''}face_tmp_${Date.now()}.jpg`;
    try {
      await FileSystem.writeAsStringAsync(tempFilePath, rawB64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      sourceUri = tempFilePath;
    } catch (writeErr) {
      console.warn('[ImageUtils] Could not write temp file, returning capped base64:', writeErr);
      // Hard cap to ~150KB to prevent OOM — never return the full multi-MB blob
      return rawB64.substring(0, 200000);
    }
  }

  try {
    const result = await manipulateAsync(
      sourceUri,
      [{ resize: { width: maxDim } }],
      {
        compress: quality,
        format: SaveFormat.JPEG,
        base64: true,
      }
    );

    if (result.base64) {
      return result.base64;
    }
  } catch (error) {
    console.warn('[ImageUtils] Image downsampling failed, falling back:', error);
  } finally {
    // Always clean up the temp file we wrote to avoid accumulating disk usage
    if (tempFilePath) {
      FileSystem.deleteAsync(tempFilePath, { idempotent: true }).catch(() => undefined);
    }
  }

  // Fallback: strip data prefix if present and return raw base64, but hard-cap size
  const fallbackB64 = uriOrBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
  return fallbackB64.substring(0, 200000);
}
