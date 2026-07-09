// [v0] 临时诊断页:逐一渲染真实模型款式的单人预览,用于修正服装叠穿效果。
// 验证完成后删除该文件与对应路由。
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { StudentGlbModel } from "@/components/StudentGlbModel";
import { COSTUME_STYLES } from "@/lib/costumeStyles";

const COLORS = { top: "#c62839", bottom: "#1e2f5c", accent: "#e8c05a" };

function One({ styleId, gender }: { styleId: string; gender: "male" | "female" }) {
  return (
    <div className="flex flex-col items-center">
      <div style={{ width: 200, height: 300 }} className="rounded border border-neutral-700 bg-neutral-900">
        <Canvas camera={{ position: [0, 0.85, 3.6], fov: 32 }} dpr={1} frameloop="demand" onCreated={({ camera }) => camera.lookAt(0, 0.8, 0)}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 5, 4]} intensity={1.2} />
          <Suspense fallback={null}>
            <StudentGlbModel gender={gender} heightM={1.5} colors={COLORS} selected={false} styleId={styleId} />
          </Suspense>
          <gridHelper args={[2, 4, "#444", "#333"]} />
        </Canvas>
      </div>
      <span className="mt-1 text-xs text-neutral-300">
        {styleId} · {gender === "male" ? "男" : "女"}
      </span>
    </div>
  );
}

export default function DevCostume() {
  const params = new URLSearchParams(window.location.search);
  const only = params.get("style");
  const styles = COSTUME_STYLES.filter((s) => s.modelUrl).filter((s) => !only || s.id === only);
  return (
    <div className="min-h-screen bg-neutral-950 p-4">
      <div className="flex flex-wrap gap-3">
        {styles.map((s) => (
          <>
            <One key={`${s.id}-f`} styleId={s.id} gender="female" />
            <One key={`${s.id}-m`} styleId={s.id} gender="male" />
          </>
        ))}
      </div>
    </div>
  );
}
