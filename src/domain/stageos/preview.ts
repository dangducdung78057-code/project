import type { StageGeometrySpec, StagePosition } from "./types";

/**
 * 2.5D 正面透视投影结果:由米制坐标计算屏幕坐标、缩放与深度序。
 * 不做完整 3D 计算;后排人物自动缩小,台阶增加垂直偏移。
 */
export type ProjectionResult = {
  screenX: number;
  screenY: number;
  scale: number;
  depth: number;
};

/** 数字人精灵显式 Manifest:不通过文件名猜测业务归属。 */
export type PerformerSpriteManifest = {
  id: string;
  gender: "male" | "female" | "unisex";
  ageSegment: string;
  outfitId: string;
  /** 朝向 → 精灵纹理键(front / front-left / front-right / side / back)。 */
  directions: Record<string, string>;
  /** 分层遮罩 → 纹理键(body/hair/upper/lower/footwear/accent/shading)。 */
  masks: Record<string, string>;
  /** 脚底锚点(归一化)。 */
  anchor: { x: number; y: number };
  nominalHeightPx: number;
};

/** 视口尺寸(像素)。 */
export type ViewportSize = { width: number; height: number };

/** 由舞台几何推导 2.5D 布局常量。 */
export type Stage25DLayout = {
  /** 地平线上沿(舞台最后沿)的屏幕 Y。 */
  horizonY: number;
  /** 台口(舞台最前沿)的屏幕 Y。 */
  frontY: number;
  /** 舞台中轴屏幕 X。 */
  centerX: number;
  /** 台口处每米像素数(缩放基准)。 */
  pxPerMeter: number;
};

/** 由舞台几何与视口推导布局。四周各留 6% 安全边距。 */
export function computeStage25DLayout(stage: StageGeometrySpec, viewport: ViewportSize): Stage25DLayout {
  const usableW = viewport.width * 0.88;
  const usableH = viewport.height * 0.8;
  // 纵深在屏幕上按透视压缩(约 0.55),宽度是主约束。
  const pxPerMeter = Math.min(usableW / stage.width, usableH / (stage.depth * 0.55 + 2.5));
  return {
    horizonY: viewport.height * 0.14,
    frontY: viewport.height * 0.14 + stage.depth * 0.55 * pxPerMeter,
    centerX: viewport.width / 2,
    pxPerMeter,
  };
}

/** 根据 z 坐标求台阶层号(0 = 舞台地面)。台阶位于舞台后区。 */
export function riserLevelAtZ(z: number, stage: StageGeometrySpec): number {
  if (stage.riserCount <= 0) return 0;
  const backEdge = -stage.depth / 2;
  const into = z - backEdge;
  if (into < 0 || into > stage.riserCount * stage.riserDepth) return 0;
  return Math.min(stage.riserCount, Math.floor(into / stage.riserDepth) + 1);
}

/** 人物所在位置的抬升高度(米):台阶层号 × 单层高度。 */
export function elevationAt(pos: StagePosition, stage: StageGeometrySpec): number {
  const level = pos.riserLevel ?? riserLevelAtZ(pos.z, stage);
  return level * stage.riserHeight;
}
