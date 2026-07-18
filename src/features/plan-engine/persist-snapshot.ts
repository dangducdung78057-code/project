import { STAGEOS_SCHEMA_VERSION } from "@/domain/stageos/provenance";
import type { StagePlanResult } from "./generate-plan";

/**
 * 把引擎结果映射为 plan_snapshots 插入行。
 * - mode 统一写 'local-rules'(本地规则引擎)或 'ai'(AI 增强),不再写 'mock'
 * - engine / schema_version / provenance / warnings 列由
 *   20260719090000_stageos_mainline.sql 迁移提供
 * 快照不可变:每次生成都 insert 新行,version 由调用方取 max(version)+1。
 */
export function toPlanSnapshotInsert(args: {
  projectId: string;
  userId: string;
  version: number;
  result: StagePlanResult;
}) {
  const { projectId, userId, version, result } = args;
  return {
    project_id: projectId,
    user_id: userId,
    version,
    mode: "local-rules",
    engine: result.provenance.engine,
    provider_status: null as string | null,
    schema_version: STAGEOS_SCHEMA_VERSION,
    costume_plan: result.costumePlan,
    risks: result.risks,
    reverse_schedule: result.reverseSchedule,
    platform_search: result.platformSearch,
    provenance: result.provenance,
    warnings: result.warnings,
  };
}
