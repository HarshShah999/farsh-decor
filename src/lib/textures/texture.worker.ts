/// <reference lib="webworker" />
import { generate, type GenParams, type GeneratorId } from './generators';

interface Req {
  id: number;
  generator: GeneratorId;
  params: GenParams;
  size: number;
  seed: number;
}

const env = {
  createCanvas: (w: number, h: number) => new OffscreenCanvas(w, h),
};

self.onmessage = (e: MessageEvent<Req>) => {
  const { id, generator, params, size, seed } = e.data;
  try {
    const r = generate(generator, params, size, seed, env);
    (self as unknown as Worker).postMessage({ id, size, albedo: r.albedo, height: r.height }, [
      r.albedo.buffer,
      r.height.buffer,
    ]);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) });
  }
};
