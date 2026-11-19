/** Imperative bridge between the R3F canvas and the surrounding React UI. */
export const viewer: {
  capture: ((mime?: string, quality?: number) => string) | null;
  resetView: (() => void) | null;
  invalidate: (() => void) | null;
} = { capture: null, resetView: null, invalidate: null };

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export const nextFrames = (n = 2) =>
  new Promise<void>((resolve) => {
    const step = (k: number) => (k <= 0 ? resolve() : requestAnimationFrame(() => step(k - 1)));
    viewer.invalidate?.();
    step(n);
  });
