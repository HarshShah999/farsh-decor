import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Room } from './Room';
import { setMaxAnisotropy } from './textureCache';
import { viewer } from './viewer';
import { withHighlightsSuppressed } from './useSurfaceMaterial';
import { useDesign } from '../store/designStore';

const CAM_POS = new THREE.Vector3(0.9, 1.55, 2.25);
const TARGET = new THREE.Vector3(-0.35, 1.0, -1.1);
const CAM_MIN = new THREE.Vector3(-2.75, 0.3, -2.25);
const CAM_MAX = new THREE.Vector3(2.75, 2.65, 2.3);
const T_MIN = new THREE.Vector3(-2.5, 0.2, -2.2);
const T_MAX = new THREE.Vector3(2.5, 2.3, 2.1);

const isMobile = () => typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768);

function Controls() {
  const ref = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    viewer.resetView = () => {
      camera.position.copy(CAM_POS);
      ref.current?.target.copy(TARGET);
      ref.current?.update();
      invalidate();
    };
    return () => {
      viewer.resetView = null;
    };
  }, [camera, invalidate]);

  useFrame(() => {
    const c = ref.current;
    if (!c) return;
    c.target.clamp(T_MIN, T_MAX);
    camera.position.clamp(CAM_MIN, CAM_MAX);
  });

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      target={TARGET}
      enableDamping
      dampingFactor={0.09}
      minDistance={0.6}
      maxDistance={4.4}
      minPolarAngle={Math.PI * 0.16}
      maxPolarAngle={Math.PI * 0.64}
      rotateSpeed={0.55}
      zoomSpeed={0.8}
      panSpeed={0.7}
      screenSpacePanning
    />
  );
}

function Bridge() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    viewer.capture = (mime = 'image/jpeg', quality = 0.92) =>
      withHighlightsSuppressed(() => {
        gl.render(scene, camera);
        return gl.domElement.toDataURL(mime, quality);
      });
    viewer.invalidate = invalidate;
    return () => {
      viewer.capture = null;
      viewer.invalidate = null;
    };
  }, [gl, scene, camera, invalidate]);
  return null;
}

function Lights({ mobile }: { mobile: boolean }) {
  const size = mobile ? 1024 : 2048;
  return (
    <>
      <hemisphereLight args={['#fff8ee', '#cbbba4', 0.7]} />
      <ambientLight intensity={0.12} />
      <directionalLight
        castShadow
        position={[-5, 7.5, 5.5]}
        intensity={1.9}
        color="#fff3e2"
        shadow-mapSize={[size, size]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={1}
        shadow-camera-far={25}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-radius={4}
      />
      <directionalLight position={[6, 4, -2]} intensity={0.45} color="#e6efff" />
    </>
  );
}

export default function Scene() {
  const mobile = isMobile();
  return (
    <Canvas
      shadows="percentage"
      frameloop="demand"
      dpr={mobile ? [1, 1.5] : [1, 2]}
      camera={{ fov: 58, near: 0.05, far: 200, position: CAM_POS.toArray() }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.05;
        setMaxAnisotropy(gl.capabilities.getMaxAnisotropy());
      }}
      onPointerMissed={(e) => {
        if (e.type === 'click') useDesign.getState().select(null);
      }}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={['#f1ece3']} />
      <Lights mobile={mobile} />
      <Environment resolution={128} frames={1} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={2.2} color="#fff4e4" position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[3, 2.2, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[6, 1.5, 0]} rotation-y={-Math.PI / 2} scale={[3, 2.5, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#fff6ea" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[6, 5, 1]} />
        <Lightformer form="rect" intensity={0.4} color="#e9dfcf" position={[0, 1, -6]} scale={[8, 3, 1]} />
      </Environment>
      <Room />
      <Controls />
      <Bridge />
    </Canvas>
  );
}
