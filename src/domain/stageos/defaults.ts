import type { StageGeometrySpec } from "./types";

/** 默认舞台几何:标准学校礼堂台口 16m × 台深 10m,后区 4 层合唱台阶。 */
export const DEFAULT_STAGE: StageGeometrySpec = {
  width: 16,
  depth: 10,
  riserCount: 4,
  riserDepth: 0.95,
  riserHeight: 0.2,
};

/** 人物间距默认值(米),与知识库队形 spacingRule 的常见档位一致。 */
export const DEFAULT_SPACING = 0.8;

/** 拖拽与模板应用时的安全边距(米),防止人物贴到台口/侧幕边缘。 */
export const STAGE_EDGE_MARGIN = 0.35;

/** 台阶可选层数(工作台切换)。 */
export const RISER_COUNT_OPTIONS = [0, 3, 4, 5] as const;

/** 2.5D 占位精灵的名义身高(像素),按 1.6m 人物等比缩放。 */
export const SPRITE_NOMINAL_HEIGHT_PX = 96;
export const SPRITE_NOMINAL_HEIGHT_CM = 160;

/** 默认关键帧序列(开场 / 段落 / 高潮 / 结尾)。 */
export const DEFAULT_KEYFRAMES: Array<{ id: string; name: string; timeSec: number }> = [
  { id: "kf-opening", name: "开场", timeSec: 0 },
  { id: "kf-verse", name: "段落", timeSec: 45 },
  { id: "kf-climax", name: "高潮", timeSec: 120 },
  { id: "kf-ending", name: "结尾", timeSec: 180 },
];

/** 基础占位服装(真实服装 GLB 到位前,用于验证全流程)。 */
export const PLACEHOLDER_OUTFITS = [
  { id: "basic-white", name: "基础白色训练服", programTypes: [] as string[] },
  { id: "chorus-basic", name: "合唱基础款", programTypes: ["chorus", "mixed_chorus"] },
  { id: "recitation-basic", name: "朗诵基础款", programTypes: ["recitation", "host"] },
  { id: "dance-basic", name: "舞蹈基础款", programTypes: ["classical_dance", "folk_dance", "modern_jazz_street", "ballet"] },
] as const;
