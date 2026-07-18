import {
  computeStage25DLayout,
  elevationAt,
  riserLevelAtZ,
  type ProjectionResult,
  type Stage25DLayout,
  type StageGeometrySpec,
  type StagePosition,
  type ViewportSize,
} from "@/domain/stageos";

/**
 * 正面透视投影(2.5D 核心)。
 * - z 越深(负)人物越小,scale ∈ [0.58, 1.05]
 * - 地面 Y 用幂次曲线模拟透视压缩
 * - 台阶按层高抬升,且抬升量随自身 scale 缩放
 * - 人物脚底必须落在舞台或台阶平面(锚点在脚底)
 */

export const MIN_SCALE = 0.58;
export const MAX_SCALE = 1.05;
const GROUND_CURVE = 1.22;

export function scaleAtZ(z: number, stage: StageGeometrySpec): number {
  const t = Math.max(0, Math.min(1, (z + stage.depth / 2) / stage.depth));
  return MIN_SCALE + (MAX_SCALE - MIN_SCALE) * t;
}

export function groundYAtZ(z: number, stage: StageGeometrySpec, layout: Stage25DLayout): number {
  const t = Math.max(0, Math.min(1, (z + stage.depth / 2) / stage.depth));
  return layout.horizonY + Math.pow(t, GROUND_CURVE) * (layout.frontY - layout.horizonY);
}

export function projectPosition(
  pos: StagePosition,
  stage: StageGeometrySpec,
  layout: Stage25DLayout,
): ProjectionResult {
  const scale = scaleAtZ(pos.z, stage);
  const riserLevel = pos.riserLevel ?? riserLevelAtZ(pos.z, stage);
  const elev = elevationAt({ ...pos, riserLevel }, stage);
  return {
    screenX: layout.centerX + pos.x * layout.pxPerMeter * scale,
    screenY: groundYAtZ(pos.z, stage, layout) - elev * layout.pxPerMeter * scale,
    scale,
    depth: pos.z + riserLevel * 0.001,
  };
}

/**
 * 屏幕坐标反算舞台米制坐标(拖拽用)。
 * 以地面平面为基准(不含台阶抬升),台阶层号由 z 自动推断。
 */
export function unprojectPosition(
  screenX: number,
  screenY: number,
  stage: StageGeometrySpec,
  layout: Stage25DLayout,
): StagePosition {
  const span = layout.frontY - layout.horizonY;
  const raw = span > 0 ? (screenY - layout.horizonY) / span : 0;
  const t = Math.pow(Math.max(0, Math.min(1, raw)), 1 / GROUND_CURVE);
  const z = t * stage.depth - stage.depth / 2;
  const scale = scaleAtZ(z, stage);
  const x = (screenX - layout.centerX) / (layout.pxPerMeter * scale);
  return { x, z, riserLevel: riserLevelAtZ(z, stage) };
}

export function layoutFor(stage: StageGeometrySpec, viewport: ViewportSize): Stage25DLayout {
  return computeStage25DLayout(stage, viewport);
}
