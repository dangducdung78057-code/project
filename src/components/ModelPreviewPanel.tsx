// 侧栏「3D 模特预览」面板:独立小型 Canvas 近距离检视当前 .glb 学生模型。
// 交互:左键拖拽旋转 / 滚轮缩放 / 右键平移 / 自动旋转开关 / 重置视角。
// 模型与主场景共享 StudentGlbModel 加载管线(useGLTF 缓存,零重复下载),
// 并跟随传入的性别与服装色系实时换装。
import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { RotateCcw, Play, Pause } from "lucide-react";
import { StudentGlbModel, type StageGroup } from "@/components/StudentGlbModel";
import { cn } from "@/lib/utils";

type PreviewColors = { top: string; bottom: string; accent: string };

/** 预览默认相机位:略微俯视的 3/4 视角 */
const DEFAULT_CAM: [number, number, number] = [1.6, 1.5, 2.4];
const TARGET: [number, number, number] = [0, 0.85, 0];

export function ModelPreviewPanel({
  gender,
  heightM,
  colors,
  stageGroup = "primary",
  styleId = "m-two-piece",
}: {
  gender: "male" | "female";
  heightM: number;
  colors: PreviewColors;
  stageGroup?: StageGroup;
  /** 服装款式预设 id */
  styleId?: string;
}) {
  const [autoRotate, setAutoRotate] = useState(true);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const resetView = () => {
    const c = controlsRef.current;
    if (!c) return;
    c.object.position.set(...DEFAULT_CAM);
    c.target.set(...TARGET);
    c.update();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-medium text-[#9fb3c8]">
          3D 模特预览
          <span className="rounded-full bg-[#262b34] px-2 py-0.5 font-mono text-[10px] text-[#6b7686]">
            {gender === "male" ? "男生" : "女生"} · {(heightM * (150 / 1.7)).toFixed(0)}cm
          </span>
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            aria-pressed={autoRotate}
            title={autoRotate ? "暂停自动旋转" : "开启自动旋转"}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
              autoRotate
                ? "border-[#3aa89e]/50 bg-[#3aa89e]/15 text-[#7fd4cb]"
                : "border-[#343a47] text-[#9fb3c8] hover:bg-[#262b34]",
            )}
          >
            {autoRotate ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button
            type="button"
            onClick={resetView}
            title="重置视角"
            className="flex h-6 w-6 items-center justify-center rounded-md border border-[#343a47] text-[#9fb3c8] transition-colors hover:bg-[#262b34]"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>
      <div className="h-48 overflow-hidden rounded-xl border border-[#2b303b] bg-[#14161b]">
        <Canvas
          camera={{ position: DEFAULT_CAM, fov: 40 }}
          dpr={[1, 1.5]}
          // 与主场景一致:强制 sRGB 输出,预览色与主舞台色完全一致
          gl={{ outputColorSpace: THREE.SRGBColorSpace, antialias: true }}
        >
          {/* 与主场景一致的本地灯光(无外部 HDR 依赖) */}
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 5, 4]} intensity={1.4} />
          <directionalLight position={[-3, 2, -3]} intensity={0.4} color="#bcd6ff" />
          <Suspense fallback={null}>
            <StudentGlbModel
              gender={gender}
              heightM={heightM}
              colors={colors}
              selected={false}
              stageGroup={stageGroup}
              styleId={styleId}
            />
          </Suspense>
          {/* 地面参考圆盘 */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
            <circleGeometry args={[0.85, 40]} />
            <meshBasicMaterial color="#1d2027" />
          </mesh>
          <gridHelper args={[2.4, 8, "#2b303b", "#22262e"]} />
          <OrbitControls
            ref={controlsRef}
            target={TARGET}
            autoRotate={autoRotate}
            autoRotateSpeed={2.2}
            enablePan
            minDistance={1.2}
            maxDistance={5}
            maxPolarAngle={Math.PI / 1.9}
          />
        </Canvas>
      </div>
      <p className="text-[10px] leading-relaxed text-[#6b7686]">拖拽旋转 · 滚轮缩放 · 右键平移</p>
    </div>
  );
}
