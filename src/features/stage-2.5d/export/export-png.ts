import type { Application } from "pixi.js";

/**
 * 高清 PNG 导出:RenderTexture 离屏 2x 采样,浏览器触发下载。
 * 导出内容与当前视口一致(同一 Pixi 场景树)。
 */
export function exportStagePng(app: Application, filename = "stage-2.5d.png"): boolean {
  try {
    const canvas = app.renderer.extract.canvas({ target: app.stage, resolution: 2 }) as HTMLCanvasElement;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, "image/png");
    return true;
  } catch {
    return false;
  }
}
