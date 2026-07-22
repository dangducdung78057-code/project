import { extractEditorSnapshot } from "@/stores/stage-editor-store";

/** 2.5D 共享快照中的站位(米制,与 3D 同约定:x 横向,z 正值朝观众) */
export type SnapshotPositionMap = Map<string, { x: number; z: number }>;

/**
 * 从 stage_inputs.data 中提取 2.5D 工作台保存的共享快照(__stageEditor),
 * 并把匿名编号转换为 3D 编辑器的人物 id:
 *   快照 anonId "S001" → 3D id "S01"(编号数字一致,仅位数不同)。
 * 无快照或快照为空时返回 null,调用方保持原有初始化逻辑。
 */
export function extractSnapshotPositions(data: unknown): SnapshotPositionMap | null {
  const snap = extractEditorSnapshot(data);
  if (!snap || !Array.isArray(snap.performers) || snap.performers.length === 0) return null;
  const map: SnapshotPositionMap = new Map();
  for (const p of snap.performers) {
    const n = Number.parseInt(String(p.anonId).replace(/\D/g, ""), 10);
    if (!Number.isFinite(n) || n <= 0) continue;
    map.set(`S${String(n).padStart(2, "0")}`, { x: p.position.x, z: p.position.z });
  }
  return map.size > 0 ? map : null;
}
