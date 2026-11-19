import * as THREE from 'three';

export const ROOM = { W: 6, D: 5, H: 2.9 } as const;

export interface Hole {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * A wall plane built from a Shape so it can contain openings.
 * Origin: bottom-centre. UVs are in METRES, so textures tile at true scale.
 */
export function wallGeometry(width: number, height: number, holes: Hole[] = []) {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(width / 2, height);
  s.lineTo(-width / 2, height);
  s.closePath();
  for (const h of holes) {
    const p = new THREE.Path();
    p.moveTo(h.x0, h.y0);
    p.lineTo(h.x0, h.y1);
    p.lineTo(h.x1, h.y1);
    p.lineTo(h.x1, h.y0);
    p.closePath();
    s.holes.push(p);
  }
  return new THREE.ShapeGeometry(s, 4);
}

/** Horizontal plane with metre-based UVs (for floors / terrace). */
export function floorGeometry(w: number, d: number) {
  const g = new THREE.PlaneGeometry(w, d, 1, 1);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Box with metre-based UVs on every face. */
export function boxGeometryMeters(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // face order: +x, -x, +y, -y, +z, -z ; 4 vertices each
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
    }
  }
  return g;
}

/**
 * Pleated curtain panel. Width along local X, hanging down local Y from 0 to -height.
 * Folds are displaced along Z. UVs in metres of FLAT fabric (accounting for fullness).
 */
export function curtainGeometry(width: number, height: number, folds: number, depth: number, fullness = 1.8) {
  const segX = Math.max(24, folds * 10);
  const g = new THREE.PlaneGeometry(width, height, segX, 12);
  g.translate(0, -height / 2, 0);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = (x + width / 2) / width;
    const t = -y / height; // 0 top → 1 bottom
    // folds get slightly deeper toward the hem, plus a gentle random sway
    const amp = depth * (0.85 + 0.3 * t);
    const z = Math.sin(u * folds * Math.PI * 2) * amp + Math.sin(u * 3.1 + t * 1.7) * depth * 0.15;
    pos.setZ(i, z);
    uv.setXY(i, u * width * fullness, (1 - t) * height);
  }
  g.computeVertexNormals();
  return g;
}

/** Plump cushion: a subdivided box inflated in the middle and pinched at the seams. Metre UVs. */
export function pillowGeometry(w: number, h: number, t: number) {
  const g = new THREE.BoxGeometry(w, h, t, 14, 14, 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const dims: [number, number][] = [
    [t, h],
    [t, h],
    [w, t],
    [w, t],
    [w, h],
    [w, h],
  ];
  const index = g.index!;
  const done = new Set<number>();
  for (const grp of g.groups) {
    for (let k = grp.start; k < grp.start + grp.count; k++) {
      const vi = index.getX(k);
      if (done.has(vi)) continue;
      done.add(vi);
      const d = dims[grp.materialIndex ?? 0];
      uv.setXY(vi, uv.getX(vi) * d[0], uv.getY(vi) * d[1]);
    }
  }
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = (2 * x) / w;
    const ny = (2 * y) / h;
    const bulge = Math.max(0, (1 - nx * nx) * (1 - ny * ny));
    pos.setZ(i, z * (0.2 + 0.8 * Math.sqrt(bulge)) * 1.25);
    // slightly pull corners in for a softer silhouette
    const pinch = 1 - 0.06 * (nx * nx * ny * ny);
    pos.setX(i, x * pinch);
    pos.setY(i, y * pinch);
  }
  g.computeVertexNormals();
  return g;
}

/** Simple lathe for vases / pots. Profile in [radius, y] pairs. */
export function latheGeometry(profile: [number, number][], segments = 40) {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}
