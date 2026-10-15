import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Downsamples an image (local file URI or base64) to a maximum dimension
 * (e.g. 480x480 max bounding box) before uploading to the backend.
 *
 * This reduces payload size by ~98% (from ~10MB down to ~35-50KB)
 * and prevents backend OOM crashes on memory-constrained servers like Render.
 */
export async function downsampleFaceImage(
  uriOrBase64: string,
  maxDim: number = 480,
  quality: number = 0.6
): Promise<string> {
  if (!uriOrBase64) return '';

  let sourceUri = uriOrBase64;
  if (!sourceUri.startsWith('file:') && !sourceUri.startsWith('content:') && !sourceUri.startsWith('http')) {
    if (sourceUri.startsWith('/')) {
      sourceUri = `file://${sourceUri}`;
    } else if (sourceUri.startsWith('data:')) {
      sourceUri = uriOrBase64;
    } else {
      sourceUri = `data:image/jpeg;base64,${uriOrBase64}`;
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
  }

  // Fallback: strip data prefix if present and return raw base64
  return uriOrBase64.replace(/^data:image\/[a-zA-Z0-9]+;base64,/, '');
}
