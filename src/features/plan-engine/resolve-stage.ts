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
  const outdoor = /户外|操场|室外|露天/.test(input.venueType ?? "");
  return {
    venueType: input.venueType || "未填写",
    screenThemeColor: input.screenThemeColor || "未指定",
    ledScreenTone: input.screenThemeColor || "未指定",
    audioEnvironment: outdoor ? "户外扩声,注意风向与声音延迟" : "室内扩声",
    lightingStyle: input.lightingStyle || "基础白光 + 面光均匀铺底",
    backdropNote: `参考「${knowledge.archetype}」原型语料:背景屏主题色与主配色呼应,避免高饱和撞色`,
    props: [],
  };
}
