// Lets the person choose a photo from their computer and makes it small.
//
// Photos are saved INSIDE the database document (as text), because Firebase's file
// storage needs a paid plan. A database document can hold at most 1 MB, so every photo
// is shrunk to at most 900 pixels wide/tall and saved as a compressed JPEG (about 100 KB).
// This only works in the browser, which is where the app runs.

const MAX_SIDE = 900;
const MAX_LENGTH = 300_000; // characters of the final text (about 220 KB of picture)

export type PickResult = { ok: true; photo: string } | { ok: false; reason: 'cancelled' | 'not-image' | 'too-big' | 'unsupported' };

function chooseFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function loadImage(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

export async function pickPhoto(): Promise<PickResult> {
  if (typeof document === 'undefined') return { ok: false, reason: 'unsupported' };
  const file = await chooseFile();
  if (!file) return { ok: false, reason: 'cancelled' };
  if (!file.type.startsWith('image/')) return { ok: false, reason: 'not-image' };
  const image = await loadImage(file);
  if (!image) return { ok: false, reason: 'not-image' };

  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return { ok: false, reason: 'unsupported' };
  context.fillStyle = '#ffffff'; // see-through pictures get a white background
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  // Try good quality first, then lower it until the photo is small enough.
  for (const quality of [0.75, 0.6, 0.45, 0.3]) {
    const photo = canvas.toDataURL('image/jpeg', quality);
    if (photo.length <= MAX_LENGTH) return { ok: true, photo };
  }
  return { ok: false, reason: 'too-big' };
}
