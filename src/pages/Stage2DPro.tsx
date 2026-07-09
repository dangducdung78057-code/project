// 2.5D 卡通队形舞台(独立模块)
// 与 3D 编辑器 (/formation-3d) 完全独立:内置 SVG 卡通男女生纸片人 + Billboard 面向摄像机,
// 脚底径向渐变软阴影 + 性别霓虹光圈 + 悬停悬浮微动画 + 顶头悬浮标签。
import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Users } from "lucide-react";

// ==========================================
// 内置高保真资产:二次元卡通无脸小人 (SVG data URI)
// ==========================================

const SPRITE_BOY = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="560" viewBox="0 0 120 280">
  <path d="M40,25 C30,35 35,55 42,58 C45,45 55,42 60,35 C65,42 75,45 78,58 C85,55 90,35 80,25 C70,15 50,15 40,25 Z" fill="%234B5563"/>
  <path d="M45,28 C50,22 60,20 65,26 C70,22 80,26 82,32 C75,32 70,38 65,34 C58,38 52,32 45,28 Z" fill="%23374151"/>
  <circle cx="60" cy="50" r="22" fill="%23FDE047" opacity="0.85"/>
  <rect x="54" y="68" width="12" height="12" fill="%23FDE047" opacity="0.85"/>
  <path d="M30,80 L90,80 L85,160 L35,160 Z" fill="%23F8FAFC"/>
  <path d="M45,80 L60,95 L75,80 Z" fill="%2360A5FA"/>
  <path d="M57,92 L63,92 L65,120 L60,128 L55,120 Z" fill="%232563EB"/>
  <path d="M30,80 L15,110 L25,115 L35,95 Z" fill="%23F8FAFC"/>
  <path d="M90,80 L105,110 L95,115 L85,95 Z" fill="%23F8FAFC"/>
  <rect x="16" y="115" width="8" height="35" rx="4" fill="%23FDE047" opacity="0.85"/>
  <rect x="96" y="115" width="8" height="35" rx="4" fill="%23FDE047" opacity="0.85"/>
  <rect x="35" y="160" width="22" height="95" rx="4" fill="%231E3A8A"/>
  <rect x="63" y="160" width="22" height="95" rx="4" fill="%231E3A8A"/>
  <rect x="33" y="250" width="24" height="12" rx="6" fill="%231F2937"/>
  <rect x="63" y="250" width="24" height="12" rx="6" fill="%231F2937"/>
</svg>`;

const SPRITE_GIRL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="560" viewBox="0 0 120 280">
  <circle cx="32" cy="35" r="10" fill="%239D174D"/>
  <circle cx="88" cy="35" r="10" fill="%239D174D"/>
  <path d="M35,22 C25,35 40,60 45,55 C48,42 55,42 60,35 C65,42 72,42 75,55 C80,60 95,35 85,22 C75,15 45,15 35,22 Z" fill="%23EC4899"/>
  <circle cx="60" cy="50" r="22" fill="%23FDE047" opacity="0.85"/>
  <rect x="54" y="68" width="12" height="12" fill="%23FDE047" opacity="0.85"/>
  <path d="M32,80 L88,80 L82,150 L38,150 Z" fill="%23F8FAFC"/>
  <path d="M50,84 Q60,94 70,84 Q65,76 60,84 Q55,76 50,84 Z" fill="%23F472B6"/>
  <path d="M38,150 L82,150 L92,200 L28,200 Z" fill="%23DB2777"/>
  <path d="M47,150 L43,200 M56,150 L54,200 M65,150 L66,200 M74,150 L77,200" stroke="%239D174D" stroke-width="1.5"/>
  <rect x="42" y="200" width="10" height="50" fill="%23FDE047" opacity="0.85"/>
  <rect x="68" y="200" width="10" height="50" fill="%23FDE047" opacity="0.85"/>
  <rect x="42" y="225" width="10" height="25" fill="%23F8FAFC"/>
  <rect x="68" y="225" width="10" height="25" fill="%23F8FAFC"/>
  <rect x="39" y="250" width="14" height="12" rx="5" fill="%234C0519"/>
  <rect x="67" y="250" width="14" height="12" rx="5" fill="%234C0519"/>
</svg>`;

// 脚底立体软阴影(径向渐变 SVG)
const SOFT_SHADOW = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 100 100">
  <defs><radialGradient id="rg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="%23000000" stop-opacity="0.6"/><stop offset="60%" stop-color="%23000000" stop-opacity="0.2"/><stop offset="100%" stop-color="%23000000" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="50" cy="50" rx="50" ry="25" fill="url(%23rg)"/>
</svg>`;

// ==========================================
// 数据模型与队形生成
// ==========================================

type Student2D = {
  id: string;
  gender: "boy" | "girl";
  height: number; // cm
  x: number;
  z: number;
};

/** 简单遮挡判定:同列(x 相近)且更靠前(z 更大)有更高的人 → 视线受阻 */
function computeOcclusions(students: Student2D[]): Set<string> {
  const occluded = new Set<string>();
  for (const s of students) {
    for (const other of students) {
      if (other.id === s.id) continue;
      if (Math.abs(other.x - s.x) < 0.45 && other.z > s.z + 0.1 && other.height >= s.height) {
        occluded.add(s.id);
        break;
      }
    }
  }
  return occluded;
}

function buildGrid(boys: number, girls: number): Student2D[] {
  const total = boys + girls;
  const cols = Math.ceil(Math.sqrt(total * 1.4));
  const list: Student2D[] = [];
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const gender: "boy" | "girl" = i < boys ? "boy" : "girl";
    list.push({
      id: `${gender === "boy" ? "B" : "G"}${String(i + 1).padStart(2, "0")}`,
      gender,
      height: 120 + Math.round(Math.sin(i * 7.3) * 8 + (i % 5) * 4),
      x: (col - (cols - 1) / 2) * 1.1,
      z: -row * 1.2,
    });
  }
  return list;
}

// ==========================================
// 2.5D 渲染节点:Billboard 纸片人 + 软阴影 + 霓虹圈 + 悬浮标签
// ==========================================

function ProBillboardAvatar({
  student,
  isOccluded,
  isSelected,
  onClick,
}: {
  student: Student2D;
  isOccluded: boolean;
  isSelected: boolean;
  onClick: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  // 加载贴图资产
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(student.gender === "boy" ? SPRITE_BOY : SPRITE_GIRL);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [student.gender]);
  const shadowTexture = useMemo(() => new THREE.TextureLoader().load(SOFT_SHADOW), []);

  const heightInMeters = student.height / 100;
  const widthInMeters = heightInMeters * 0.43; // 纸片人宽高比

  // 帧循环注入平滑起伏的"呼吸感"微动画
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    let targetY = 0;
    if (hovered || isSelected) {
      // 悬停/选中:优雅上浮 0.15 米 + 快速轻微起伏
      targetY = 0.15 + Math.sin(t * 4) * 0.03;
    } else {
      targetY = Math.sin(t * 2 + student.x) * 0.01;
    }
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.1);
  });

  return (
    <group position={[student.x, 0, student.z]}>
      {/* 1. 独立静态软阴影面片:紧贴地面,不随人物悬浮上升 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial map={shadowTexture} transparent opacity={hovered ? 0.8 : 0.5} depthWrite={false} />
      </mesh>

      {/* 2. 状态/性别霓虹发光圈:蓝=男 粉=女 绿=选中 红=视线受阻 */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.32, 32]} />
        <meshBasicMaterial
          color={isOccluded ? "#EF4444" : isSelected ? "#10B981" : student.gender === "boy" ? "#3B82F6" : "#EC4899"}
          transparent
          opacity={isOccluded ? 0.9 : 0.6}
        />
      </mesh>

      {/* 动画包裹外壳 */}
      <group ref={groupRef}>
        {/* 3. Billboard 永远面向摄像机 */}
        <Billboard follow>
          <mesh
            position={[0, heightInMeters / 2, 0]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(true);
            }}
            onPointerOut={() => setHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              onClick(student.id);
            }}
          >
            <planeGeometry args={[widthInMeters, heightInMeters]} />
            <meshBasicMaterial map={texture} transparent alphaTest={0.3} side={THREE.DoubleSide} />
          </mesh>
        </Billboard>

        {/* 4. 顶头悬浮标签 */}
        <Html position={[0, heightInMeters + 0.25, 0]} center distanceFactor={6}>
          <div
            className={`flex flex-col items-center pointer-events-none transition-all duration-300 transform ${
              hovered || isSelected ? "scale-110" : "scale-90 opacity-70"
            }`}
          >
            {isOccluded && (
              <div className="bg-red-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded shadow-md mb-1 animate-bounce whitespace-nowrap">
                视线受阻
              </div>
            )}
            <div
              className={`font-mono text-[11px] px-2 py-0.5 rounded-full shadow-md border text-white transition-colors ${
                isSelected ? "bg-emerald-500 border-emerald-400 font-bold" : "bg-slate-900/90 border-slate-700"
              }`}
            >
              {student.id}:{student.height}
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}

// ==========================================
// 页面
// ==========================================

export default function Stage2DPro() {
  const [boys, setBoys] = useState(12);
  const [girls, setGirls] = useState(12);
  const [seed, setSeed] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const students = useMemo(() => buildGrid(boys, girls), [boys, girls, seed]);
  const occlusions = useMemo(() => computeOcclusions(students), [students]);

  return (
    <main className="h-screen w-full relative bg-slate-950">
      <h1 className="sr-only">2.5D 卡通队形舞台</h1>

      {/* 顶部工具条 */}
      <header className="absolute top-0 left-0 right-0 z-10 flex flex-wrap items-center gap-3 px-4 py-3 bg-slate-900/80 backdrop-blur border-b border-slate-800">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回工作台
        </Link>
        <span className="text-slate-100 font-semibold text-sm flex items-center gap-1.5">
          <Users className="w-4 h-4 text-sky-400" />
          2.5D 卡通队形舞台
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-slate-400 flex items-center gap-1.5">
            男生
            <input
              type="number"
              min={0}
              max={40}
              value={boys}
              onChange={(e) => setBoys(Math.max(0, Math.min(40, Number(e.target.value) || 0)))}
              className="w-14 rounded bg-slate-800 border border-slate-700 px-2 py-1 text-slate-100 text-xs"
            />
          </label>
          <label className="text-xs text-slate-400 flex items-center gap-1.5">
            女生
            <input
              type="number"
              min={0}
              max={40}
              value={girls}
              onChange={(e) => setGirls(Math.max(0, Math.min(40, Number(e.target.value) || 0)))}
              className="w-14 rounded bg-slate-800 border border-slate-700 px-2 py-1 text-slate-100 text-xs"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setSeed((s) => s + 1);
              setSelectedId(null);
            }}
            className="flex items-center gap-1.5 rounded bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重排
          </button>
        </div>
      </header>

      {/* 图例 */}
      <footer className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 rounded-full bg-slate-900/80 backdrop-blur border border-slate-800 px-4 py-1.5 text-[11px] text-slate-300">
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />男生</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" />女生</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />选中</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />视线受阻</span>
      </footer>

      <Canvas
        camera={{ position: [0, 5, 9], fov: 45 }}
        dpr={[1, 1.8]}
        gl={{ outputColorSpace: THREE.SRGBColorSpace, antialias: true }}
        onPointerMissed={() => setSelectedId(null)}
      >
        <color attach="background" args={["#0f172a"]} />
        <fog attach="fog" args={["#0f172a", 18, 34]} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[6, 10, 6]} intensity={0.6} />

        <Grid
          position={[0, 0, -3]}
          args={[30, 24]}
          cellSize={1.1}
          cellThickness={0.6}
          cellColor="#1e3a5f"
          sectionSize={5.5}
          sectionThickness={1.2}
          sectionColor="#2563eb"
          fadeDistance={28}
          infiniteGrid={false}
        />

        {students.map((s) => (
          <ProBillboardAvatar
            key={s.id}
            student={s}
            isOccluded={occlusions.has(s.id)}
            isSelected={selectedId === s.id}
            onClick={(id) => setSelectedId((cur) => (cur === id ? null : id))}
          />
        ))}

        <OrbitControls
          makeDefault
          minDistance={4}
          maxDistance={24}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0.8, -3]}
        />
      </Canvas>
    </main>
  );
}
