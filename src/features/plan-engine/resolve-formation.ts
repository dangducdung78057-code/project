import type { FormationTemplate, KnowledgeRetrieval } from "@/lib/stageKnowledge";
import type { StageInputData } from "@/lib/stageos";

export type FormationResolution = {
  recommended: FormationTemplate | null;
  alternatives: FormationTemplate[];
  /** 推荐台阶层数(合唱类 4 层,其余 0,由工作台二次确认)。 */
  riserCount: number;
};

/** 生成队形建议:知识库命中第一个为推荐,其余为备选。 */
export function resolveFormation(input: StageInputData, knowledge: KnowledgeRetrieval): FormationResolution {
  const [first, ...rest] = knowledge.formations;
  const isChoral = /合唱|chorus|choir/i.test(`${input.programType} ${input.activityType}`);
  return {
    recommended: first ?? null,
    alternatives: rest,
    riserCount: isChoral ? 4 : 0,
  };
}
