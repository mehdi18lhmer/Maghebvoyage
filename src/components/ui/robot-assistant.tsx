"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The AI planner's mascot, from the reference sheet's screen 2.
 *
 * Adapted from the supplied `robot-hero` component, with the parts that don't
 * belong here removed:
 *  - the e-commerce navbar (Product/About/Specs/Reviews, "Buy Now") — this is
 *    an assistant beside a form, not a product hero,
 *  - `react-icons` — the project standardises on lucide-react,
 *  - drei's <Environment preset="studio">, which fetches an HDRI from a public
 *    CDN. Every material here is fully diffuse (`envMapIntensity: 0`, the head
 *    is roughness 1 / metalness 0), so it contributed nothing visible while
 *    adding a blocking network request,
 *  - shadow maps and <ContactShadows>, which are invisible at panel size and
 *    cost the most per frame.
 *
 * Geometry segments, texture size and speckle count are all reduced from the
 * original hero values — this renders in a ~320px panel, not full-bleed.
 */

/** Heart path used for the "happy" eyes. */
class HeartCurve extends THREE.Curve<THREE.Vector3> {
  // three's Curve constructor is `protected`; an explicit public one is needed
  // before this can be instantiated outside the class.
  constructor() {
    super();
  }

  getPoint(t: number, optionalTarget = new THREE.Vector3()) {
    t = t * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return optionalTarget.set(x * 0.002, (y + 6) * 0.002, 0);
  }
}

const sharedHeartCurve = new HeartCurve();

export type RobotMood = "idle" | "thinking" | "happy" | "speaking";

/** Visor glow per mood — violet to match the design system. */
const MOOD_VISOR: Record<RobotMood, { color: string; intensity: number }> = {
  idle: { color: "#7c5cff", intensity: 1.15 },
  thinking: { color: "#a78bfa", intensity: 1.7 },
  happy: { color: "#8b5cf6", intensity: 1.5 },
  // Base value for "speaking" — GlassCapsule layers a pulse on top of this so
  // the visor visibly throbs in time with the assistant's voice, the one
  // signal that survives even under prefers-reduced-motion (no head bob then).
  speaking: { color: "#22d3ee", intensity: 1.6 },
};

function ResponsiveGroup({ children, scale = 1 }: { children: React.ReactNode; scale?: number }) {
  const { viewport } = useThree();
  // The robot stands ~1.6 world units tall. The cap keeps it inside the
  // frustum height (~3.3 units at this camera) with margin for the antennae,
  // while the width divisor shrinks it on narrow panels instead of clipping.
  const s = Math.min(1.55, viewport.width / 2.4) * scale;
  return <group scale={s}>{children}</group>;
}

function GlassCapsule({ moodRef }: { moodRef: React.RefObject<RobotMood> }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      color: { value: new THREE.Color(MOOD_VISOR.idle.color) },
      power: { value: 3.8 },
      intensity: { value: MOOD_VISOR.idle.intensity },
    }),
    []
  );

  useFrame(({ clock }, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    const mood = moodRef.current ?? "idle";
    const target = MOOD_VISOR[mood];
    // Ease between moods so the visor doesn't pop when the step changes.
    mat.uniforms.color.value.lerp(new THREE.Color(target.color), Math.min(delta * 6, 1));
    // A fast pulse on top of the base intensity — the one "I'm talking" tell
    // that still reads even under prefers-reduced-motion, where the head-bob
    // in RobotModel is disabled entirely.
    const pulse = mood === "speaking" ? Math.sin(clock.elapsedTime * 11) * 0.5 + 0.5 : 0;
    mat.uniforms.intensity.value = THREE.MathUtils.lerp(
      mat.uniforms.intensity.value,
      target.intensity + pulse * 0.9,
      Math.min(delta * 10, 1)
    );
  });

  return (
    <mesh>
      <sphereGeometry args={[0.3, 32, 32, 0, Math.PI * 2, 0, Math.PI]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 color;
          uniform float power;
          uniform float intensity;
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
            fresnel = pow(fresnel, power);
            gl_FragColor = vec4(color, fresnel * intensity);
          }
        `}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

const earBaseMat = new THREE.MeshStandardMaterial({ color: "#f0f0f0", roughness: 0.5 });
const earRingMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3 });
const earCenterMat = new THREE.MeshStandardMaterial({ color: "#cccccc", roughness: 0.8 });
const antennaBaseMat = new THREE.MeshStandardMaterial({
  color: "#999999",
  roughness: 0.4,
  metalness: 0.5,
});
const antennaStickMat = new THREE.MeshStandardMaterial({
  color: "#d0d0d0",
  roughness: 0.4,
  metalness: 0.2,
});
const antennaTipMat = new THREE.MeshStandardMaterial({
  color: "#7c5cff",
  roughness: 0.2,
  toneMapped: false,
});

function RobotEar({
  position,
  scale = 1,
  isLeft = false,
}: {
  position: [number, number, number];
  scale?: number;
  isLeft?: boolean;
}) {
  const dir = isLeft ? -1 : 1;
  return (
    <group position={position} scale={scale}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={earBaseMat}>
        <cylinderGeometry args={[0.04, 0.04, 0.025, 24]} />
      </mesh>
      <mesh position={[dir * 0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={earRingMat}>
        <torusGeometry args={[0.032, 0.008, 12, 24]} />
      </mesh>
      <mesh position={[dir * 0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={earCenterMat}>
        <cylinderGeometry args={[0.03, 0.03, 0.005, 24]} />
      </mesh>
      <group position={[dir * 0.015, 0.035, 0]} rotation={[-0.4, 0, 0]}>
        <mesh position={[0, 0.01, 0]} material={antennaBaseMat}>
          <cylinderGeometry args={[0.006, 0.008, 0.02, 12]} />
        </mesh>
        <mesh position={[0, 0.06, 0]} material={antennaStickMat}>
          <cylinderGeometry args={[0.003, 0.003, 0.1, 8]} />
        </mesh>
        <mesh position={[0, 0.11, 0]} material={antennaTipMat}>
          <sphereGeometry args={[0.006, 12, 12]} />
        </mesh>
      </group>
    </group>
  );
}

const eyeMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color(2, 2, 2),
  toneMapped: false,
  transparent: true,
});
const heartMat = new THREE.MeshBasicMaterial({ color: "#a78bfa", toneMapped: false });

function RobotEye({
  position,
  rotation,
  scale = 1,
  blinkDuration = 0.45,
  blinkCycle = 3.0,
  moodRef,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
  blinkDuration?: number;
  blinkCycle?: number;
  moodRef: React.RefObject<RobotMood>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const normalEyesRef = useRef<THREE.Group>(null);
  const heartEyeRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !normalEyesRef.current || !heartEyeRef.current) return;

    const isHeart = moodRef.current === "happy";
    normalEyesRef.current.visible = !isHeart;
    heartEyeRef.current.visible = isHeart;

    const cycle = clock.getElapsedTime() % blinkCycle;
    let targetScaleY = 1;
    if (cycle < blinkDuration && !isHeart) {
      const progress = cycle / blinkDuration;
      targetScaleY = Math.max(0.05, 1.0 - Math.sin(progress * Math.PI));
    }
    groupRef.current.scale.set(scale, scale * targetScaleY, scale);
  });

  const { topPath, bottomPath } = useMemo(() => {
    const w = 0.025;
    const h = 0.035;
    const r = 0.02;
    const g = 0.005;

    const arc = (sign: number) => {
      const path = new THREE.CurvePath<THREE.Vector3>();
      const H = h * sign;
      const R = r * sign;
      const G = g * sign;
      path.add(new THREE.LineCurve3(new THREE.Vector3(-w, G, 0), new THREE.Vector3(-w, H - R, 0)));
      path.add(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-w, H - R, 0),
          new THREE.Vector3(-w, H, 0),
          new THREE.Vector3(-w + r, H, 0)
        )
      );
      path.add(new THREE.LineCurve3(new THREE.Vector3(-w + r, H, 0), new THREE.Vector3(w - r, H, 0)));
      path.add(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(w - r, H, 0),
          new THREE.Vector3(w, H, 0),
          new THREE.Vector3(w, H - R, 0)
        )
      );
      path.add(new THREE.LineCurve3(new THREE.Vector3(w, H - R, 0), new THREE.Vector3(w, G, 0)));
      return path;
    };

    return { topPath: arc(1), bottomPath: arc(-1) };
  }, []);

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh ref={heartEyeRef} visible={false} material={heartMat}>
        <tubeGeometry args={[sharedHeartCurve, 48, 0.0035, 6, true]} />
      </mesh>
      <group ref={normalEyesRef}>
        <mesh material={eyeMat}>
          <tubeGeometry args={[topPath, 16, 0.0035, 6, false]} />
        </mesh>
        <mesh material={eyeMat}>
          <tubeGeometry args={[bottomPath, 16, 0.0035, 6, false]} />
        </mesh>
      </group>
    </group>
  );
}

/** Speckled chassis texture, generated on a canvas so nothing has to be fetched. */
function generateChassisTextures() {
  const size = 256;
  const canvasC = document.createElement("canvas");
  const canvasB = document.createElement("canvas");
  canvasC.width = canvasB.width = size;
  canvasC.height = canvasB.height = size;
  const ctxC = canvasC.getContext("2d");
  const ctxB = canvasB.getContext("2d");

  if (ctxC && ctxB) {
    ctxC.fillStyle = "#dcdcdc";
    ctxC.fillRect(0, 0, size, size);
    ctxB.fillStyle = "#808080";
    ctxB.fillRect(0, 0, size, size);

    for (let i = 0; i < 3500; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 0.5 + Math.random() * 1.2;
      const isDark = Math.random() > 0.15;

      ctxC.beginPath();
      ctxC.arc(x, y, r, 0, Math.PI * 2);
      ctxC.fillStyle = isDark ? "#222222" : "#dddddd";
      ctxC.fill();

      ctxB.beginPath();
      ctxB.arc(x, y, r, 0, Math.PI * 2);
      ctxB.fillStyle = isDark ? "#000000" : "#ffffff";
      ctxB.fill();
    }
  }

  const colorMap = new THREE.CanvasTexture(canvasC);
  const bumpMap = new THREE.CanvasTexture(canvasB);
  colorMap.wrapS = bumpMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = bumpMap.wrapT = THREE.RepeatWrapping;
  colorMap.repeat.set(5, 2.5);
  bumpMap.repeat.set(5, 2.5);
  return { colorMap, bumpMap };
}

function RobotModel({
  moodRef,
  reducedMotion,
  onPoke,
}: {
  moodRef: React.RefObject<RobotMood>;
  reducedMotion: boolean;
  onPoke?: () => void;
}) {
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  // Generated once, in a lazy initializer rather than an effect — this whole
  // component is loaded with `ssr: false`, so `document` exists on first render
  // and there's no reason to pay an extra render for it.
  const [textures] = useState(generateChassisTextures);

  // GPU memory isn't garbage-collected — the textures must be released by hand.
  useEffect(
    () => () => {
      textures.colorMap.dispose();
      textures.bumpMap.dispose();
    },
    [textures]
  );

  useFrame((state, delta) => {
    if (!bodyRef.current || !headRef.current || reducedMotion) return;
    const dt = Math.min(delta, 0.1);
    const tx = state.pointer.x;
    const ty = state.pointer.y;

    // Sways toward the cursor, but stays put — it lives in a fixed panel, so
    // the hero's horizontal travel is dropped.
    bodyRef.current.rotation.y = THREE.MathUtils.lerp(bodyRef.current.rotation.y, -tx * 0.45, 8 * dt);
    bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, -ty * 0.18, 8 * dt);
    bodyRef.current.rotation.z = THREE.MathUtils.lerp(bodyRef.current.rotation.z, -tx * 0.09, 8 * dt);

    headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, tx * 0.85, 14 * dt);

    // A visible "I'm talking" nod, distinct from the idle/thinking states,
    // which only ever sway toward the cursor — this is the one motion that
    // exists purely because the assistant's TTS is currently playing audio
    // (driven by Vapi's real speech-start/speech-end events, not a timer).
    if (moodRef.current === "speaking") {
      const t = state.clock.elapsedTime;
      headRef.current.rotation.x = THREE.MathUtils.lerp(
        headRef.current.rotation.x,
        -ty * 0.3 + Math.sin(t * 15) * 0.05,
        14 * dt
      );
      headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, Math.sin(t * 8) * 0.045, 10 * dt);
      headRef.current.position.y = THREE.MathUtils.lerp(headRef.current.position.y, 0.6 + Math.sin(t * 15) * 0.012, 14 * dt);
    } else {
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -ty * 0.3, 14 * dt);
      headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, 0, 8 * dt);
      headRef.current.position.y = THREE.MathUtils.lerp(headRef.current.position.y, 0.6, 8 * dt);
    }
  });

  const neckProfile = useMemo(() => {
    const p = {
      baseR: 0.215,
      baseH: -0.05,
      midR: 0.28,
      midH: 0.02,
      lipBottomR: 0.295,
      lipBottomH: 0.045,
      lipTopR: 0.27,
      lipTopH: 0.055,
      innerR: 0.1,
    };
    return [
      new THREE.Vector2(p.innerR, p.baseH),
      new THREE.Vector2(p.baseR, p.baseH),
      new THREE.Vector2(p.midR, p.midH),
      new THREE.Vector2(p.lipBottomR, p.lipBottomH),
      new THREE.Vector2(p.lipTopR, p.lipTopH),
      new THREE.Vector2(p.innerR, p.lipTopH),
    ];
  }, []);

  const headMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#141420", roughness: 1, metalness: 0 }),
    []
  );

  if (!textures) return null;

  const chassis = (
    <meshStandardMaterial
      color="#c9c9d2"
      map={textures.colorMap}
      bumpMap={textures.bumpMap}
      bumpScale={0.005}
      roughness={1}
      metalness={0}
      envMapIntensity={0}
    />
  );

  function handlePoke(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    onPoke?.();
  }

  return (
    <group
      ref={bodyRef}
      position={[0, -0.28, 0]}
      onPointerDown={handlePoke}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <mesh>
        <sphereGeometry args={[0.43, 40, 40, 0, Math.PI * 2, Math.PI * 0.15, Math.PI * 0.85]} />
        {chassis}
      </mesh>

      <mesh position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.235, 0.025, 20, 40]} />
        {chassis}
      </mesh>

      <mesh position={[0, 0.38, 0]}>
        <latheGeometry args={[neckProfile, 40]} />
        {chassis}
      </mesh>

      <group ref={headRef} position={[0, 0.6, 0]}>
        <mesh material={headMat}>
          <sphereGeometry args={[0.28, 40, 40, 0, Math.PI * 2, 0, Math.PI]} />
        </mesh>

        <GlassCapsule moodRef={moodRef} />

        <group position={[0, -0.02, 0.29]}>
          <RobotEye position={[-0.07, 0, 0]} rotation={[0, -0.2, 0]} scale={1.1} moodRef={moodRef} />
          <RobotEye position={[0.07, 0, 0]} rotation={[0, 0.2, 0]} scale={1.1} moodRef={moodRef} />
        </group>

        <RobotEar position={[-0.29, 0, 0]} isLeft scale={1.3} />
        <RobotEar position={[0.29, 0, 0]} scale={1.3} />
      </group>
    </group>
  );
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function RobotAssistant({
  mood = "idle",
  onPoke,
  className,
}: {
  mood?: RobotMood;
  onPoke?: () => void;
  className?: string;
}) {
  const moodRef = useRef<RobotMood>(mood);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  // An OS-level media query is external state, so useSyncExternalStore is the
  // right tool — it reads during render and stays subscribed, with no effect
  // and no extra render on mount.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false
  );

  // Decorative: the assistant's actual content is the speech bubble beside it,
  // which is real text. Hidden from assistive tech so it isn't announced twice.
  return (
    <div className={className} aria-hidden>
      <Canvas
        camera={{ position: [0, 0.1, 4.6], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.85} color="#ffffff" />
        <directionalLight position={[2, 4, 3]} intensity={0.55} color="#ffffff" />
        <directionalLight position={[-3, 1, -2]} intensity={0.25} color="#c9b8ff" />
        <ResponsiveGroup>
          <RobotModel moodRef={moodRef} reducedMotion={reducedMotion} onPoke={onPoke} />
        </ResponsiveGroup>
      </Canvas>
    </div>
  );
}

export default RobotAssistant;
