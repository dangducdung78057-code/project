import type { StageInputData } from "@/lib/stageos";
import type { ConstraintResult } from "@/domain/stageos/types";

export type InputValidation = {
  errors: string[];
  warnings: ConstraintResult[];
};

// 场地/备注文本启发式:StageInputData 当前没有结构化天气/动作强度/服装廓形字段,
// 在结构化字段落地前,用 venueType / specialExpectation / programTheme / programType
// 的确定性文本匹配兜底同一批安全规则。
const OUTDOOR_RE = /户外|操场|室外|露天/;
const RAIN_RE = /雨|梅雨|雷暴/;
const HIGH_MOVEMENT_PROGRAM_RE = /街舞|爵士|啦啦操|武术|杂技|现代|modern|jazz|street|cheerleading|acrobatics/i;
const HIGH_MOVEMENT_TEXT_RE = /高动作|高强度|跳跃|托举|翻滚|快速走位/;
const LONG_COSTUME_RE = /长款|长裙|长袍|大摆|曳地/;

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

  const venueText = input.venueType ?? "";
  const noteText = `${input.specialExpectation ?? ""} ${input.programTheme ?? ""}`;
  if (OUTDOOR_RE.test(venueText) && RAIN_RE.test(noteText)) {
    warnings.push({
      ruleId: "engine-input-002",
      level: "hard",
      scope: "stage",
      reason: "户外场地 + 雨天风险:地面积水湿滑,跳跃/旋转类动作存在安全风险",
      alternative: "移至室内体育馆,或将动作强度降级为中低强度",
    });
  }

  const highMovement =
    HIGH_MOVEMENT_PROGRAM_RE.test(input.programType ?? "") || HIGH_MOVEMENT_TEXT_RE.test(noteText);
  if (highMovement && LONG_COSTUME_RE.test(noteText)) {
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
