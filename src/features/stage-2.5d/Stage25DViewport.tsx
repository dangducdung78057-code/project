import { useEffect, useRef } from "react";
import { Sprite, type Container } from "pixi.js";
import type { Performer } from "@/domain/stageos";
import { computeStage25DLayout, type Stage25DLayout } from "@/domain/stageos";
import { useStageEditorStore } from "@/stores/stage-editor-store";
import { createPixiApp, type PixiAppHandle } from "./pixi-app";
import { buildStageBackground } from "./layers/stage-background";
import { buildRisers } from "./layers/risers";
import { createPerformerNode, defaultColorsFor, getPerformerTexture, syncPerformerNode, type PerformerNode } from "./sprites/performer-sprite";
import { projectPosition } from "./projection/front-perspective";
import { attachPerformerDrag, enableStagePointerSurface } from "./interaction/drag-select";
import { attachMarqueeSelect, consumeMarqueeGuard } from "./interaction/marquee-select";
import { exportStagePng } from "./export/export-png";
import { renderFallbackCanvas } from "./fallback-canvas";

export type Stage25DViewportHandle = {
  exportPng: (filename?: string) => boolean;
};

type Props = {
  onReady?: (handle: Stage25DViewportHandle) => void;
  onWebGLFallback?: () => void;
};

/**
 * 2.5D 舞台视口。
 * 同步策略:Pixi 场景树由 store.subscribe 直接驱动,不经过 React render,
 * 拖拽/框选高频更新不会触发组件重渲染。
 */
export function Stage25DViewport({ onReady, onWebGLFallback }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<PixiAppHandle | null>(null);
  const nodesRef = useRef<Map<string, PerformerNode>>(new Map());
  const detachRef = useRef<Map<string, () => void>>(new Map());
  const layoutRef = useRef<Stage25DLayout | null>(null);
  const fallbackRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let detachMarquee: (() => void) | null = null;

    const boot = async () => {
      let handle: PixiAppHandle;
      try {
        handle = await createPixiApp(host);
      } catch {
        // WebGL 不可用:Canvas 2D 静态降级
        onWebGLFallback?.();
        drawFallback();
        return;
      }
      if (cancelled) {
        handle.destroy();
        return;
      }
      handleRef.current = handle;
      const { app, layers } = handle;

      enableStagePointerSurface(app, () => {
        // 框选抬手的同一次 tap 不清掉刚框出的选择
        if (consumeMarqueeGuard()) return;
        useStageEditorStore.getState().clearSelection();
      });
      detachMarquee = attachMarqueeSelect({
        app,
        layer: layers.selection,
        getStage: () => useStageEditorStore.getState().stage,
        getLayout: () => layoutRef.current as Stage25DLayout,
        getPerformers: () => useStageEditorStore.getState().performers,
        onSelect: (ids, additive) => useStageEditorStore.getState().select(ids, additive),
      });

      // 静态层构建与缓存(台阶层数变化时重建)
      let staticStageKey = "";
      const rebuildStatic = () => {
        const st = useStageEditorStore.getState();
        const key = `${st.stage.width}x${st.stage.depth}r${st.stage.riserCount}-${app.screen.width}x${app.screen.height}`;
        if (key === staticStageKey) return;
        staticStageKey = key;
        layoutRef.current = computeStage25DLayout(st.stage, { width: app.screen.width, height: app.screen.height });
        layers.background.removeChildren().forEach((c) => c.destroy({ children: true }));
        layers.risers.removeChildren().forEach((c) => c.destroy({ children: true }));
        const bg = buildStageBackground(st.stage, layoutRef.current, { width: app.screen.width, height: app.screen.height });
        const bgTex = app.renderer.generateTexture(bg);
        bg.destroy({ children: true });
        layers.background.addChild(new Sprite(bgTex));
        const risers = buildRisers(st.stage, layoutRef.current);
        const riserTex = app.renderer.generateTexture(risers);
        risers.destroy({ children: true });
        layers.risers.addChild(new Sprite(riserTex));
      };

      const syncAll = () => {
        const st = useStageEditorStore.getState();
        if (!layoutRef.current) return;
        const layout = layoutRef.current;
        const alive = new Set<string>();
        const sorted = [...st.performers].sort((a, b) => a.position.z - b.position.z);
        sorted.forEach((p, idx) => {
          alive.add(p.id);
          let node = nodesRef.current.get(p.id);
          if (!node) {
            node = createPerformerNode(p, getPerformerTexture(app.renderer, p.gender, defaultColorsFor(p.gender)));
            nodesRef.current.set(p.id, node);
            const detach = attachPerformerDrag({
              app,
              performerId: p.id,
              target: node.root as Container,
              getStage: () => useStageEditorStore.getState().stage,
              getLayout: () => layoutRef.current as Stage25DLayout,
              getSnap: () => useStageEditorStore.getState().snapEnabled,
              getSelection: () => useStageEditorStore.getState().selectedIds,
              getPosition: (pid) => useStageEditorStore.getState().performers.find((pp) => pp.id === pid)?.position,
              callbacks: {
                onSelect: (id, additive) => {
                  const st2 = useStageEditorStore.getState();
                  if (additive) {
                    st2.toggleSelect(id);
                    return;
                  }
                  // 已处于多选集合内时保持多选,便于整组拖动
                  if (st2.selectedIds.includes(id) && st2.selectedIds.length > 1) return;
                  st2.select([id]);
                },
                onDragStart: () => useStageEditorStore.getState().beginTransform(),
                onDragMove: (id, pos) => useStageEditorStore.getState().setPosition(id, pos, { commit: false }),
                onDragMoveSelection: (dx, dz) => useStageEditorStore.getState().moveSelectionBy(dx, dz),
                onDragEnd: () => useStageEditorStore.getState().endTransform(),
              },
            });
            detachRef.current.set(p.id, detach);
          }
          if (node.root.parent !== layers.performer) layers.performer.addChild(node.root);
          node.root.zIndex = idx;
          const pr = projectPosition(p.position, st.stage, layout);
          const label = buildLabel(p, st.labels.id, st.labels.height);
          syncPerformerNode(node, p, pr.screenX, pr.screenY, pr.scale, st.selectedIds.includes(p.id), label);
        });
        // 移除消失的人物
        for (const [id, node] of [...nodesRef.current.entries()]) {
          if (!alive.has(id)) {
            detachRef.current.get(id)?.();
            detachRef.current.delete(id);
            node.root.destroy({ children: true });
            nodesRef.current.delete(id);
          }
        }
        layers.performer.sortableChildren = true;
      };

      rebuildStatic();
      syncAll();
      unsubscribe = useStageEditorStore.subscribe(() => {
        rebuildStatic();
        syncAll();
      });

      onReady?.({
        exportPng: (filename) => exportStagePng(app, filename),
      });
    };

    const drawFallback = () => {
      const canvas = fallbackRef.current;
      if (!canvas) return;
      canvas.style.display = "block";
      const st = useStageEditorStore.getState();
      renderFallbackCanvas(canvas, st.stage, st.performers, st.labels);
      if (!unsubscribe) unsubscribe = useStageEditorStore.subscribe(drawFallback);
    };

    void boot();

    return () => {
      cancelled = true;
      unsubscribe?.();
      detachMarquee?.();
      for (const detach of detachRef.current.values()) detach();
      detachRef.current.clear();
      nodesRef.current.clear();
      handleRef.current?.destroy();
      handleRef.current = null;
      layoutRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border/60 bg-[#0d1117]">
      <div ref={hostRef} className="absolute inset-0" />
      <canvas ref={fallbackRef} className="absolute inset-0 h-full w-full" style={{ display: "none" }} />
    </div>
  );
}

function buildLabel(p: Performer, showId: boolean, showHeight: boolean): string | null {
  if (!showId && !showHeight) return null;
  const parts: string[] = [];
  if (showId) parts.push(p.anonId);
  if (showHeight) parts.push(`${p.heightCm}cm`);
  return parts.join(" ");
}
