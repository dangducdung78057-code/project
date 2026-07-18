import type { Performer, StageGeometrySpec, ViewportSize } from "@/domain/stageos";
import { computeStage25DLayout } from "@/domain/stageos";
import { projectPosition } from "./projection/front-perspective";

/**
 * WebGL 不可用时的 Canvas 2D 降级渲染(静态快照,不可交互)。
 * 保证低配环境下队形与标注仍可见、可人工核对。
 */
export function renderFallbackCanvas(
  canvas: HTMLCanvasElement,
  stage: StageGeometrySpec,
  performers: Performer[],
  labels: { id: boolean; height: boolean },
): void {
  const viewport: ViewportSize = { width: canvas.clientWidth || 960, height: canvas.clientHeight || 560 };
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const layout = computeStage25DLayout(stage, viewport);

  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  // 地板(梯形)
  ctx.fillStyle = "#5b4632";
  ctx.beginPath();
  ctx.moveTo(layout.centerX - (stage.width / 2) * layout.pxPerMeter * 0.58, layout.horizonY);
  ctx.lineTo(layout.centerX + (stage.width / 2) * layout.pxPerMeter * 0.58, layout.horizonY);
  ctx.lineTo(layout.centerX + (stage.width / 2) * layout.pxPerMeter, layout.frontY);
  ctx.lineTo(layout.centerX - (stage.width / 2) * layout.pxPerMeter, layout.frontY);
  ctx.closePath();
  ctx.fill();

  const sorted = [...performers].sort((a, b) => a.position.z - b.position.z);
  for (const p of sorted) {
    const pr = projectPosition(p.position, stage, layout);
    const r = 8 * pr.scale * (p.heightCm / 160);
    ctx.fillStyle = p.gender === "male" ? "#4f7cbf" : p.gender === "female" ? "#c06c9e" : "#9aa4b2";
    ctx.beginPath();
    ctx.arc(pr.screenX, pr.screenY - r, r, 0, Math.PI * 2);
    ctx.fill();
    if (labels.id) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.anonId + (labels.height ? ` ${p.heightCm}cm` : ""), pr.screenX, pr.screenY - r * 2 - 4);
    }
  }
}
