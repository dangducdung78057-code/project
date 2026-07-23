import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

// 联调对象：girl-10y 低模 walk v2（IK 接触相返工版，stageos-unified 任务3分支 raw 直读）
const GLB_URL =
  "https://raw.githubusercontent.com/dangducdung78057-code/stageos-unified/refs/heads/assets/v2-task3-girl10y-lowpoly/assets/sprites/girl-10y-school/lowpoly/girl-10y-school.glb";

// 防滑步地速：walk v2 GLB 脚骨 FK 轨迹实测（趾骨匀速后退段）
// 左脚 0.599 / 右脚 0.597 m/s，CV 10.8–11.3%，贴地相 60% → 取 0.60 m/s 为基准
// （v1 因无贴地相全程滑步打回；v2 复测达标。理论公式估算不可信，一律以实测为准）
const DESIGN_HEIGHT_M = 1.3;
const DEFAULT_SPEED = 0.6;
const PATH_LEFT = -3;
const PATH_RIGHT = 3;

interface ModelMeta {
  clips: string[];
  rawHeight: number;
}

interface ActorProps {
  targetX: number | null;
  speed: number;
  faceOffsetDeg: number;
  onArrive: () => void;
  onMeta: (m: ModelMeta) => void;
}

function Actor({ targetX, speed, faceOffsetDeg, onArrive, onMeta }: ActorProps) {
  const gltf = useGLTF(GLB_URL);
  const outer = useRef<THREE.Group>(null!);
  const { actions } = useAnimations(gltf.animations, outer);
  const [scale, setScale] = useState(1);
  const dirRef = useRef(1);
  const moving = targetX !== null;

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const h = box.max.y - box.min.y;
    if (h > 0) setScale(DESIGN_HEIGHT_M / h);
    onMeta({
      clips: gltf.animations.map((a) => `${a.name} ${a.duration.toFixed(2)}s`),
      rawHeight: h,
    });
  }, [gltf, onMeta]);

  useEffect(() => {
    const name = moving ? "walk" : "idle";
    const next = actions[name];
    if (!next) return;
    next.reset().fadeIn(0.25).play();
    return () => {
      next.fadeOut(0.25);
    };
  }, [moving, actions]);

  useFrame((_, delta) => {
    const g = outer.current;
    if (!g || targetX === null) return;
    const dx = targetX - g.position.x;
    dirRef.current = Math.sign(dx) || 1;
    g.rotation.y = Math.atan2(dirRef.current, 0) + THREE.MathUtils.degToRad(faceOffsetDeg);
    const step = speed * delta;
    if (Math.abs(dx) <= step) {
      g.position.x = targetX;
      onArrive();
    } else {
      g.position.x += dirRef.current * step;
    }
  });

  return (
    <group ref={outer} scale={[scale, scale, scale]} position={[PATH_LEFT, 0, 0]}>
      <primitive object={gltf.scene} />
    </group>
  );
}

class GlbErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center p-8 text-center text-sm text-red-500">
          GLB 加载失败：{this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LowpolyPilot() {
  const [targetX, setTargetX] = useState<number | null>(null);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [faceOffset, setFaceOffset] = useState(0);
  const [meta, setMeta] = useState<ModelMeta | null>(null);
  const onMeta = useCallback((m: ModelMeta) => setMeta(m), []);
  const onArrive = useCallback(() => setTargetX(null), []);

  return (
    <main className="relative h-screen w-full bg-slate-900">
      <GlbErrorBoundary>
        <Canvas camera={{ position: [4, 2.5, 5], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 4]} intensity={1.1} />
          <gridHelper args={[12, 12, "#475569", "#334155"]} />
          <Suspense fallback={null}>
            <Actor
              targetX={targetX}
              speed={speed}
              faceOffsetDeg={faceOffset}
              onArrive={onArrive}
              onMeta={onMeta}
            />
          </Suspense>
          <OrbitControls target={[0, 0.8, 0]} />
        </Canvas>
      </GlbErrorBoundary>

      <div className="absolute left-4 top-4 w-72 space-y-3 rounded-lg bg-black/60 p-4 text-xs text-slate-100">
        <h1 className="text-sm font-semibold">低模联调试点 · girl-10y（walk v2）</h1>
        <div>
          <p className="text-slate-400">剪辑（浏览器实读）</p>
          {meta ? meta.clips.map((c) => <p key={c}>· {c}</p>) : <p>模型加载中…</p>}
        </div>
        {meta && (
          <p className="text-slate-400">
            原始包围盒高 {meta.rawHeight.toFixed(3)}（已归一到 {DESIGN_HEIGHT_M}m）
          </p>
        )}
        <label className="block">
          地速 {speed.toFixed(2)} m/s（v2 实测基准 0.60，微调用）
          <input
            type="range"
            min={0.3}
            max={1.2}
            step={0.02}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full"
          />
        </label>
        <label className="block">
          朝向校正 {faceOffset}°（模型若横着走就调这个）
          <input
            type="range"
            min={-180}
            max={180}
            step={15}
            value={faceOffset}
            onChange={(e) => setFaceOffset(Number(e.target.value))}
            className="w-full"
          />
        </label>
        <div className="flex gap-2">
          <button
            className="rounded bg-emerald-600 px-3 py-1.5 disabled:opacity-40"
            disabled={targetX !== null}
            onClick={() => setTargetX(PATH_RIGHT)}
          >
            走到右端
          </button>
          <button
            className="rounded bg-sky-600 px-3 py-1.5 disabled:opacity-40"
            disabled={targetX !== null}
            onClick={() => setTargetX(PATH_LEFT)}
          >
            走到左端
          </button>
        </div>
        <p className="text-slate-400">
          验收点：walk 循环播放、脚底不滑步、到点自动切 idle、三剪辑齐全。
        </p>
      </div>
    </main>
  );
}

useGLTF.preload(GLB_URL);
