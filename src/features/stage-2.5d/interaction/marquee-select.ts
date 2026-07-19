import { Container, Graphics, type Application, type FederatedPointerEvent } from "pixi.js";
import type { Performer, Stage25DLayout, StageGeometrySpec } from "@/domain/stageos";
import { projectPosition } from "../projection/front-perspective";

const MIN_DRAG_PX = 5;
/** 框选结束后短暂屏蔽背景 tap 的"清除选择",避免框选结果被同一次抬手清掉。 */
let lastMarqueeEndAt = 0;
export function consumeMarqueeGuard(): boolean {
  return Date.now() - lastMarqueeEndAt < 200;
}

/**
 * 空白处框选:在舞台空白按下并拖出矩形,选中投影落入矩形内的人物。
 * Shift 增量选择;拖到人物上不会启动(人物 pointerdown 已 stopPropagation)。
 */
export function attachMarqueeSelect(args: {
  app: Application;
  layer: Container;
  getStage: () => StageGeometrySpec;
  getLayout: () => Stage25DLayout;
  getPerformers: () => Performer[];
  onSelect: (ids: string[], additive: boolean) => void;
}): () => void {
  const { app, layer } = args;
  let start: { x: number; y: number } | null = null;
  let additive = false;
  let moved = false;

  const rect = new Graphics();
  rect.visible = false;
  rect.eventMode = "none";
  layer.addChild(rect);

  const onDown = (e: FederatedPointerEvent) => {
    if (e.target !== app.stage) return;
    if (e.button !== 0) return;
    start = { x: e.global.x, y: e.global.y };
    additive = e.shiftKey ?? false;
    moved = false;
  };

  const onMove = (e: FederatedPointerEvent) => {
    if (!start) return;
    const w = Math.abs(e.global.x - start.x);
    const h = Math.abs(e.global.y - start.y);
    if (w < MIN_DRAG_PX && h < MIN_DRAG_PX) return;
    moved = true;
    const x = Math.min(start.x, e.global.x);
    const y = Math.min(start.y, e.global.y);
    rect
      .clear()
      .rect(x, y, w, h)
      .fill({ color: 0x6ea8fe, alpha: 0.1 })
      .stroke({ width: 1, color: 0x6ea8fe, alpha: 0.85 });
    rect.visible = true;
  };

  const onUp = (e: FederatedPointerEvent) => {
    if (!start) return;
    const s = start;
    start = null;
    rect.clear();
    rect.visible = false;
    if (!moved) return;
    lastMarqueeEndAt = Date.now();
    const x0 = Math.min(s.x, e.global.x);
    const x1 = Math.max(s.x, e.global.x);
    const y0 = Math.min(s.y, e.global.y);
    const y1 = Math.max(s.y, e.global.y);
    const layout = args.getLayout();
    const stage = args.getStage();
    const ids = args
      .getPerformers()
      .filter((p) => {
        const pr = projectPosition(p.position, stage, layout);
        return pr.screenX >= x0 && pr.screenX <= x1 && pr.screenY >= y0 && pr.screenY <= y1;
      })
      .map((p) => p.id);
    args.onSelect(ids, additive);
  };

  app.stage.on("pointerdown", onDown);
  app.stage.on("pointermove", onMove);
  app.stage.on("pointerup", onUp);
  app.stage.on("pointerupoutside", onUp);

  return () => {
    app.stage.off("pointerdown", onDown);
    app.stage.off("pointermove", onMove);
    app.stage.off("pointerup", onUp);
    app.stage.off("pointerupoutside", onUp);
    rect.destroy();
  };
}
