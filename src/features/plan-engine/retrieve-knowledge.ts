import { retrieveStageKnowledge, type KnowledgeRetrieval } from "@/lib/stageKnowledge";
import type { StageInputData } from "@/lib/stageos";

/**
 * 检索节目知识(队形模板 × 服装款式 × 配色)。
 * 数据来源为 _shared 单一事实来源,本地确定性检索,无 Token 依赖。
 */
export function retrieveKnowledge(input: StageInputData): KnowledgeRetrieval {
  return retrieveStageKnowledge({
    programType: input.programType,
    performerCount: input.performerCount,
    screenThemeColor: input.screenThemeColor,
    programTheme: input.programTheme,
  });
}
