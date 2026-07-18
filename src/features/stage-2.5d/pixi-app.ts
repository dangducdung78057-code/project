import { Application, Container } from "pixi.js";

/**
 * PixiJS 应用封装(WebGL;WebGL 不可用时由调用方降级到 Canvas 2D 静态渲染)。
 * 分层结构固定:固定舞台层(background/risers)可缓存为 RenderTexture,
 * 人物、标注、路径保持独立可更新。
 */

export type Stage25DLayers = {
  background: Container;
  lighting: Container;
  risers: Container;
  props: Container;
  performer: Container;
  selection: Container;
  annotation: Container;
  path: Container;
  safety: Container;
};

export type PixiAppHandle = {
  app: Application;
  layers: Stage25DLayers;
  destroy: () => void;
};

const LAYER_ORDER: Array<keyof Stage25DLayers> = [
  "background",
  "lighting",
  "risers",
  "props",
  "path",
  "performer",
  "selection",
  "annotation",
  "safety",
];

export async function createPixiApp(host: HTMLElement): Promise<PixiAppHandle> {
  const app = new Application();
  await app.init({
    antialias: true,
    background: 0x0d1117,
    resizeTo: host,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  host.appendChild(app.canvas);

  const layers = {} as Stage25DLayers;
  LAYER_ORDER.forEach((name, idx) => {
    const c = new Container();
    c.zIndex = idx;
    app.stage.addChild(c);
    layers[name] = c;
  });
  app.stage.sortableChildren = true;

  return {
    app,
    layers,
    destroy: () => {
      app.destroy({ removeView: true }, { children: true });
    },
  };
}
