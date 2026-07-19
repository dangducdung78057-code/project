import { Container, Graphics } from "pixi.js";
import type { StageGeometrySpec, Stage25DLayout, ViewportSize } from "@/domain/stageos";
import { groundYAtZ, scaleAtZ } from "../projection/front-perspective";

/**
 * 舞台背景层(静态,渲染后由调用方缓存为 RenderTexture):
 * 后墙、LED 主屏、地板透视色带、台口线、侧翼暗区。
 */
export function buildStageBackground(
  stage: StageGeometrySpec,
  layout: Stage25DLayout,
  viewport: ViewportSize,
  ledColor: number = 0x2b3a67,
): Container {
  const root = new Container();
  const g = new Graphics();

  // 整体底色
  g.rect(0, 0, viewport.width, viewport.height).fill(0x0d1117);

  // 后墙(地平线以上)
  g.rect(0, 0, viewport.width, layout.horizonY + 2).fill(0x151b26);

  // LED 主屏(后墙中央,占台宽 62%)
  const screenW = stage.width * 0.62 * layout.pxPerMeter * scaleAtZ(-stage.depth / 2, stage);
  const screenH = layout.horizonY * 0.52;
  const screenX = layout.centerX - screenW / 2;
  const screenY = layout.horizonY * 0.2;
  g.roundRect(screenX - 4, screenY - 4, screenW + 8, screenH + 8, 6).fill(0x0a0d13);
  g.roundRect(screenX, screenY, screenW, screenH, 4).fill(ledColor);
  g.roundRect(screenX, screenY, screenW, screenH * 0.45, 4).fill({ color: 0xffffff, alpha: 0.08 });

  // 地板:按透视逐条采样(近亮远暗)
  const steps = 28;
  for (let i = 0; i < steps; i++) {
    const z0 = -stage.depth / 2 + (i / steps) * stage.depth;
    const z1 = -stage.depth / 2 + ((i + 1) / steps) * stage.depth;
    const y0 = groundYAtZ(z0, stage, layout);
    const y1 = groundYAtZ(z1, stage, layout);
    const s0 = scaleAtZ(z0, stage);
    const s1 = scaleAtZ(z1, stage);
    const w0 = (stage.width / 2) * layout.pxPerMeter * s0;
    const w1 = (stage.width / 2) * layout.pxPerMeter * s1;
    const t = i / (steps - 1);
    const color = lerpColor(0x4a3826, 0x6e543a, t);
    g.poly([
      layout.centerX - w0, y0,
      layout.centerX + w0, y0,
      layout.centerX + w1, y1,
      layout.centerX - w1, y1,
    ]).fill(color);
  }

  // 地板侧边界线与台口亮线
  const backW = (stage.width / 2) * layout.pxPerMeter * scaleAtZ(-stage.depth / 2, stage);
  const frontW = (stage.width / 2) * layout.pxPerMeter * scaleAtZ(stage.depth / 2, stage);
  g.poly([
    layout.centerX - backW, layout.horizonY,
    layout.centerX - frontW, layout.frontY,
  ]).stroke({ width: 2, color: 0x8a6f4d, alpha: 0.9 });
  g.poly([
    layout.centerX + backW, layout.horizonY,
    layout.centerX + frontW, layout.frontY,
  ]).stroke({ width: 2, color: 0x8a6f4d, alpha: 0.9 });
  g.moveTo(layout.centerX - frontW, layout.frontY)
    .lineTo(layout.centerX + frontW, layout.frontY)
    .stroke({ width: 3, color: 0xd8b98a, alpha: 0.95 });

  // 侧翼暗区(左/右幕布)
  g.poly([0, 0, layout.centerX - backW, layout.horizonY, layout.centerX - frontW, layout.frontY, 0, viewport.height])
    .fill({ color: 0x05070b, alpha: 0.55 });
  g.poly([viewport.width, 0, layout.centerX + backW, layout.horizonY, layout.centerX + frontW, layout.frontY, viewport.width, viewport.height])
    .fill({ color: 0x05070b, alpha: 0.55 });

  root.addChild(g);
  return root;
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const gg = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gg << 8) | bl;
}
