import type { Application, Container, FederatedPointerEvent } from "pixi.js";
import { clampToStage, type StageGeometrySpec, type StagePosition } from "@/domain/stageos";
import type { Stage25DLayout } from "@/domain/stageos";
import { unprojectPosition } from "../projection/front-perspective";

/**
 * 单选 + 拖拽交互。
 * 拖拽中只更新视觉(commit:false),抬手时一次性提交坐标进历史(撤销/重做)。
 * 舞台边界钳制在 drag 内完成;台阶层号由 z 自动吸附。
 */

export type DragCallbacks = {
  onSelect: (id: string, additive: boolean) => void;
  onDragMove: (id: string, pos: StagePosition) => void;
  onDragCommit: (id: string, pos: StagePosition) => void;
};

export function attachPerformerDrag(args: {
  app: Application;
  performerId: string;
  target: Container;
  stage: StageGeometrySpec;
  getLayout: () => Stage25DLayout;
  callbacks: DragCallbacks;
}): () => void {
  const { app, performerId, target, stage, getLayout, callbacks } = args;
  let dragging = false;
  let lastPos: StagePosition | null = null;

  target.eventMode = "static";
  target.cursor = "pointer";

  const onDown = (e: FederatedPointerEvent) => {
    e.stopPropagation();
    dragging = true;
    lastPos = null;
    callbacks.onSelect(performerId, e.shiftKey ?? false);
  };
  const onMove = (e: FederatedPointerEvent) => {
    if (!dragging) return;
    const pos = unprojectPosition(e.global.x, e.global.y, stage, getLayout());
    const clamped = clampToStage(pos, stage);
    lastPos = clamped;
    callbacks.onDragMove(performerId, clamped);
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    if (lastPos) callbacks.onDragCommit(performerId, lastPos);
  };

  target.on("pointerdown", onDown);
  app.stage.on("pointermove", onMove);
  app.stage.on("pointerup", onUp);
  app.stage.on("pointerupoutside", onUp);

  return () => {
    target.off("pointerdown", onDown);
    app.stage.off("pointermove", onMove);
    app.stage.off("pointerup", onUp);
    app.stage.off("pointerupoutside", onUp);
  };
}

/** 让舞台接收全局指针事件(拖拽移动/抬手)。 */
export function enableStagePointerSurface(app: Application, onBackgroundTap?: () => void): void {
  app.stage.eventMode = "static";
  app.stage.hitArea = app.screen;
  if (onBackgroundTap) {
    app.stage.on("pointertap", (e) => {
      // 命中人物时已 stopPropagation,到这里的视为点空白
      if (e.target === app.stage || e.target === null) onBackgroundTap();
    });
  }
}
