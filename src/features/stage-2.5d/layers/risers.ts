import { Container, Graphics, Text } from "pixi.js";
import type { StageGeometrySpec, Stage25DLayout } from "@/domain/stageos";
import { groundYAtZ, scaleAtZ } from "../projection/front-perspective";

/**
 * 合唱台阶层(静态):逐层绘制顶面梯形与前立面,标注层号。
 * 台阶位于舞台后区,层数 0/3/4/5 可切换。
 */
export function buildRisers(stage: StageGeometrySpec, layout: Stage25DLayout): Container {
  const root = new Container();
  if (stage.riserCount <= 0) return root;

  const g = new Graphics();
  const backEdge = -stage.depth / 2;

  for (let level = 1; level <= stage.riserCount; level++) {
    const z0 = backEdge + (level - 1) * stage.riserDepth;
    const z1 = backEdge + level * stage.riserDepth;
    const topElev = level * stage.riserHeight;

    const s0 = scaleAtZ(z0, stage);
    const s1 = scaleAtZ(z1, stage);
    const w0 = (stage.width / 2 - 0.2) * layout.pxPerMeter * s0;
    const w1 = (stage.width / 2 - 0.2) * layout.pxPerMeter * s1;

    const yTop0 = groundYAtZ(z0, stage, layout) - topElev * layout.pxPerMeter * s0;
    const yTop1 = groundYAtZ(z1, stage, layout) - topElev * layout.pxPerMeter * s1;
    const yBase1 = groundYAtZ(z1, stage, layout) - (topElev - stage.riserHeight) * layout.pxPerMeter * s1;

    // 顶面
    g.poly([
      layout.centerX - w0, yTop0,
      layout.centerX + w0, yTop0,
      layout.centerX + w1, yTop1,
      layout.centerX - w1, yTop1,
    ]).fill(level % 2 === 0 ? 0x5b4632 : 0x63503a);
    // 前立面
    g.poly([
      layout.centerX - w1, yTop1,
      layout.centerX + w1, yTop1,
      layout.centerX + w1, yBase1,
      layout.centerX - w1, yBase1,
    ]).fill(0x3a2d20);
    // 层沿亮线
    g.moveTo(layout.centerX - w1, yTop1)
      .lineTo(layout.centerX + w1, yTop1)
      .stroke({ width: 1.5, color: 0xc9a876, alpha: 0.85 });

    // 层号
    const label = new Text({
      text: `${level}层`,
      style: { fontSize: 11, fill: 0xd8c8a8, fontFamily: "system-ui, sans-serif" },
    });
    label.anchor.set(1, 0.5);
    label.x = layout.centerX - w1 - 6;
    label.y = (yTop1 + yBase1) / 2;
    root.addChild(label);
  }

  root.addChild(g);
  // 层号在上
  for (const child of [...root.children]) {
    if (child instanceof Text) root.addChild(child);
  }
  return root;
}
