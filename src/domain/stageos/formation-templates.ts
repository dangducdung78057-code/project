import { FORMATION_COMPUTES } from "@/lib/formationLayouts";
import type { StageGeometrySpec, StagePosition } from "./types";
import { STAGE_EDGE_MARGIN } from "./defaults";

/**
 * 队形模板注册表(领域层,2.5D/3D/导出共用)。
 * 模板只生成米制坐标,不替换场景图片;算法主体复用
 * formationLayouts.FORMATION_COMPUTES(与知识库 FormationTemplate.name 对应),
 * 并补充 Epic 首批要求的「心形」与合唱高频站位。
 */

/** 按排数均分人数(前少后多,更利视线)。 */
function splitCounts(n: number, rows: number): number[] {
  const base = Math.floor(n / rows);
  const extra = n % rows;
  return Array.from({ length: rows }, (_, i) => base + (i >= rows - extra ? 1 : 0));
}

/** 居中横排。 */
function centeredRow(cnt: number, z: number, spacing: number): [number, number][] {
  return Array.from({ length: cnt }, (_, i) => [(i - (cnt - 1) / 2) * spacing, z]);
}

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

/** 三排阶梯式:前中后三排横列,配合台阶逐排增高。 */
function threeRowRiserPositions(n: number, spacing: number): [number, number][] {
  const counts = splitCounts(n, 3);
  const out: [number, number][] = [];
  counts.forEach((cnt, r) => {
    out.push(...centeredRow(cnt, 1.2 - r * spacing * 1.6, spacing));
  });
  return out;
}

/** 四排大合唱式:四排横列配合唱台,气势型站位。 */
function fourRowChorusPositions(n: number, spacing: number): [number, number][] {
  const counts = splitCounts(n, 4);
  const out: [number, number][] = [];
  counts.forEach((cnt, r) => {
    out.push(...centeredRow(cnt, 1.6 - r * spacing * 1.5, spacing * 0.95));
  });
  return out;
}

/** 弧形环抱式:两排弧线面向指挥/观众呈环抱状,中心略后、两翼前探。 */
function arcEmbracePositions(n: number, spacing: number): [number, number][] {
  const counts = splitCounts(n, 2);
  const out: [number, number][] = [];
  counts.forEach((cnt, li) => {
    const radius = 4.2 + li * spacing * 1.5;
    for (let i = 0; i < cnt; i++) {
      const t = cnt > 1 ? i / (cnt - 1) : 0.5;
      const ang = Math.PI * (0.22 + 0.56 * t);
      out.push([Math.cos(ang) * -radius, 2.2 - Math.sin(ang) * radius * 0.55]);
    }
  });
  return out;
}

/** 中心领唱放射式:领唱居中靠前,其余呈放射状向后展开。 */
function radialLeadPositions(n: number, spacing: number): [number, number][] {
  if (n <= 0) return [];
  if (n === 1) return [[0, 3.5]];
  const out: [number, number][] = [[0, 3.5]]; // 领唱位
  const rest = n - 1;
  const spokes = 5;
  for (let i = 0; i < rest; i++) {
    const spoke = i % spokes;
    const k = Math.floor(i / spokes) + 1;
    const ang = Math.PI / 2 + (spoke - (spokes - 1) / 2) * 0.38;
    out.push([
      Math.cos(ang) * k * spacing * 1.15,
      3.5 - Math.sin(ang) * k * spacing * 1.15,
    ]);
  }
  return out;
}

/** 双阵营对抗式:左右双阵营,中央留 2m 通道。 */
function twoCampPositions(n: number, spacing: number): [number, number][] {
  const left = Math.ceil(n / 2);
  const out: [number, number][] = [];
  const camp = (cnt: number, dir: -1 | 1) => {
    const counts = splitCounts(cnt, 2);
    counts.forEach((rc, r) => {
      for (let i = 0; i < rc; i++) {
        out.push([dir * (1.3 + i * spacing), 1.2 - r * spacing * 1.4]);
      }
    });
  };
  camp(left, -1);
  camp(n - left, 1);
  return out;
}

/** 领域模板 id → 坐标算法。 */
export const FORMATION_TEMPLATE_COMPUTES: Record<string, (n: number, spacing: number) => [number, number][]> = {
  ...FORMATION_COMPUTES,
  心形: (n) => heartPositions(n),
  三排阶梯式: threeRowRiserPositions,
  四排大合唱式: fourRowChorusPositions,
  弧形环抱式: arcEmbracePositions,
  中心领唱放射式: radialLeadPositions,
  双阵营对抗式: twoCampPositions,
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
