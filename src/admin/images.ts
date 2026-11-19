/**
 * Browser-side photo preparation before upload: validates the file, fixes
 * orientation, resizes and compresses, so uploads are fast and pages stay light.
 */

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_INPUT_BYTES = 30 * 1024 * 1024;

export class ImageError extends Error {}

export function validateImageFile(file: File) {
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name))
    throw new ImageError(
      'iPhone HEIC photos are not supported by browsers. On the iPhone choose “Most Compatible” in Settings → Camera → Formats, or export the photo as JPG.',
    );
  if (!ACCEPTED.includes(file.type)) throw new ImageError('Please choose a JPG, PNG or WEBP image.');
  if (file.size > MAX_INPUT_BYTES) throw new ImageError('That file is very large (over 30 MB). Please choose a smaller photo.');
}

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageError('This image could not be read. It may be damaged; please try another file.');
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new ImageError('Could not process the image.'))), type, quality),
  );
}

async function encode(canvas: HTMLCanvasElement, preferWebp: boolean) {
  if (preferWebp) {
    const webp = await toBlob(canvas, 'image/webp', 0.86);
    if (webp.type === 'image/webp') return { blob: webp, ext: 'webp', type: 'image/webp' };
  }
  const jpg = await toBlob(canvas, 'image/jpeg', 0.88);
  return { blob: jpg, ext: 'jpg', type: 'image/jpeg' };
}

export interface PreparedImage {
  blob: Blob;
  ext: string;
  type: string;
  width: number;
  height: number;
}

/** A display photo: longest side at most `maxSide`, keeps proportions. */
export async function preparePhoto(file: File, maxSide = 1600): Promise<PreparedImage> {
  validateImageFile(file);
  const bmp = await decode(file);
  if (bmp.width < 200 || bmp.height < 200) throw new ImageError('This image is too small. Please use a photo at least 200 × 200 pixels.');
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k);
  const h = Math.round(bmp.height * k);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return { ...(await encode(c, true)), width: w, height: h };
}

/**
 * A material texture for the visualizers: a centred square crop, `size` px.
 * Saved as JPEG for the widest WebGL compatibility.
 */
export async function prepareTexture(file: File, size = 1024): Promise<PreparedImage> {
  validateImageFile(file);
  const bmp = await decode(file);
  const side = Math.min(bmp.width, bmp.height);
  if (side < 128) throw new ImageError('This texture image is too small. Please use one at least 512 × 512 pixels.');
  const out = Math.min(size, side);
  const c = document.createElement('canvas');
  c.width = out;
  c.height = out;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out);
  bmp.close();
  return { ...(await encode(c, false)), width: out, height: out };
}
