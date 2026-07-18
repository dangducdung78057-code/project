import type { ConstraintResult, SourceProvenance } from "./types";
import { PALETTE_VERSION } from "@/lib/paletteLibrary";

/** 领域数据契约版本(StageEditorSnapshot / plan_snapshots.schema_version)。 */
export const STAGEOS_SCHEMA_VERSION = "1.0.0";

/** 知识库版本(stage-knowledge.ts 语料,与 _shared 单一事实来源对齐)。 */
export const KNOWLEDGE_VERSION = "2026.07.stage-knowledge";

/** 反向约束规则版本(65 条规则语料)。 */
export const CONSTRAINT_VERSION = "2026.07.stage-constraints";

/** 色库版本直接复用 _shared 单一事实来源的 PALETTE_VERSION。 */
export const PALETTE_LIB_VERSION: string = PALETTE_VERSION;

export type PlanEngineKind = SourceProvenance["engine"];

/**
 * 构造一次生成的来源标识。所有生成结果(方案/队形/配色)必须携带,
 * 界面上以 engineModeLabel 展示,不得隐藏本地回退事实。
 */
export function buildProvenance(
  engine: PlanEngineKind,
  warnings: ConstraintResult[] = [],
  sources: SourceProvenance["sources"] = [],
): SourceProvenance {
  return {
    engine,
    generatedAt: new Date().toISOString(),
    knowledgeVersion: KNOWLEDGE_VERSION,
    constraintVersion: CONSTRAINT_VERSION,
    paletteVersion: PALETTE_LIB_VERSION,
    sources: [
      { kind: "knowledge", ref: "_shared/stage-knowledge.ts", note: "队形模板 × 服装款式 × 配色语料" },
      { kind: "palette", ref: "_shared/palette-library.ts", note: "853 中国传统色库" },
      { kind: "constraint", ref: "_shared/stage-constraints.ts", note: "反向约束规则" },
      ...sources,
    ],
    warnings,
  };
}

/**
 * plan_snapshots.mode / provider_status 的中文展示标签。
 * 历史 'mock' 数据如实显示为「本地规则(旧)」,不再伪装为最终方案。
 */
export function engineModeLabel(mode: string | null | undefined, providerStatus?: string | null): string {
  if (providerStatus === "fallback") return "已回退本地规则";
  switch (mode) {
    case "local-rules":
      return "本地规则生成";
    case "ai":
    case "ai-assisted":
      return "AI 增强生成";
    case "mock":
      return "本地规则(旧)";
    default:
      return mode ? `未知来源(${mode})` : "未生成";
  }
}
