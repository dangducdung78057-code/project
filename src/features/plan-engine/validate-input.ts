import type { StageInputData } from "@/lib/stageos";
import type { ConstraintResult } from "@/domain/stageos/types";

export type InputValidation = {
  errors: string[];
  warnings: ConstraintResult[];
};

/**
 * 引擎级输入校验(确定性,无外部依赖)。
 * 页面层的 validateStageInputDetailed 仍然保留,此处是方案引擎的保底校验。
 */
export function validateInput(input: StageInputData): InputValidation {
  const errors: string[] = [];
  const warnings: ConstraintResult[] = [];

  const total = (input.maleCount ?? 0) + (input.femaleCount ?? 0);
  if (!input.programType) errors.push("缺少节目类型");
  if (total <= 0) errors.push("表演人数必须大于 0");
  if (total > 200) {
    warnings.push({
      ruleId: "engine-input-001",
      level: "soft",
      scope: "formation",
      reason: `当前人数 ${total} 超出常见团体规模(≤200),队形与服装统计可能失真`,
      alternative: "确认人数填写无误,或拆分为多个节目",
    });
  }
  if (input.venueType === "操场" && input.weather === "雨天") {
    warnings.push({
      ruleId: "engine-input-002",
      level: "hard",
      scope: "stage",
      reason: "户外操场 + 雨天:地面积水湿滑,跳跃/旋转类动作存在安全风险",
      alternative: "移至室内体育馆,或将动作强度降级为中低强度",
    });
  }
  if (input.movementIntensity === "高" && input.costumeForm === "长款") {
    warnings.push({
      ruleId: "engine-input-003",
      level: "soft",
      scope: "costume",
      reason: "高强度动作搭配长款服装,存在踩摆/勾挂风险",
      alternative: "改短款或高开衩设计,裙摆控制在小腿中部以上",
    });
  }
  return { errors, warnings };
}
