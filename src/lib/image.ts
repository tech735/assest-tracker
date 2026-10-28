/**
 * Shrinks a photo so its longest side is at most `max` px and re-encodes it (WebP, or JPEG where the
 * browser can't write WebP). Phone photos drop from several MB to ~100 KB, so cards load fast.
 */
export async function shrinkImage(file: File, max = 800): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // e.g. HEIC from an iPhone in Chrome
    throw new Error('This image format can’t be read here. Use a JPG, PNG or WebP photo.');
  }
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Couldn’t process the image.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await encode('image/webp');
  // Safari before 17 falls back to PNG for unsupported types; JPEG keeps it small.
  const blob = webp && webp.type === 'image/webp' ? webp : await encode('image/jpeg');
  if (!blob) throw new Error('Couldn’t process the image.');
  return blob;
}

/** "Dell  Latitude 5440" → "dell latitude 5440" — must match model_photos.model_key in the database. */
export const modelKey = (brand?: string, model?: string) => `${brand || ''} ${model || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
