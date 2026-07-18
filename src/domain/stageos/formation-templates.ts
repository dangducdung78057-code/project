import { FORMATION_COMPUTES } from "@/lib/formationLayouts";
import type { StageGeometrySpec, StagePosition } from "./types";
import { STAGE_EDGE_MARGIN } from "./defaults";

/**
 * 队形模板注册表(领域层,2.5D/3D/导出共用)。
 * 模板只生成米制坐标,不替换场景图片;算法主体复用
 * formationLayouts.FORMATION_COMPUTES(与知识库 FormationTemplate.name 对应),
 * 并补充 Epic 首批要求的「心形」。
 */

/** 心形:经典心形参数方程采样,顶点朝观众(+z)。 */
export function heartPositions(n: number): [number, number][] {
  if (n <= 0) return [];
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push([x / 16, -y / 13]); // 归一化到约 [-1,1]
  }
  // 缩放至实用尺寸:宽约 7m,深约 5.5m,整体置于舞台中后部
  return pts.map(([x, y]) => [x * 3.5, y * 2.75 - 0.5]);
}

/** 领域模板 id → 坐标算法。 */
export const FORMATION_TEMPLATE_COMPUTES: Record<string, (n: number, spacing: number) => [number, number][]> = {
  ...FORMATION_COMPUTES,
  心形: (n) => heartPositions(n),
};

/** Epic 首批一键模板(展示顺序)。 */
export const PRIMARY_TEMPLATE_NAMES = [
  "三排阶梯式",
  "四排大合唱式",
  "弧形环抱式",
  "中心领唱放射式",
  "心形",
  "V字展开式",
  "扇形辐射式",
  "双阵营对抗式",
  "标准方阵式",
] as const;

/** 全部可用模板名(常用优先,其余按注册顺序)。 */
export function listFormationTemplates(): string[] {
  const all = Object.keys(FORMATION_TEMPLATE_COMPUTES);
  const primary = PRIMARY_TEMPLATE_NAMES.filter((n) => all.includes(n));
  const rest = all.filter((n) => !primary.includes(n as (typeof PRIMARY_TEMPLATE_NAMES)[number]));
  return [...primary, ...rest];
}

/** 把坐标钳制到舞台安全边界内。 */
export function clampToStage(pos: StagePosition, stage: StageGeometrySpec): StagePosition {
  const mx = stage.width / 2 - STAGE_EDGE_MARGIN;
  const mz = stage.depth / 2 - STAGE_EDGE_MARGIN;
  return {
    ...pos,
    x: Math.max(-mx, Math.min(mx, pos.x)),
    z: Math.max(-mz, Math.min(mz, pos.z)),
  };
}

/**
 * 应用模板:为 count 人生成坐标(米制,舞台中轴对称)。
 * 返回 null 表示模板不存在。
 */
export function computeTemplatePositions(
  templateName: string,
  count: number,
  spacing: number,
  stage: StageGeometrySpec,
): StagePosition[] | null {
  const compute = FORMATION_TEMPLATE_COMPUTES[templateName];
  if (!compute || count <= 0) return null;
  return compute(count, spacing).map(([x, z]) => clampToStage({ x, z }, stage));
}
