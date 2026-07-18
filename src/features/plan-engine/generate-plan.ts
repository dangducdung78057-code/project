import type { StageInputData } from "@/lib/stageos";
import type { ConstraintResult, SourceProvenance } from "@/domain/stageos/types";
import { buildProvenance } from "@/domain/stageos/provenance";
import { validateInput } from "./validate-input";
import { retrieveKnowledge } from "./retrieve-knowledge";
import { applyConstraints } from "./apply-constraints";
import { resolvePalette, type PaletteResolution } from "./resolve-palette";
import { resolveCostume, type CostumeResolution } from "./resolve-costume";
import { resolveFormation, type FormationResolution } from "./resolve-formation";
import { resolveStage, type StageAdvice } from "./resolve-stage";
import { buildSchedule } from "./build-schedule";

/** 统一方案输出:服装 + 配色 + 队形 + 舞台 + 风险 + 倒排计划 + 来源标识。 */
export type StagePlanResult = CostumeResolution & {
  visualPlan: {
    palette: PaletteResolution;
    formation: FormationResolution;
    stage: StageAdvice;
  };
  provenance: SourceProvenance;
  warnings: ConstraintResult[];
  knowledge: {
    archetypeId: string | null;
    archetypeLabel: string | null;
    matchedBy: string;
  };
};

export type GeneratePlanOptions = {
  /** 默认本地确定性规则引擎;AI 增强由 Edge Function 路径处理并回退到此。 */
  engine?: "local-rules";
};

/**
 * 统一方案编排器(唯一生成入口)。
 * 处理顺序固定:标准化输入 → 校验 → 检索知识 → 约束 → 配色 →
 * 服装 → 队形 → 舞台 → 倒排 → (调用方负责)写入不可变快照。
 * 默认引擎不依赖任何第三方 Token。
 */
export function generateStagePlan(input: StageInputData, _opts: GeneratePlanOptions = {}): StagePlanResult {
  // 1. 标准化输入:调用方已构造 StageInputData,此处不修改输入。
  // 2. 数据校验
  const validation = validateInput(input);
  if (validation.errors.length > 0) {
    throw new Error(`方案生成前置校验失败:${validation.errors.join(";")}`);
  }
  // 3. 检索知识与参考
  const knowledge = retrieveKnowledge(input);
  // 4. 执行硬禁止 / 软警告 / 提示
  const constraints = applyConstraints(input, knowledge);
  const warnings = [...validation.warnings, ...constraints];
  // 5. 生成配色
  const palette = resolvePalette(knowledge);
  // 6. 生成服装与采购搜索标签
  const costume = resolveCostume(input);
  // 7. 生成队形建议
  const formation = resolveFormation(input, knowledge);
  // 8. 生成舞台/背景/道具建议
  const stage = resolveStage(input, knowledge);
  // 9. 生成倒排计划
  const reverseSchedule = buildSchedule(costume.reverseSchedule);
  // 10. 来源标识(调用方写入不可变快照)
  const provenance = buildProvenance("local-rules", warnings);

  return {
    costumePlan: costume.costumePlan,
    risks: costume.risks,
    platformSearch: costume.platformSearch,
    reverseSchedule,
    visualPlan: { palette, formation, stage },
    provenance,
    warnings,
    knowledge: {
      archetypeId: knowledge.archetype?.id ?? null,
      archetypeLabel: knowledge.archetype?.label ?? null,
      matchedBy: knowledge.matchedBy,
    },
  };
}
