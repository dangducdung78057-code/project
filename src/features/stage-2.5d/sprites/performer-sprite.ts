import { Container, Graphics, RenderTexture, Renderer, Sprite, Text, Texture } from "pixi.js";
import type { Performer, PerformerGender } from "@/domain/stageos";
import { SPRITE_NOMINAL_HEIGHT_CM, SPRITE_NOMINAL_HEIGHT_PX } from "@/domain/stageos";

/**
 * 占位数字人精灵(Phase A)。
 * 真实服装 GLB 离线渲染精灵到位前,用程序化剪影验证全流程:
 * 头 / 上衣 / 下装 / 鞋四层分色,男女廓形区分,支持运行时换色。
 * 纹理按 (gender|top|bottom|footwear) 缓存,换色仅重新生成命中项。
 */

export type PerformerColors = { top: number; bottom: number; footwear: number };

const TEX_W = 64;
const TEX_H = SPRITE_NOMINAL_HEIGHT_PX;
const SKIN = 0xf2c9a4;
const HAIR = 0x3a2a1e;

const DEFAULT_COLORS: Record<PerformerGender, PerformerColors> = {
  male: { top: 0x4f7cbf, bottom: 0x2e3a4d, footwear: 0xf0f0f0 },
  female: { top: 0xc06c9e, bottom: 0x7a3a58, footwear: 0xf0f0f0 },
  unknown: { top: 0x9aa4b2, bottom: 0x4a5260, footwear: 0xf0f0f0 },
};

const textureCache = new Map<string, Texture>();

export function defaultColorsFor(gender: PerformerGender): PerformerColors {
  return { ...DEFAULT_COLORS[gender] };
}

export function getPerformerTexture(
  renderer: Renderer,
  gender: PerformerGender,
  colors: PerformerColors,
): Texture {
  const key = `${gender}|${colors.top}|${colors.bottom}|${colors.footwear}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const g = new Graphics();
  const cx = TEX_W / 2;

  // 头 + 头发
  g.circle(cx, 14, 9).fill(SKIN);
  g.circle(cx, 10.5, 9).fill(HAIR);
  g.rect(cx - 9, 12, 18, 6).fill(SKIN);
  if (gender === "female") {
    g.rect(cx - 10, 12, 3, 14).fill(HAIR);
    g.rect(cx + 7, 12, 3, 14).fill(HAIR);
  }
  // 上衣(梯形)
  g.poly([cx - 11, 26, cx + 11, 26, cx + 13, 50, cx - 13, 50]).fill(colors.top);
  // 手臂
  g.rect(cx - 15, 27, 4, 20).fill(colors.top);
  g.rect(cx + 11, 27, 4, 20).fill(colors.top);
  // 下装:男裤 / 女裙
  if (gender === "female") {
    g.poly([cx - 13, 50, cx + 13, 50, cx + 17, 82, cx - 17, 82]).fill(colors.bottom);
  } else {
    g.rect(cx - 12, 50, 24, 32).fill(colors.bottom);
    g.rect(cx - 1, 52, 2, 28).fill({ color: 0x000000, alpha: 0.18 });
  }
  // 鞋
  g.rect(cx - 10, 84, 9, 6).fill(colors.footwear);
  g.rect(cx + 1, 84, 9, 6).fill(colors.footwear);

  const rt = RenderTexture.create({ width: TEX_W, height: TEX_H });
  renderer.render({ container: g, target: rt });
  g.destroy();
  textureCache.set(key, rt);
  return rt;
}

export type PerformerNode = {
  id: string;
  root: Container;
  body: Sprite;
  ring: Graphics;
  label: Text;
};

export function createPerformerNode(performer: Performer, texture: Texture): PerformerNode {
  const root = new Container();
  const body = new Sprite(texture);
  body.anchor.set(0.5, 1); // 脚底锚点:必须落在舞台/台阶平面
  root.addChild(body);

  // 选中光圈(脚底椭圆)
  const ring = new Graphics();
  ring.ellipse(0, 0, 16, 5).stroke({ width: 2, color: 0x7fd4ff });
  ring.visible = false;
  root.addChild(ring);

  // 标签(匿名编号等,挂头顶)
  const label = new Text({
    text: performer.anonId,
    style: { fontSize: 10, fill: 0xffffff, fontFamily: "system-ui, sans-serif" },
  });
  label.anchor.set(0.5, 1);
  label.y = -SPRITE_NOMINAL_HEIGHT_PX - 2;
  root.addChild(label);

  return { id: performer.id, root, body, ring, label };
}

/** 同步精灵显示状态:缩放(身高×透视)、选中、标签内容与可见性。 */
export function syncPerformerNode(
  node: PerformerNode,
  performer: Performer,
  screenX: number,
  screenY: number,
  perspectiveScale: number,
  selected: boolean,
  labelText: string | null,
): void {
  node.root.x = screenX;
  node.root.y = screenY;
  const heightScale = (performer.heightCm / SPRITE_NOMINAL_HEIGHT_CM) * perspectiveScale;
  node.body.scale.set(heightScale);
  node.ring.scale.set(heightScale);
  node.ring.visible = selected;
  node.label.scale.set(Math.max(0.75, heightScale));
  if (labelText) {
    node.label.text = labelText;
    node.label.visible = true;
  } else {
    node.label.visible = false;
  }
}

/** 释放纹理缓存(换装资产变更后调用)。 */
export function clearPerformerTextureCache(): void {
  for (const tex of textureCache.values()) tex.destroy(true);
  textureCache.clear();
}
