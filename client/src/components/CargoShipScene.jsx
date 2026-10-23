import React, { Component, Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Procedural fallback model if GLB asset fails to load (clean 3D with ZERO shadows)
function ProceduralShip() {
  const containers = useMemo(() => 
    Array.from({ length: 32 }, (_, i) => ({
      x: ((i % 8) - 3.5) * 0.65,
      y: Math.floor(i / 16) * 0.5 + 0.2,
      z: (Math.floor((i % 16) / 8) - 0.5) * 0.65,
      color: ['#0B4650', '#E6FF2B', '#898A8D', '#d94b26', '#2a5b64'][i % 5]
    })), 
  []);

  return (
    <group>
      {/* Lower Hull */}
      <mesh position={[0, -0.35, 0]}>
        <boxGeometry args={[6.8, 0.6, 2.0]} />
        <meshStandardMaterial color="#0B4650" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Upper Hull */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[6.6, 0.45, 1.9]} />
        <meshStandardMaterial color="#072e35" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Bridge / Superstructure on Left (Stern) */}
      <mesh position={[-2.4, 0.7, 0]}>
        <boxGeometry args={[1.1, 0.95, 1.6]} />
        <meshStandardMaterial color="#F9F7F2" metalness={0.2} roughness={0.4} />
      </mesh>
      {/* Pointed Bow on Right */}
      <mesh position={[3.3, -0.05, 0]} rotation={[0, 0, -Math.PI / 8]}>
        <boxGeometry args={[0.8, 0.5, 1.5]} />
        <meshStandardMaterial color="#0B4650" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Containers */}
      {containers.map((b, i) => (
        <mesh key={i} position={[b.x + 0.3, b.y, b.z]}>
          <boxGeometry args={[0.58, 0.45, 0.55]} />
          <meshStandardMaterial color={b.color} metalness={0.3} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// Loaded GLTF Cargo Ship Model with ZERO cast/receive shadow and realistic material lighting
function LoadedModel() {
  const { scene } = useGLTF('/models/cargo-ship.glb');

  const model = useMemo(() => {
    const copy = scene.clone(true);
    const box = new THREE.Box3().setFromObject(copy);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Scale normalized so maximum dimension is 6.4 units
    const scaleFactor = 6.4 / maxDim;
    copy.scale.multiplyScalar(scaleFactor);

    // Re-center model geometry so center is at (0, 0, 0)
    const centeredBox = new THREE.Box3().setFromObject(copy);
    const center = centeredBox.getCenter(new THREE.Vector3());
    copy.position.sub(center);

    // Completely remove shadows while preserving rich surface materials and lighting
    copy.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        if (obj.material) {
          obj.material = obj.material.clone();
          obj.material.metalness = Math.max(0.25, obj.material.metalness || 0);
          obj.material.roughness = Math.min(0.65, obj.material.roughness ?? 0.45);
        }
      }
    });

    return copy;
  }, [scene]);

  return <primitive object={model} />;
}

// Error Boundary for 3D Model Loading
class AssetBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn('3D ship model loading issue, using procedural fallback:', err);
    this.props.onFailure?.();
  }
  render() {
    return this.state.hasError ? <ProceduralShip /> : this.props.children;
  }
}

// Coordinated 3D Ship Journey
function ShipJourney() {
  const rigRef = useRef();
  const { size, camera } = useThree();

  const isMobile = size.width < 768;

  // Responsive state positions computed from exact camera frustum bounds
  const states = useMemo(() => {
    // Ship voyage depth in 3D scene
    const shipZ = 0.5;
    const camZ = camera.position?.z || 11;
    const dist = camZ - shipZ; // 10.5
    const vFovRad = ((camera.fov || 38) * Math.PI) / 180;
    const visibleHeight = 2 * Math.tan(vFovRad / 2) * dist; // ~7.23 units
    const visibleWidth = visibleHeight * (size.width / size.height);

    if (isMobile) {
      const scale = 0.34;
      const halfShipLength = 3.2 * scale; // ~1.09
      // Fit completely within mobile viewport
      const maxX = Math.min((visibleWidth / 2) - halfShipLength - 0.15, 1.25);
      const minX = Math.max(-(visibleWidth / 2) + halfShipLength + 0.15, -1.25);
      const bottomY = -(visibleHeight / 2) + 0.82;

      return {
        hero: {
          x: 0.0,
          y: -1.3,
          z: 0.5,
          rx: 0.03,
          ry: 3.02, // Bow faces RIGHT
          rz: 0.0,
          scale: 0.58
        },
        about: {
          x: 0.0,
          y: -1.25,
          z: 0.5,
          rx: 0.03,
          ry: 0.15, // Bow faces LEFT
          rz: 0.0,
          scale: 0.55
        },
        featuresStart: {
          x: minX,
          y: bottomY,
          z: 0.5,
          rx: 0.02,
          ry: 3.02, // Bow faces RIGHT
          rz: 0.0,
          scale
        },
        featuresEnd: {
          x: maxX,
          y: bottomY,
          z: 0.5,
          rx: 0.02,
          ry: 3.02, // Bow faces RIGHT, fixed at extreme right
          rz: 0.0,
          scale
        }
      };
    }

    // Desktop & Tablet Viewports
    const scale = 0.44;
    const halfShipLength = 3.2 * scale; // ~1.41
    // Extreme right: right frustum boundary minus half ship length minus margin
    const maxX = (visibleWidth / 2) - halfShipLength - 0.35;
    // Bottom-left start
    const minX = -(visibleWidth / 2) + halfShipLength + 0.4;
    const bottomY = -(visibleHeight / 2) + 0.85;

    return {
      hero: {
        x: -2.9,
        y: -0.15,
        z: 0.2,
        rx: 0.03,
        ry: 3.02, // Bow clearly faces RIGHT
        rz: 0.0,
        scale: 0.94
      },
      about: {
        x: 3.0,
        y: -0.15,
        z: 0.2,
        rx: 0.03,
        ry: 0.15, // Bow clearly faces LEFT
        rz: 0.0,
        scale: 0.90
      },
      featuresStart: {
        x: minX,
        y: bottomY,
        z: 0.5,
        rx: 0.02,
        ry: 3.02, // Bow faces RIGHT
        rz: 0.0,
        scale
      },
      featuresEnd: {
        x: maxX,
        y: bottomY,
        z: 0.5,
        rx: 0.02,
        ry: 3.02, // Bow faces RIGHT, fixed at extreme right
        rz: 0.0,
        scale
      }
    };
  }, [size.width, size.height, camera, isMobile]);

  const motionRef = useRef({ ...states.hero });

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const m = motionRef.current;
    Object.assign(m, states.hero);

    const ctx = gsap.context(() => {
      const hero = document.getElementById('hero');
      const features = document.getElementById('features');

      if (!hero || !features) return;

      // 1. Master continuous scroll-driven timeline strictly bounded from Hero to the end of Features.
      // Proportions are calibrated to match the exact DOM heights of Hero, About Us, and Features.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          endTrigger: features,
          end: 'bottom bottom',
          scrub: 1.0,
          invalidateOnRefresh: true
        }
      });

      // Step 1: Hero to About Us (0 to 35%): Ship voyages from LEFT to RIGHT, rotating ~180° to face LEFT
      tl.to(m, {
        ...states.about,
        duration: 3.5,
        ease: 'power1.inOut'
      });

      // Step 2: About Us reading hold (35% to 58%): Ship stays steady at About Us position
      tl.to(m, {
        ...states.about,
        duration: 2.3,
        ease: 'none'
      });

      // Step 3: Transition into Features Start (58% to 74%): Ship arrives at bottom-left of Features, rotating bow to RIGHT
      tl.to(m, {
        ...states.featuresStart,
        duration: 1.6,
        ease: 'power1.inOut'
      });

      // Step 4: Features Section Voyage (74% to 90%): Ship sails horizontally along bottom toward extreme right side
      tl.to(m, {
        ...states.featuresEnd,
        duration: 1.6,
        ease: 'power1.out'
      });

      // Step 5: Fix at extreme right (90% to 100%): Ship stays stationary at extreme right of Features for remainder of section
      tl.to(m, {
        ...states.featuresEnd,
        duration: 1.0,
        ease: 'none'
      });

      // 2. Features Exit: When Features scrolls away, the ship travels upward WITH the Features section
      // and leaves the viewport completely without entering the Contact Us section.
      gsap.to('.ship-canvas', {
        scrollTrigger: {
          trigger: features,
          start: 'bottom bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true
        },
        y: () => -window.innerHeight,
        ease: 'none'
      });

      ScrollTrigger.refresh();
    });

    return () => ctx.revert();
  }, [states]);

  // Frame loop: update transforms with gentle natural maritime buoyancy
  useFrame(({ clock }) => {
    const m = motionRef.current;
    if (!rigRef.current) return;

    const t = clock.elapsedTime;
    const buoyancyY = Math.sin(t * 1.1) * 0.022;
    const buoyancyRoll = Math.sin(t * 0.8) * 0.009;
    const buoyancyPitch = Math.cos(t * 0.6) * 0.005;

    rigRef.current.position.set(m.x, m.y + buoyancyY, m.z);
    rigRef.current.rotation.set(m.rx + buoyancyPitch, m.ry, m.rz + buoyancyRoll);
    rigRef.current.scale.setScalar(m.scale);
  });

  return (
    <group ref={rigRef}>
      <AssetBoundary>
        <Suspense fallback={<ProceduralShip />}>
          <LoadedModel />
        </Suspense>
      </AssetBoundary>
    </group>
  );
}

// Clean studio lighting with ZERO shadows
function StudioLighting() {
  return (
    <>
      <ambientLight intensity={1.5} color="#ffffff" />
      <directionalLight
        position={[8, 14, 10]}
        intensity={2.6}
        color="#ffffff"
      />
      <directionalLight 
        position={[-8, 6, -6]} 
        intensity={1.1} 
        color="#F9F7F2" 
      />
      <hemisphereLight args={['#ffffff', '#0B4650', 0.85]} />
      <ShipJourney />
    </>
  );
}

// React Three Fiber Canvas Layer
export default function CargoShipScene() {
  const [webglSupported, setWebglSupported] = useState(true);

  if (!webglSupported) {
    return (
      <div className="webgl-fallback" role="img" aria-label="FXCGO 3D Cargo Ship">
        <p>3D Voyage Mode Active</p>
      </div>
    );
  }

  return (
    <div className="ship-canvas" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 11], fov: 38, near: 0.1, far: 80 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          if (!gl) {
            setWebglSupported(false);
            return;
          }
          gl.setClearColor(0x000000, 0); // Transparent WebGL canvas
          if (gl.shadowMap) {
            gl.shadowMap.enabled = false;
          }
        }}
      >
        <StudioLighting />
      </Canvas>
    </div>
  );
}

useGLTF.preload('/models/cargo-ship.glb');
