import type { StageInputData } from "@/lib/stageos";
import type { KnowledgeRetrieval } from "@/lib/stageKnowledge";
import type { ConstraintResult } from "@/domain/stageos/types";

/**
 * 执行约束层:硬禁止 / 软警告 / 提示。
 * 规则引擎的确定性保底(可离线);65 条语料约束的检索结果
 * 通过 knowledge.appliedRules 已反映在知识层,此处补充输入组合级规则。
 */
export function applyConstraints(input: StageInputData, knowledge: KnowledgeRetrieval): ConstraintResult[] {
  const results: ConstraintResult[] = [];

  if (input.movementIntensity === "高" && (input.ageRange === "小学低段" || input.ageRange === "幼儿园")) {
    results.push({
      ruleId: "engine-constraint-001",
      level: "soft",
      scope: "formation",
      reason: "低龄段不建议高强度连续动作,队形变换频率应降低",
      alternative: "减少走位次数,保留原地律动与手势层次",
    });
  }
  if (input.budgetLevel === "低" && (input.maleCount + input.femaleCount) > 60) {
    results.push({
      ruleId: "engine-constraint-002",
      level: "info",
      scope: "procurement",
      reason: "低预算 + 大团体:建议基础款统一配色,点缀色通过配饰(丝带/腕花)实现",
    });
  }
  if (knowledge.palettes.length === 0) {
    results.push({
      ruleId: "engine-constraint-003",
      level: "info",
      scope: "palette",
      reason: "当前主题未命中专属配色,已回退到节目类型默认配色",
      alternative: "在色库中手动指定主色",
    });
  }
  if (knowledge.formations.length === 0) {
    results.push({
      ruleId: "engine-constraint-004",
      level: "soft",
      scope: "formation",
      reason: "当前节目类型未匹配到专属队形模板,已回退到通用队形库",
    });
  }
  return results;
}
