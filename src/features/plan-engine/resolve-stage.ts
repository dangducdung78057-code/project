import type { KnowledgeRetrieval } from "@/lib/stageKnowledge";
import type { StageInputData } from "@/lib/stageos";

/** 舞台/背景/道具建议(本地规则,来自知识库 archetype 与输入快照)。 */
export type StageAdvice = {
  venueType: string;
  screenThemeColor: string;
  ledScreenTone: string;
  audioEnvironment: string;
  lightingStyle: string;
  backdropNote: string;
  props: string[];
};

export function resolveStage(input: StageInputData, knowledge: KnowledgeRetrieval): StageAdvice {
  const archetype = knowledge.archetype;
  return {
    venueType: input.venueType || "未填写",
    screenThemeColor: input.screenThemeColor || "未指定",
    ledScreenTone: input.ledScreenTone || "未指定",
    audioEnvironment: input.audioEnvironment || "未指定",
    lightingStyle: archetype?.lightingStyle ?? "基础白光 + 面光均匀铺底",
    backdropNote: archetype
      ? `参考「${archetype.label}」原型:${archetype.referenceExample}`
      : "未命中节目原型,按场地类型使用通用背景",
    props: [],
  };
}
