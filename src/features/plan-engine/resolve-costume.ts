import { generateMockPlan } from "@/lib/mockPlan";
import type { CostumePlanPayload, PlatformSearchItem, Risk, ScheduleItem, StageInputData } from "@/lib/stageos";

export type CostumeResolution = {
  costumePlan: CostumePlanPayload;
  risks: Risk[];
  reverseSchedule: ScheduleItem[];
  platformSearch: PlatformSearchItem[];
};

/**
 * 生成服装与采购搜索标签。
 * 复用现有本地确定性引擎(知识库驱动),输出结构保持不变,
 * 差别仅在调用方必须携带 provenance(见 generate-plan.ts)。
 */
export function resolveCostume(input: StageInputData): CostumeResolution {
  const { costumePlan, risks, reverseSchedule, platformSearch } = generateMockPlan(input);
  return { costumePlan, risks, reverseSchedule, platformSearch };
}
