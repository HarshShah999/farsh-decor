/**
 * The furnished living room: architecture, furniture, soft furnishings and decor.
 * Every customisable surface is wrapped in <Selectable> and uses one shared
 * material from useSurfaceMaterial(surfaceId).
 */
import { useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useDesign } from '../store/designStore';
import type { SurfaceId } from './surfaces';
import { useDecorMaterial, useSurfaceMaterial } from './useSurfaceMaterial';
import {
  ROOM,
  boxGeometryMeters,
  curtainGeometry,
  floorGeometry,
  latheGeometry,
  pillowGeometry,
  wallGeometry,
  type Hole,
} from './geometry';
import { seedProducts } from '../data/seedProducts';
import type { TextureSource } from '../types/catalog';

const { W, D, H } = ROOM;
const WALL_T = 0.18;

const WINDOW_HOLE: Hole = { x0: -1.15, x1: 1.15, y0: 0.55, y1: 2.45 };
// y0 is a hair above 0: a hole touching the outline edge would break triangulation (reads as a threshold strip)
const DOOR_HOLE: Hole = { x0: -1.35, x1: 1.35, y0: 0.015, y1: 2.5 };

/* ---------------------------- shared static materials ---------------------------- */

function useStatic() {
  return useMemo(
    () => ({
      white: new THREE.MeshStandardMaterial({ color: '#f3f0ea', roughness: 0.9 }),
      ceiling: new THREE.MeshStandardMaterial({ color: '#f6f4ef', roughness: 0.95 }),
      frame: new THREE.MeshStandardMaterial({ color: '#2b2a27', roughness: 0.45, metalness: 0.5 }),
      brass: new THREE.MeshStandardMaterial({ color: '#b8955a', roughness: 0.3, metalness: 0.9 }),
      blackMetal: new THREE.MeshStandardMaterial({ color: '#1e1e1c', roughness: 0.4, metalness: 0.6 }),
      darkWood: new THREE.MeshStandardMaterial({ color: '#4a3324', roughness: 0.55 }),
      walnut: new THREE.MeshStandardMaterial({ color: '#6b4a33', roughness: 0.5 }),
      ceramic: new THREE.MeshStandardMaterial({ color: '#e9e3d7', roughness: 0.6 }),
      ceramicDark: new THREE.MeshStandardMaterial({ color: '#3b3a36', roughness: 0.7 }),
      terracotta: new THREE.MeshStandardMaterial({ color: '#b98466', roughness: 0.85 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: '#e7f0f2',
        roughness: 0.05,
        metalness: 0,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      }),
      leaf: new THREE.MeshStandardMaterial({ color: '#4f6b3a', roughness: 0.7, side: THREE.DoubleSide }),
      leafLight: new THREE.MeshStandardMaterial({ color: '#6f8a4f', roughness: 0.7, side: THREE.DoubleSide }),
      stem: new THREE.MeshStandardMaterial({ color: '#c8b48e', roughness: 0.8 }),
      shade: new THREE.MeshStandardMaterial({
        color: '#f6efe2',
        roughness: 0.9,
        emissive: new THREE.Color('#ffd9a0'),
        emissiveIntensity: 0.55,
        side: THREE.DoubleSide,
      }),
      downlight: new THREE.MeshBasicMaterial({ color: '#fff6e5' }),
      book1: new THREE.MeshStandardMaterial({ color: '#8a6f55', roughness: 0.8 }),
      book2: new THREE.MeshStandardMaterial({ color: '#d8cdbb', roughness: 0.8 }),
      book3: new THREE.MeshStandardMaterial({ color: '#4c5a55', roughness: 0.8 }),
      tree: new THREE.MeshStandardMaterial({ color: '#5d7748', roughness: 0.9, flatShading: true }),
      treeDark: new THREE.MeshStandardMaterial({ color: '#43593a', roughness: 0.9, flatShading: true }),
      trunk: new THREE.MeshStandardMaterial({ color: '#6b5a47', roughness: 0.9 }),
      ground: new THREE.MeshStandardMaterial({ color: '#8f9f74', roughness: 1 }),
      mirror: new THREE.MeshStandardMaterial({ color: '#dfe4e4', roughness: 0.04, metalness: 1 }),
    }),
    [],
  );
}

type Mats = ReturnType<typeof useStatic>;

/* ---------------------------------- interaction ---------------------------------- */

function Selectable({ surface, children }: { surface: SurfaceId; children: ReactNode }) {
  const select = useDesign((s) => s.select);
  const hover = useDesign((s) => s.hover);
  return (
    <group
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        hover(surface);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hover(null);
        document.body.style.cursor = '';
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta > 6) return; // was a drag, not a click
        select(surface);
      }}
    >
      {children}
    </group>
  );
}

/** Blocks pointer events so decor in front of a surface doesn't select what's behind it. */
function Blocker({ children }: { children: ReactNode }) {
  const hover = useDesign((s) => s.hover);
  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        hover(null);
        document.body.style.cursor = '';
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </group>
  );
}

/* --------------------------------- architecture --------------------------------- */

function Wall({
  surface,
  width,
  holes,
  position,
  rotationY,
}: {
  surface: SurfaceId;
  width: number;
  holes?: Hole[];
  position: [number, number, number];
  rotationY: number;
}) {
  const material = useSurfaceMaterial(surface);
  const geo = useMemo(() => wallGeometry(width, H, holes), [width, holes]);
  return (
    <Selectable surface={surface}>
      <mesh geometry={geo} material={material} position={position} rotation-y={rotationY} receiveShadow />
    </Selectable>
  );
}

function Reveal({ hole, mats, sill }: { hole: Hole; mats: Mats; sill?: boolean }) {
  const h = hole.y1 - hole.y0;
  const w = hole.x1 - hole.x0;
  const cy = (hole.y0 + hole.y1) / 2;
  return (
    <group>
      <mesh material={mats.white} position={[hole.x0 - 0.005, cy, -WALL_T / 2]} receiveShadow>
        <boxGeometry args={[0.01, h, WALL_T]} />
      </mesh>
      <mesh material={mats.white} position={[hole.x1 + 0.005, cy, -WALL_T / 2]} receiveShadow>
        <boxGeometry args={[0.01, h, WALL_T]} />
      </mesh>
      <mesh material={mats.white} position={[(hole.x0 + hole.x1) / 2, hole.y1 + 0.005, -WALL_T / 2]}>
        <boxGeometry args={[w + 0.02, 0.01, WALL_T]} />
      </mesh>
      {sill && (
        <mesh material={mats.white} position={[(hole.x0 + hole.x1) / 2, hole.y0 - 0.015, -WALL_T / 2 + 0.03]} receiveShadow castShadow>
          <boxGeometry args={[w + 0.12, 0.03, WALL_T + 0.08]} />
        </mesh>
      )}
    </group>
  );
}

function WindowFrame({ hole, mats, mullions = 1, transom }: { hole: Hole; mats: Mats; mullions?: number; transom?: number }) {
  const w = hole.x1 - hole.x0;
  const h = hole.y1 - hole.y0;
  const cx = (hole.x0 + hole.x1) / 2;
  const cy = (hole.y0 + hole.y1) / 2;
  const z = -WALL_T * 0.55;
  const b = 0.045;
  const bars: [number, number, number, number, number][] = [
    [cx, hole.y1 - b / 2, w, b, 0],
    [cx, hole.y0 + b / 2, w, b, 0],
    [hole.x0 + b / 2, cy, b, h, 0],
    [hole.x1 - b / 2, cy, b, h, 0],
  ];
  for (let i = 1; i <= mullions; i++) bars.push([hole.x0 + (w * i) / (mullions + 1), cy, b * 0.8, h, 0]);
  if (transom) bars.push([cx, hole.y0 + transom, w, b * 0.8, 0]);
  return (
    <group>
      {bars.map(([x, y, bw, bh], i) => (
        <mesh key={i} material={mats.frame} position={[x, y, z]} castShadow>
          <boxGeometry args={[bw, bh, 0.05]} />
        </mesh>
      ))}
      <mesh material={mats.glass} position={[cx, cy, z]}>
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  );
}

function Skirting({ mats }: { mats: Mats }) {
  const hgt = 0.09;
  const t = 0.015;
  return (
    <group>
      <mesh material={mats.white} position={[0, hgt / 2, -D / 2 + t / 2]}>
        <boxGeometry args={[W, hgt, t]} />
      </mesh>
      <mesh material={mats.white} position={[0, hgt / 2, D / 2 - t / 2]}>
        <boxGeometry args={[W, hgt, t]} />
      </mesh>
      <mesh material={mats.white} position={[-W / 2 + t / 2, hgt / 2, 0]}>
        <boxGeometry args={[t, hgt, D]} />
      </mesh>
      {/* right wall skirting split around the door */}
      <mesh material={mats.white} position={[W / 2 - t / 2, hgt / 2, -(D / 2 + DOOR_HOLE.x1) / 2]}>
        <boxGeometry args={[t, hgt, D / 2 - DOOR_HOLE.x1]} />
      </mesh>
      <mesh material={mats.white} position={[W / 2 - t / 2, hgt / 2, (D / 2 + DOOR_HOLE.x1) / 2]}>
        <boxGeometry args={[t, hgt, D / 2 - DOOR_HOLE.x1]} />
      </mesh>
    </group>
  );
}

function Floor() {
  const material = useSurfaceMaterial('floor');
  const geo = useMemo(() => floorGeometry(W, D), []);
  return (
    <Selectable surface="floor">
      <mesh geometry={geo} material={material} receiveShadow />
    </Selectable>
  );
}

function Ceiling({ mats }: { mats: Mats }) {
  const lights: [number, number][] = [
    [-1.6, -1.4],
    [1.6, -1.4],
    [-1.6, 1.2],
    [1.6, 1.2],
  ];
  return (
    <Blocker>
      <mesh material={mats.ceiling} position={[0, H, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* cove */}
      <mesh material={mats.white} position={[0, H - 0.04, -D / 2 + 0.04]}>
        <boxGeometry args={[W, 0.08, 0.08]} />
      </mesh>
      {lights.map(([x, z]) => (
        <mesh key={`${x}${z}`} material={mats.downlight} position={[x, H - 0.002, z]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.055, 24]} />
        </mesh>
      ))}
    </Blocker>
  );
}

/* ------------------------------------ outside ------------------------------------ */

function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
        uniforms: { top: { value: new THREE.Color('#bcd3e4') }, bottom: { value: new THREE.Color('#f5efe4') } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.05,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(h,0.8)), 1.0); }',
      }),
    [],
  );
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[60, 32, 16]} />
    </mesh>
  );
}

function Tree({ position, scale = 1, mats }: { position: [number, number, number]; scale?: number; mats: Mats }) {
  return (
    <group position={position} scale={scale}>
      <mesh material={mats.trunk} position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 2.4, 8]} />
      </mesh>
      <mesh material={mats.tree} position={[0, 3.2, 0]}>
        <icosahedronGeometry args={[1.6, 1]} />
      </mesh>
      <mesh material={mats.treeDark} position={[0.9, 2.6, 0.4]}>
        <icosahedronGeometry args={[1.1, 1]} />
      </mesh>
      <mesh material={mats.tree} position={[-0.8, 2.8, -0.3]}>
        <icosahedronGeometry args={[1.0, 1]} />
      </mesh>
    </group>
  );
}

// decorative textures come from the built-in starter set, so they never depend on catalogue edits
const hedgeSource = seedProducts.find((p) => p.id === 'gr-forest-dense')!.texture;

function Outside({ mats }: { mats: Mats }) {
  const terraceMat = useSurfaceMaterial('terrace');
  const hedge = useDecorMaterial('decor:hedge', hedgeSource, { repeat: [1.4, 1.4], roughness: 1, bumpScale: 1.5 });
  const terraceGeo = useMemo(() => floorGeometry(3.6, D + 0.4), []);
  return (
    <group>
      <Sky />
      <Blocker>
        <mesh material={mats.ground} position={[0, -0.03, 0]} rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[120, 120]} />
        </mesh>
        {/* hedge beyond the left window */}
        <mesh material={hedge} position={[-7.5, 0.9, 0]}>
          <boxGeometry args={[1.2, 1.8, 14]} />
        </mesh>
        {/* hedge beyond the terrace */}
        <mesh material={hedge} position={[8.2, 0.6, 0]}>
          <boxGeometry args={[1, 1.2, 12]} />
        </mesh>
        <Tree position={[-11, 0, -3]} scale={1.3} mats={mats} />
        <Tree position={[-12, 0, 4]} scale={1.1} mats={mats} />
        <Tree position={[12, 0, -4]} scale={1.4} mats={mats} />
        <Tree position={[13, 0, 3.5]} mats={mats} />
        {/* terrace parapet + glass balustrade */}
        <mesh material={mats.white} position={[W / 2 + WALL_T + 3.6, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 0.3, D + 0.4]} />
        </mesh>
        <mesh material={mats.glass} position={[W / 2 + WALL_T + 3.6, 0.7, 0]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[D + 0.4, 0.8]} />
        </mesh>
        <mesh material={mats.frame} position={[W / 2 + WALL_T + 3.6, 1.1, 0]}>
          <boxGeometry args={[0.05, 0.04, D + 0.4]} />
        </mesh>
        {/* planters */}
        {[-2.2, 2.2].map((z) => (
          <group key={z} position={[W / 2 + WALL_T + 3.2, 0, z]}>
            <mesh material={mats.ceramicDark} position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[0.5, 0.6, 0.5]} />
            </mesh>
            <mesh material={mats.tree} position={[0, 0.95, 0]} castShadow>
              <icosahedronGeometry args={[0.42, 1]} />
            </mesh>
          </group>
        ))}
      </Blocker>
      <Selectable surface="terrace">
        <mesh geometry={terraceGeo} material={terraceMat} position={[W / 2 + WALL_T / 2 + 1.8, 0.001, 0]} receiveShadow />
      </Selectable>
    </group>
  );
}

/* ----------------------------------- furniture ----------------------------------- */

function Sofa({ mats }: { mats: Mats }) {
  const m = useSurfaceMaterial('sofa');
  const seatW = 0.7;
  return (
    <Selectable surface="sofa">
      <group position={[0, 0, -D / 2 + 0.58]}>
        {[
          [-1.12, -0.36],
          [1.12, -0.36],
          [-1.12, 0.36],
          [1.12, 0.36],
        ].map(([x, z]) => (
          <mesh key={`${x}${z}`} material={mats.darkWood} position={[x, 0.05, z]} castShadow>
            <cylinderGeometry args={[0.025, 0.018, 0.1, 10]} />
          </mesh>
        ))}
        <RoundedBox args={[2.46, 0.24, 0.96]} radius={0.05} smoothness={3} material={m} position={[0, 0.22, 0]} castShadow receiveShadow />
        <RoundedBox args={[2.46, 0.5, 0.22]} radius={0.07} smoothness={3} material={m} position={[0, 0.58, -0.37]} castShadow receiveShadow />
        {[-1, 1].map((s) => (
          <RoundedBox key={s} args={[0.2, 0.34, 0.96]} radius={0.08} smoothness={3} material={m} position={[s * 1.13, 0.5, 0]} castShadow receiveShadow />
        ))}
        {[-1, 0, 1].map((i) => (
          <RoundedBox key={i} args={[seatW, 0.17, 0.72]} radius={0.07} smoothness={4} material={m} position={[i * (seatW + 0.01), 0.425, 0.08]} castShadow receiveShadow />
        ))}
        {[-1, 0, 1].map((i) => (
          <RoundedBox
            key={i}
            args={[seatW, 0.44, 0.18]}
            radius={0.08}
            smoothness={4}
            material={m}
            position={[i * (seatW + 0.01), 0.72, -0.2]}
            rotation-x={-0.14}
            castShadow
            receiveShadow
          />
        ))}
      </group>
    </Selectable>
  );
}

function Cushions() {
  const m = useSurfaceMaterial('cushions');
  const geo = useMemo(() => pillowGeometry(0.46, 0.46, 0.13), []);
  const sofaZ = -D / 2 + 0.58;
  const items: { p: [number, number, number]; r: [number, number, number] }[] = [
    { p: [-0.86, 0.75, sofaZ - 0.08], r: [-0.28, 0.12, 0.1] },
    { p: [-0.5, 0.72, sofaZ - 0.05], r: [-0.3, -0.05, -0.06] },
    { p: [0.86, 0.75, sofaZ - 0.08], r: [-0.28, -0.12, -0.1] },
  ];
  return (
    <Selectable surface="cushions">
      {items.map((it, i) => (
        <mesh key={i} geometry={geo} material={m} position={it.p} rotation={it.r} castShadow receiveShadow />
      ))}
      <group position={[-1.75, 0, 0.2]} rotation-y={2.15}>
        <mesh geometry={geo} material={m} position={[0, 0.66, -0.18]} rotation-x={-0.25} scale={0.85} castShadow />
      </group>
    </Selectable>
  );
}

function Armchair({ mats }: { mats: Mats }) {
  const m = useSurfaceMaterial('armchair');
  return (
    <group position={[-1.75, 0, 0.2]} rotation-y={2.15}>
      <Blocker>
        {[
          [-0.3, -0.28],
          [0.3, -0.28],
          [-0.3, 0.28],
          [0.3, 0.28],
        ].map(([x, z]) => (
          <mesh key={`${x}${z}`} material={mats.brass} position={[x, 0.08, z]} castShadow>
            <cylinderGeometry args={[0.014, 0.01, 0.16, 8]} />
          </mesh>
        ))}
      </Blocker>
      <Selectable surface="armchair">
        <RoundedBox args={[0.8, 0.22, 0.78]} radius={0.06} smoothness={3} material={m} position={[0, 0.27, 0]} castShadow receiveShadow />
        <RoundedBox args={[0.8, 0.5, 0.16]} radius={0.07} smoothness={3} material={m} position={[0, 0.6, -0.31]} rotation-x={-0.1} castShadow receiveShadow />
        {[-1, 1].map((s) => (
          <RoundedBox key={s} args={[0.12, 0.24, 0.74]} radius={0.05} smoothness={3} material={m} position={[s * 0.34, 0.48, 0.01]} castShadow />
        ))}
        <RoundedBox args={[0.56, 0.12, 0.6]} radius={0.05} smoothness={3} material={m} position={[0, 0.43, 0.06]} castShadow receiveShadow />
      </Selectable>
    </group>
  );
}

function Curtains({ mats }: { mats: Mats }) {
  const m = useSurfaceMaterial('curtains', { side: THREE.DoubleSide });
  const panelW = 0.85;
  const height = 2.58;
  const geo = useMemo(() => curtainGeometry(panelW, height, 6, 0.045), []);
  const x = -W / 2 + 0.14;
  const rodY = 2.66;
  const span = WINDOW_HOLE.x1 - WINDOW_HOLE.x0 + 0.9;
  return (
    <group>
      <Blocker>
        <mesh material={mats.brass} position={[x, rodY, 0]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.012, 0.012, span + 0.2, 12]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={mats.brass} position={[x, rodY, s * (span / 2 + 0.1)]}>
            <sphereGeometry args={[0.026, 14, 10]} />
          </mesh>
        ))}
      </Blocker>
      <Selectable surface="curtains">
        {/* window wall local +x maps to world -z */}
        <mesh geometry={geo} material={m} position={[x, rodY - 0.04, span / 2 - panelW / 2]} rotation-y={Math.PI / 2} castShadow />
        <mesh geometry={geo} material={m} position={[x, rodY - 0.04, -span / 2 + panelW / 2]} rotation-y={Math.PI / 2} castShadow />
      </Selectable>
    </group>
  );
}

/* ------------------------------------- decor ------------------------------------- */

const rugSource: TextureSource = {
  kind: 'procedural',
  generator: 'weave',
  params: { base: '#dcd3c4', alt: '#c3b6a2', pattern: 'basket', threads: 36, heather: 0.45, slub: 0.3 },
};
const artA: TextureSource = {
  kind: 'procedural',
  generator: 'abstract',
  params: { bg: '#efe8dc', c1: '#c08a6a', c2: '#a5ad95', c3: '#e0c9a2', c4: '#3f3d38' },
  seed: 11,
};
const artB: TextureSource = {
  kind: 'procedural',
  generator: 'abstract',
  params: { bg: '#e7e1d5', c1: '#b69a70', c2: '#7c8574', c3: '#d7b9a0', c4: '#2f2e2b' },
  seed: 29,
};
const marbleSource = seedProducts.find((p) => p.id === 'wp-calacatta-veil')!.texture;

function Rug() {
  const m = useDecorMaterial('decor:rug', rugSource, { repeat: [1 / 0.35, 1 / 0.35], roughness: 1, bumpScale: 1.2 });
  const geo = useMemo(() => {
    const g = boxGeometryMeters(2.7, 0.012, 1.9);
    return g;
  }, []);
  return <mesh geometry={geo} material={m} position={[0, 0.006, -0.85]} receiveShadow />;
}

function Artwork({ source, keyName, position, mats }: { source: TextureSource; keyName: string; position: [number, number, number]; mats: Mats }) {
  const m = useDecorMaterial(keyName, source, { repeat: [1 / 0.62, 1 / 0.62], roughness: 0.85, bumpScale: 0.2 });
  return (
    <group position={position}>
      <mesh material={mats.frame} castShadow>
        <boxGeometry args={[0.66, 0.86, 0.035]} />
      </mesh>
      <mesh material={mats.white} position={[0, 0, 0.018]}>
        <planeGeometry args={[0.6, 0.8]} />
      </mesh>
      <mesh position={[0, 0, 0.019]}>
        <planeGeometry args={[0.46, 0.64]} />
        <primitive object={m} attach="material" />
      </mesh>
    </group>
  );
}

function CoffeeTable({ mats }: { mats: Mats }) {
  const top = useDecorMaterial('decor:marble', marbleSource, { repeat: [1 / 1.2, 1 / 1.2], roughness: 0.2, bumpScale: 0.05 });
  const vase = useMemo(
    () =>
      latheGeometry([
        [0, 0],
        [0.055, 0],
        [0.075, 0.05],
        [0.08, 0.12],
        [0.05, 0.2],
        [0.028, 0.25],
        [0.034, 0.28],
        [0.03, 0.28],
      ]),
    [],
  );
  const bowl = useMemo(
    () =>
      latheGeometry([
        [0, 0],
        [0.06, 0.005],
        [0.11, 0.04],
        [0.12, 0.06],
        [0.115, 0.06],
        [0.1, 0.04],
        [0, 0.012],
      ]),
    [],
  );
  const z = -0.85;
  return (
    <Blocker>
      <group position={[0, 0, z]}>
        <mesh material={top} position={[0, 0.39, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.52, 0.52, 0.04, 64]} />
        </mesh>
        <mesh material={mats.walnut} position={[0, 0.19, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.3, 0.37, 48]} />
        </mesh>
        <mesh geometry={vase} material={mats.ceramic} position={[0.2, 0.41, -0.08]} castShadow />
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} material={mats.stem} position={[0.2 + Math.sin(i * 1.3) * 0.05, 0.86, -0.08 + Math.cos(i * 1.7) * 0.05]} rotation={[Math.sin(i) * 0.25, 0, Math.cos(i * 2) * 0.25]}>
            <cylinderGeometry args={[0.003, 0.004, 0.5, 4]} />
          </mesh>
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={`h${i}`} material={mats.stem} position={[0.2 + Math.sin(i * 1.3) * 0.12, 1.1, -0.08 + Math.cos(i * 1.7) * 0.12]}>
            <sphereGeometry args={[0.03, 8, 6]} />
          </mesh>
        ))}
        <mesh material={mats.book3} position={[-0.18, 0.43, 0.1]} rotation-y={0.3} castShadow>
          <boxGeometry args={[0.3, 0.04, 0.22]} />
        </mesh>
        <mesh material={mats.book2} position={[-0.17, 0.465, 0.1]} rotation-y={0.18} castShadow>
          <boxGeometry args={[0.26, 0.03, 0.19]} />
        </mesh>
        <mesh geometry={bowl} material={mats.brass} position={[-0.1, 0.41, -0.22]} castShadow />
      </group>
    </Blocker>
  );
}

function SideTableLamp({ mats }: { mats: Mats }) {
  const base = useMemo(
    () =>
      latheGeometry([
        [0, 0],
        [0.06, 0],
        [0.11, 0.08],
        [0.12, 0.16],
        [0.09, 0.26],
        [0.025, 0.3],
        [0.015, 0.36],
        [0, 0.36],
      ]),
    [],
  );
  return (
    <Blocker>
      <group position={[1.62, 0, -D / 2 + 0.45]}>
        <mesh material={mats.blackMetal} position={[0, 0.27, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.025, 40]} />
        </mesh>
        <mesh material={mats.blackMetal} position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.26, 8]} />
        </mesh>
        <mesh material={mats.blackMetal} position={[0, 0.005, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.01, 32]} />
        </mesh>
        <mesh geometry={base} material={mats.terracotta} position={[0, 0.283, 0]} castShadow />
        <mesh material={mats.shade} position={[0, 0.78, 0]}>
          <cylinderGeometry args={[0.13, 0.18, 0.22, 32, 1, true]} />
        </mesh>
        <pointLight position={[0, 0.74, 0]} intensity={1.4} distance={3.5} decay={2} color="#ffd29a" />
        <mesh material={mats.book1} position={[0.05, 0.305, 0.12]} rotation-y={0.4}>
          <boxGeometry args={[0.18, 0.035, 0.13]} />
        </mesh>
      </group>
    </Blocker>
  );
}

function FloorLamp({ mats }: { mats: Mats }) {
  return (
    <Blocker>
      <group position={[-W / 2 + 0.45, 0, -D / 2 + 0.45]}>
        <mesh material={mats.brass} position={[0, 0.01, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.02, 32]} />
        </mesh>
        <mesh material={mats.brass} position={[0, 0.8, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 1.6, 8]} />
        </mesh>
        <mesh material={mats.shade} position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.22, 0.28, 40, 1, true]} />
        </mesh>
        <pointLight position={[0, 1.55, 0]} intensity={1.2} distance={4} decay={2} color="#ffd8a8" />
      </group>
    </Blocker>
  );
}

function Plant({ mats, position }: { mats: Mats; position: [number, number, number] }) {
  const pot = useMemo(
    () =>
      latheGeometry([
        [0, 0],
        [0.15, 0],
        [0.19, 0.1],
        [0.2, 0.42],
        [0.19, 0.42],
        [0, 0.4],
      ]),
    [],
  );
  const leaves = useMemo(() => {
    const out: { p: [number, number, number]; r: [number, number, number]; s: number; light: boolean }[] = [];
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4;
      const h = 0.55 + (i / 26) * 1.05;
      const rad = 0.12 + Math.sin(i * 1.7) * 0.06;
      out.push({
        p: [Math.cos(a) * rad, h, Math.sin(a) * rad],
        r: [0.6 + Math.sin(i) * 0.3, -a, 0.2],
        s: 0.8 + ((i * 37) % 10) / 25,
        light: i % 3 === 0,
      });
    }
    return out;
  }, []);
  const leafGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 10, 6);
    g.scale(0.07, 0.012, 0.15);
    g.translate(0, 0, 0.12);
    return g;
  }, []);
  return (
    <Blocker>
      <group position={position}>
        <mesh geometry={pot} material={mats.ceramicDark} castShadow receiveShadow />
        <mesh material={mats.trunk} position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.012, 0.018, 1.0, 6]} />
        </mesh>
        {leaves.map((l, i) => (
          <mesh key={i} geometry={leafGeo} material={l.light ? mats.leafLight : mats.leaf} position={l.p} rotation={l.r} scale={l.s} castShadow />
        ))}
      </group>
    </Blocker>
  );
}

function Pendant({ mats }: { mats: Mats }) {
  const dome = useMemo(
    () =>
      latheGeometry(
        [
          [0.01, 0.2],
          [0.06, 0.19],
          [0.16, 0.12],
          [0.22, 0.02],
          [0.23, 0],
        ],
        48,
      ),
    [],
  );
  return (
    <Blocker>
      <group position={[0, H - 0.75, -0.85]}>
        <mesh material={mats.blackMetal} position={[0, 0.48, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.55, 4]} />
        </mesh>
        <mesh geometry={dome} castShadow>
          <meshStandardMaterial attach="material" color="#b8955a" metalness={0.9} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh material={mats.downlight} position={[0, 0.02, 0]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.07, 20]} />
        </mesh>
        <pointLight position={[0, -0.05, 0]} intensity={0.9} distance={3} decay={2} color="#ffe2b8" />
      </group>
    </Blocker>
  );
}

function Sideboard({ mats }: { mats: Mats }) {
  return (
    <Blocker>
      <group position={[0.6, 0, D / 2 - 0.25]}>
        <mesh material={mats.walnut} position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 0.6, 0.45]} />
        </mesh>
        {[-0.71, -0.24, 0.24, 0.71].map((x) => (
          <mesh key={x} material={mats.darkWood} position={[x, 0.42, -0.226]}>
            <boxGeometry args={[0.46, 0.56, 0.005]} />
          </mesh>
        ))}
        {[-0.85, 0.85].map((x) => (
          <mesh key={x} material={mats.blackMetal} position={[x, 0.06, 0]}>
            <boxGeometry args={[0.03, 0.12, 0.38]} />
          </mesh>
        ))}
        <mesh material={mats.mirror} position={[0, 1.45, 0.205]} rotation-y={Math.PI}>
          <circleGeometry args={[0.42, 64]} />
        </mesh>
        <mesh material={mats.brass} position={[0, 1.45, 0.212]} rotation-y={Math.PI}>
          <torusGeometry args={[0.43, 0.015, 12, 64]} />
        </mesh>
        <mesh material={mats.ceramic} position={[-0.6, 0.83, 0]} castShadow>
          <sphereGeometry args={[0.1, 24, 16]} />
        </mesh>
      </group>
      {/* entrance door */}
      <group position={[-1.9, 0, D / 2 - 0.02]}>
        <mesh material={mats.white} position={[0, 1.06, 0]}>
          <boxGeometry args={[0.98, 2.14, 0.04]} />
        </mesh>
        <mesh material={mats.ceiling} position={[0, 1.04, -0.025]}>
          <boxGeometry args={[0.86, 2.06, 0.02]} />
        </mesh>
        <mesh material={mats.brass} position={[0.34, 1.0, -0.05]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.012, 0.012, 0.14, 8]} />
        </mesh>
      </group>
    </Blocker>
  );
}

/* ------------------------------------- room -------------------------------------- */

const windowHoles = [WINDOW_HOLE];
const doorHoles = [DOOR_HOLE];

export function Room() {
  const mats = useStatic();
  return (
    <group>
      <Floor />
      <Wall surface="wallMain" width={W} position={[0, 0, -D / 2]} rotationY={0} />
      <Wall surface="wallFront" width={W} position={[0, 0, D / 2]} rotationY={Math.PI} />
      <group position={[-W / 2, 0, 0]} rotation-y={Math.PI / 2}>
        <Reveal hole={WINDOW_HOLE} mats={mats} sill />
        <WindowFrame hole={WINDOW_HOLE} mats={mats} mullions={1} transom={1.45} />
      </group>
      <Wall surface="wallLeft" width={D} holes={windowHoles} position={[-W / 2, 0, 0]} rotationY={Math.PI / 2} />
      <group position={[W / 2, 0, 0]} rotation-y={-Math.PI / 2}>
        <Reveal hole={DOOR_HOLE} mats={mats} />
        <WindowFrame hole={DOOR_HOLE} mats={mats} mullions={2} />
      </group>
      <Wall surface="wallRight" width={D} holes={doorHoles} position={[W / 2, 0, 0]} rotationY={-Math.PI / 2} />
      <Skirting mats={mats} />
      <Ceiling mats={mats} />
      <Outside mats={mats} />

      <Rug />
      <Sofa mats={mats} />
      <Cushions />
      <Armchair mats={mats} />
      <Curtains mats={mats} />
      <CoffeeTable mats={mats} />
      <SideTableLamp mats={mats} />
      <FloorLamp mats={mats} />
      <Plant mats={mats} position={[W / 2 - 0.45, 0, -D / 2 + 0.45]} />
      <Pendant mats={mats} />
      <Sideboard mats={mats} />
      <Artwork source={artA} keyName="decor:artA" position={[-0.42, 1.72, -D / 2 + 0.03]} mats={mats} />
      <Artwork source={artB} keyName="decor:artB" position={[0.42, 1.72, -D / 2 + 0.03]} mats={mats} />
    </group>
  );
}
