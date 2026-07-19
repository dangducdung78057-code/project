import type { Application, Container, FederatedPointerEvent } from "pixi.js";
import { clampToStage, type StageGeometrySpec, type StagePosition } from "@/domain/stageos";
import type { Stage25DLayout } from "@/domain/stageos";
import { unprojectPosition } from "../projection/front-perspective";

/**
 * 单选/多选 + 拖拽交互。
 * - 拖拽手势以 beginTransform/endTransform 记录历史:手势内多次移动只产生一条 undo。
 * - 拖动的对象若在多选集合内,整组按位移一起移动(以手势起点为基准,不累计误差)。
 * - 网格吸附 0.25m 可开关;舞台边界钳制在 drag 内完成;台阶层号由 z 自动吸附。
 */

export const SNAP_STEP_M = 0.25;

export function snapValue(v: number, step: number = SNAP_STEP_M): number {
  return Math.round(v / step) * step;
}

export function snapPosition(pos: StagePosition, step: number = SNAP_STEP_M): StagePosition {
  return { ...pos, x: snapValue(pos.x, step), z: snapValue(pos.z, step) };
}

export type DragCallbacks = {
  onSelect: (id: string, additive: boolean) => void;
  onDragStart: () => void;
  onDragMove: (id: string, pos: StagePosition) => void;
  onDragMoveSelection: (dx: number, dz: number) => void;
  onDragEnd: () => void;
};

export function attachPerformerDrag(args: {
  app: Application;
  performerId: string;
  target: Container;
  getStage: () => StageGeometrySpec;
  getLayout: () => Stage25DLayout;
  getSnap: () => boolean;
  getSelection: () => string[];
  getPosition: (id: string) => StagePosition | undefined;
  callbacks: DragCallbacks;
}): () => void {
  const { app, performerId, target, callbacks } = args;
  let dragging = false;
  let started = false;
  let multi = false;
  let startPointer: { x: number; z: number } | null = null;
  let leaderStart: StagePosition | null = null;

  target.eventMode = "static";
  target.cursor = "pointer";

  const onDown = (e: FederatedPointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    dragging = true;
    started = false;
    const stage = args.getStage();
    const sel = args.getSelection();
    multi = sel.includes(performerId) && sel.length > 1;
    const world = unprojectPosition(e.global.x, e.global.y, stage, args.getLayout());
    startPointer = { x: world.x, z: world.z };
    leaderStart = args.getPosition(performerId) ?? null;
    callbacks.onSelect(performerId, e.shiftKey ?? false);
  };

  const onMove = (e: FederatedPointerEvent) => {
    if (!dragging) return;
    if (!started) {
      started = true;
      callbacks.onDragStart();
    }
    const stage = args.getStage();
    const world = unprojectPosition(e.global.x, e.global.y, stage, args.getLayout());

    if (multi && startPointer && leaderStart) {
      let dx = world.x - startPointer.x;
      let dz = world.z - startPointer.z;
      if (args.getSnap()) {
        // 以领队吸附后的有效位移为准,保证整组仍落在网格上
        const snapped = snapPosition(
          clampToStage({ ...leaderStart, x: leaderStart.x + dx, z: leaderStart.z + dz }, stage),
        );
        dx = snapped.x - leaderStart.x;
        dz = snapped.z - leaderStart.z;
      }
      callbacks.onDragMoveSelection(dx, dz);
      return;
    }

    const snapped = args.getSnap() ? snapPosition(world) : world;
    const clamped = clampToStage(snapped, stage);
    callbacks.onDragMove(performerId, clamped);
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    multi = false;
    startPointer = null;
    leaderStart = null;
    if (started) callbacks.onDragEnd();
    started = false;
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
