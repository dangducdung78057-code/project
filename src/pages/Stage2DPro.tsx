// 2.5D 卡通队形舞台(独立模块)
// 与 3D 编辑器 (/formation-3d) 完全独立:内置 SVG 卡通男女生纸片人 + Billboard 面向摄像机,
// 脚底径向渐变软阴影 + 性别霓虹光圈 + 悬停悬浮微动画 + 顶头悬浮标签。
// 集成智能流程:创意阵型模板(三排/心形/V字) + 视线健康度体检 + 一键智能调换排障 + 选中节点数据浮窗。
import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Users, Sparkles, Layers, CheckCircle } from "lucide-react";

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
// 数据模型、阵型模板与智能算法
// ==========================================

type Student2D = {
  id: string;
  gender: "boy" | "girl";
  height: number; // cm
  x: number;
  z: number;
};

type TemplateId = "Standard" | "Heart" | "VShape";

const TEMPLATES: Array<{ id: TemplateId; name: string; desc: string }> = [
  { id: "Standard", name: "标准三排合唱", desc: "前矮后高阶梯错位矩阵" },
  { id: "Heart", name: "浪漫心形对齐", desc: "适合校庆等高潮汇报剧照" },
  { id: "VShape", name: "动态 V 字前锋", desc: "领唱居前,两翼展开动线" },
];

/** 生成花名册(仅身份信息,不含站位) */
function buildRoster(boys: number, girls: number): Array<Omit<Student2D, "x" | "z">> {
  const total = boys + girls;
  const list: Array<Omit<Student2D, "x" | "z">> = [];
  for (let i = 0; i < total; i++) {
    const gender: "boy" | "girl" = i < boys ? "boy" : "girl";
    list.push({
      id: `${gender === "boy" ? "B" : "G"}${String(i + 1).padStart(2, "0")}`,
      gender,
      height: 128 + Math.round(Math.sin(i * 7.3) * 10 + (i % 5) * 5),
    });
  }
  return list;
}

/** 按阵型模板生成 N 个站位坐标(观众/摄像机在 +z 方向,z 越大越靠前) */
function buildSlots(template: TemplateId, n: number): Array<{ x: number; z: number }> {
  const slots: Array<{ x: number; z: number }> = [];
  if (template === "Standard") {
    const cols = Math.ceil(Math.sqrt(n * 1.4));
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      // 后排横向错位半格,形成阶梯错位矩阵
      const stagger = row % 2 === 1 ? 0.55 : 0;
      slots.push({ x: (col - (cols - 1) / 2) * 1.1 + stagger, z: -row * 1.2 });
    }
  } else if (template === "Heart") {
    const scale = Math.max(1.6, Math.sqrt(n) * 0.62);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = scale * Math.pow(Math.sin(a), 3);
      const z = (scale / 2) * (1.3 * Math.cos(a) - 0.5 * Math.cos(2 * a) - 0.2 * Math.cos(3 * a) - 0.1 * Math.cos(4 * a));
      slots.push({ x, z: z - 1 });
    }
  } else {
    // V 字:领唱居前(z 最大),两翼向后展开
    const mid = Math.floor(n / 2);
    for (let i = 0; i < n; i++) {
      const off = i - mid;
      slots.push({ x: off * 0.9, z: -Math.abs(off) * 0.85 });
    }
  }
  return slots;
}

/**
 * 视线遮挡判定(真实几何计算,非硬编码):
 * 同列(x 相近)且更靠前(z 更大)站着不矮于自己的人 → 该生视线受阻
 */
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

/**
 * 一键智能调换排障(真实算法):
 * 站位按 z 从前到后排序,学生按身高从矮到高分配 → 前排必矮、后排必高,
 * 从根本上消除"高个子挡矮个子"的遮挡。
 */
function assignStudents(
  roster: Array<Omit<Student2D, "x" | "z">>,
  slots: Array<{ x: number; z: number }>,
  optimized: boolean,
): Student2D[] {
  if (!optimized) {
    return roster.map((s, i) => ({ ...s, ...slots[i] }));
  }
  const slotOrder = slots
    .map((slot, i) => ({ slot, i }))
    .sort((a, b) => b.slot.z - a.slot.z); // 前排在先
  const byHeight = [...roster].sort((a, b) => a.height - b.height); // 矮个在先
  const out: Student2D[] = new Array(roster.length);
  slotOrder.forEach(({ slot }, k) => {
    out[k] = { ...byHeight[k], ...slot };
  });
  return out;
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

  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(student.gender === "boy" ? SPRITE_BOY : SPRITE_GIRL);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [student.gender]);
  const shadowTexture = useMemo(() => new THREE.TextureLoader().load(SOFT_SHADOW), []);

  const heightInMeters = student.height / 100;
  const widthInMeters = heightInMeters * 0.43;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    let targetY = 0;
    if (hovered || isSelected) {
      targetY = 0.15 + Math.sin(t * 4) * 0.03;
    } else {
      targetY = Math.sin(t * 2 + student.x) * 0.01;
    }
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.1);
  });

  return (
    <group position={[student.x, 0, student.z]}>
      {/* 独立静态软阴影:紧贴地面,不随人物悬浮上升 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial map={shadowTexture} transparent opacity={hovered ? 0.8 : 0.5} depthWrite={false} />
      </mesh>

      {/* 状态/性别霓虹发光圈:蓝=男 粉=女 绿=选中 红=视线受阻 */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.32, 32]} />
        <meshBasicMaterial
          color={isOccluded ? "#EF4444" : isSelected ? "#10B981" : student.gender === "boy" ? "#3B82F6" : "#EC4899"}
          transparent
          opacity={isOccluded ? 0.9 : 0.6}
        />
      </mesh>

      <group ref={groupRef}>
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
// 主场景工作台(集成全套智能流程控制)
// ==========================================

export default function Stage2DPro() {
  const [boys, setBoys] = useState(12);
  const [girls, setGirls] = useState(12);
  const [template, setTemplate] = useState<TemplateId>("Standard");
  const [isOptimized, setIsOptimized] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const roster = useMemo(() => buildRoster(boys, girls), [boys, girls]);
  const students = useMemo(
    () => assignStudents(roster, buildSlots(template, roster.length), isOptimized),
    [roster, template, isOptimized],
  );
  const occlusions = useMemo(() => computeOcclusions(students), [students]);
  const selected = selectedId ? students.find((s) => s.id === selectedId) : null;

  return (
    <div className="w-full h-screen bg-[#0B0F19] text-slate-200 flex font-sans overflow-hidden">
      <h1 className="sr-only">2.5D 卡通队形舞台</h1>

      {/* 左侧:向导配置面板 */}
      <aside className="w-72 shrink-0 bg-[#111827]/80 backdrop-blur-md border-r border-slate-800 p-5 flex flex-col gap-5 z-10 overflow-y-auto">
        <div>
          <Link to="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" />
            返回工作台
          </Link>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs tracking-wider uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5" /> 一键智能编排
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">2.5D 卡通舞台</h2>
          <p className="text-xs text-slate-400 mt-1">{`已加载 ${roster.length} 名队员身高数据`}</p>
        </div>

        {/* 人数配置 */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 flex items-center gap-1.5 flex-1">
            男生
            <input
              type="number"
              min={0}
              max={40}
              value={boys}
              onChange={(e) => {
                setBoys(Math.max(0, Math.min(40, Number(e.target.value) || 0)));
                setIsOptimized(false);
                setSelectedId(null);
              }}
              className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1 text-slate-100 text-xs"
            />
          </label>
          <label className="text-xs text-slate-400 flex items-center gap-1.5 flex-1">
            女生
            <input
              type="number"
              min={0}
              max={40}
              value={girls}
              onChange={(e) => {
                setGirls(Math.max(0, Math.min(40, Number(e.target.value) || 0)));
                setIsOptimized(false);
                setSelectedId(null);
              }}
              className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1 text-slate-100 text-xs"
            />
          </label>
        </div>

        {/* 傻瓜式一键队形选择器 */}
        <div className="space-y-2.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">1. 选择创意阵型</span>
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                setTemplate(tpl.id);
                setIsOptimized(false);
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                template === tpl.id
                  ? "bg-blue-600/20 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400"
              }`}
            >
              <div>
                <div className="text-sm font-bold text-slate-200">{tpl.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{tpl.desc}</div>
              </div>
              <Layers className={`w-4 h-4 ${template === tpl.id ? "text-blue-400" : "text-slate-600"}`} />
            </button>
          ))}
        </div>

        {/* 智能诊断与一键排障 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 mt-auto space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">2. 视线健康度体检</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono ${
                occlusions.size > 0 ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
              }`}
            >
              {occlusions.size > 0 ? `${occlusions.size} 人受阻` : "检查通过"}
            </span>
          </div>

          {occlusions.size > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {`检测到 ${occlusions.size} 名队员被前排更高的队员挡住视线(红圈标记):`}
                <span className="text-red-400 font-bold font-mono block mt-1">
                  {[...occlusions].slice(0, 8).join(" / ")}
                  {occlusions.size > 8 ? " ..." : ""}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setIsOptimized(true)}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> 一键智能调换排障
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-900/50">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" /> {"完美舞台!当前视野通过率 100%"}
            </div>
          )}

          {isOptimized && (
            <button
              type="button"
              onClick={() => setIsOptimized(false)}
              className="w-full text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              还原为默认排位
            </button>
          )}
        </div>
      </aside>

      {/* 右侧:中央 2.5D 智能舞台渲染画布 */}
      <main className="flex-1 relative">
        {/* 顶层状态提示 */}
        <div className="absolute top-5 left-5 z-10 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 shadow-xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-mono tracking-wide text-slate-400">
            {"舞台环境:室内报告厅 | 聚焦:"}
            <span className="text-white font-bold">{selectedId ?? "未选择"}</span>
          </span>
        </div>

        {/* 图例 */}
        <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 rounded-full bg-slate-900/80 backdrop-blur border border-slate-800 px-4 py-1.5 text-[11px] text-slate-300">
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
          <color attach="background" args={["#0B0F19"]} />
          <fog attach="fog" args={["#0B0F19", 18, 34]} />
          <ambientLight intensity={1.1} />
          <directionalLight position={[6, 10, 6]} intensity={0.6} />

          <Grid
            position={[0, -0.01, -2]}
            args={[30, 24]}
            cellSize={1}
            cellThickness={0.6}
            cellColor="#0F172A"
            sectionSize={5}
            sectionThickness={1.2}
            sectionColor="#1E293B"
            fadeDistance={26}
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
            enablePan={false}
            minDistance={4}
            maxDistance={22}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 0.8, -2]}
          />
        </Canvas>

        {/* 右下角参数浮窗:点击小人时联动 */}
        {selected && (
          <div className="absolute bottom-14 right-5 w-56 bg-slate-950/90 border border-slate-800 rounded-xl p-4 shadow-2xl backdrop-blur-md">
            <div className="text-xs font-bold text-slate-400 mb-2 font-mono flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> SELECTED NODE
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between"><span className="text-slate-500">编号</span><span className="text-blue-400 font-bold">{selected.id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">性别</span><span>{selected.gender === "boy" ? "男生" : "女生"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">身高</span><span className="text-amber-400 font-bold">{selected.height} cm</span></div>
              <div className="flex justify-between"><span className="text-slate-500">坐标 X</span><span>{selected.x.toFixed(2)}m</span></div>
              <div className="flex justify-between"><span className="text-slate-500">坐标 Z</span><span>{selected.z.toFixed(2)}m</span></div>
              <div className="flex justify-between">
                <span className="text-slate-500">视线</span>
                <span className={occlusions.has(selected.id) ? "text-red-400 font-bold" : "text-emerald-400"}>
                  {occlusions.has(selected.id) ? "受阻" : "通畅"}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
