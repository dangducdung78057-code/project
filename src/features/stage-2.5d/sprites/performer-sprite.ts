import { Container, Graphics, RenderTexture, Renderer, Sprite, Text, Texture } from "pixi.js";
import type { Performer, PerformerGender } from "@/domain/stageos";
import { SPRITE_NOMINAL_HEIGHT_CM, SPRITE_NOMINAL_HEIGHT_PX } from "@/domain/stageos";

/**
 * 人物精灵(Phase C · 等身立绘版)。
 * 约 5 头身纸娃娃比例:男 = 衬衫 + 长裤,女 = 连衣裙(上衣 + 腰带 + 裙摆),
 * 上衣 / 下装 / 鞋三层分色支持运行时换色(与服装方案联动)。
 * 纹理按 (gender|variant|top|bottom|footwear) 缓存,换色仅重新生成命中项。
 *
 * 发型变体 variant:0=男短发,1=女齐肩长发,2=女双马尾(男生固定 0)。
 */

export type PerformerColors = { top: number; bottom: number; footwear: number };

const TEX_W = 64;
const TEX_H = SPRITE_NOMINAL_HEIGHT_PX;
const SKIN = 0xf6cfae;
const HAIR_MALE = 0x2e2620;
const HAIR_FEMALE = 0x4a3226;
const EYE = 0x2b2320;
const BLUSH = 0xf2a091;
const MOUTH = 0xc2705e;
const COLLAR = 0xffffff;

const DEFAULT_COLORS: Record<PerformerGender, PerformerColors> = {
  // 默认贴近「清新校园风」:男浅蓝衬衫 + 灰裤,女粉色连衣裙。
  male: { top: 0x9cc3e8, bottom: 0x8a8f98, footwear: 0x32323a },
  female: { top: 0xf0b8c8, bottom: 0xe08aa0, footwear: 0x32323a },
  unknown: { top: 0x9aa4b2, bottom: 0x4a5260, footwear: 0x32323a },
};

const textureCache = new Map<string, Texture>();

export function defaultColorsFor(gender: PerformerGender): PerformerColors {
  return { ...DEFAULT_COLORS[gender] };
}

/** 按匿名编号稳定分配发型变体:男生短发,女生在齐肩长发 / 双马尾间分散。 */
export function hairVariantFor(anonId: string, gender: PerformerGender): number {
  if (gender === "male") return 0;
  let h = 0;
  for (let i = 0; i < anonId.length; i++) h = (h * 31 + anonId.charCodeAt(i)) >>> 0;
  return gender === "female" ? (h % 2) + 1 : 1;
}

export function getPerformerTexture(
  renderer: Renderer,
  gender: PerformerGender,
  colors: PerformerColors,
  variant = 0,
): Texture {
  const v = gender === "male" ? 0 : variant || 1;
  const key = `${gender}|${v}|${colors.top}|${colors.bottom}|${colors.footwear}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const g = new Graphics();
  const cx = TEX_W / 2;
  const hair = gender === "male" ? HAIR_MALE : HAIR_FEMALE;

  // ── 后发层(女生,垂到肩) ─────────────────────────────
  if (gender !== "male") {
    g.roundRect(cx - 10, 3, 20, 27, 8).fill(hair);
    if (v === 2) {
      g.ellipse(cx - 11.5, 20, 3.6, 9).fill(hair);
      g.ellipse(cx + 11.5, 20, 3.6, 9).fill(hair);
    }
  }

  // ── 腿部(女生小腿,男生被裤覆盖) ──────────────────────
  if (gender === "female") {
    g.rect(cx - 5.2, 70, 4.2, 17).fill(SKIN);
    g.rect(cx + 1, 70, 4.2, 17).fill(SKIN);
  }

  // ── 下装 ─────────────────────────────────────────────
  if (gender === "female") {
    // 连衣裙裙摆(A 字 + 褶皱)
    g.poly([cx - 9.5, 44, cx + 9.5, 44, cx + 15, 72, cx - 15, 72]).fill(colors.top);
    g.rect(cx - 5.5, 47, 1, 23).fill({ color: 0x000000, alpha: 0.1 });
    g.rect(cx + 4.5, 47, 1, 23).fill({ color: 0x000000, alpha: 0.1 });
    g.rect(cx - 14.6, 70.2, 29.2, 2).fill({ color: 0xffffff, alpha: 0.35 });
  } else {
    // 长裤
    g.roundRect(cx - 10.5, 52, 21, 36, 2.5).fill(colors.bottom);
    g.rect(cx - 0.5, 55, 1, 31).fill({ color: 0x000000, alpha: 0.14 });
  }

  // ── 鞋 ───────────────────────────────────────────────
  g.roundRect(cx - 9.2, 87.5, 8.4, 5, 2).fill(colors.footwear);
  g.roundRect(cx + 0.8, 87.5, 8.4, 5, 2).fill(colors.footwear);

  // ── 上衣 ─────────────────────────────────────────────
  if (gender === "female") {
    // 连衣裙上身 + 腰带
    g.poly([cx - 8.5, 24, cx + 8.5, 24, cx + 9.5, 44, cx - 9.5, 44]).fill(colors.top);
    g.rect(cx - 9.5, 42.5, 19, 3).fill(colors.bottom);
    // 小圆领
    g.poly([cx - 3.5, 24, cx + 3.5, 24, cx, 27.5]).fill(COLLAR);
    // 短袖 + 手臂
    g.roundRect(cx - 12.5, 24.5, 4.6, 11, 2.2).fill(colors.top);
    g.roundRect(cx + 7.9, 24.5, 4.6, 11, 2.2).fill(colors.top);
    g.rect(cx - 11.6, 35.5, 2.8, 13).fill(SKIN);
    g.rect(cx + 8.8, 35.5, 2.8, 13).fill(SKIN);
    g.circle(cx - 10.2, 49.5, 2.2).fill(SKIN);
    g.circle(cx + 10.2, 49.5, 2.2).fill(SKIN);
  } else {
    // 衬衫主体
    g.poly([cx - 9.5, 24, cx + 9.5, 24, cx + 10.5, 53, cx - 10.5, 53]).fill(colors.top);
    // 翻领
    g.poly([cx - 3.5, 24, cx, 28, cx + 3.5, 24, cx, 26]).fill(COLLAR);
    // 前襟线与纽扣
    g.rect(cx - 0.5, 28, 1, 23).fill({ color: 0x000000, alpha: 0.14 });
    g.circle(cx + 2, 32, 0.9).fill({ color: 0x000000, alpha: 0.25 });
    g.circle(cx + 2, 38, 0.9).fill({ color: 0x000000, alpha: 0.25 });
    g.circle(cx + 2, 44, 0.9).fill({ color: 0x000000, alpha: 0.25 });
    // 长袖 + 袖口 + 手
    g.roundRect(cx - 13.5, 24.5, 5, 23, 2.4).fill(colors.top);
    g.roundRect(cx + 8.5, 24.5, 5, 23, 2.4).fill(colors.top);
    g.rect(cx - 13.5, 45.5, 5, 2.4).fill(COLLAR);
    g.rect(cx + 8.5, 45.5, 5, 2.4).fill(COLLAR);
    g.circle(cx - 11, 50.5, 2.3).fill(SKIN);
    g.circle(cx + 11, 50.5, 2.3).fill(SKIN);
  }

  // ── 脖子与头 ─────────────────────────────────────────
  g.rect(cx - 2, 18.5, 4, 6).fill(SKIN);
  g.ellipse(cx, 10.5, 8.5, 9).fill(SKIN);
  g.circle(cx - 8.2, 11.5, 1.5).fill(SKIN);
  g.circle(cx + 8.2, 11.5, 1.5).fill(SKIN);

  // ── 头发(前层) ───────────────────────────────────────
  if (gender === "male") {
    g.circle(cx, 6.5, 8.6).fill(hair);
    g.roundRect(cx - 9, 7, 2.2, 7, 1.1).fill(hair);
    g.roundRect(cx + 6.8, 7, 2.2, 7, 1.1).fill(hair);
    // 发际碎发
    g.circle(cx - 4.5, 10.5, 2.6).fill(hair);
    g.circle(cx + 2.5, 10.8, 2.8).fill(hair);
  } else {
    g.circle(cx, 6, 8.8).fill(hair);
    // 齐刘海下缘
    g.circle(cx - 5.5, 9.5, 2.4).fill(hair);
    g.circle(cx, 10.2, 2.6).fill(hair);
    g.circle(cx + 5.5, 9.5, 2.4).fill(hair);
    if (v === 2) {
      // 发圈(上衣色点缀)
      g.circle(cx - 10.5, 12.5, 1.5).fill(colors.top);
      g.circle(cx + 10.5, 12.5, 1.5).fill(colors.top);
    }
  }

  // ── 五官 ─────────────────────────────────────────────
  g.circle(cx - 3, 12.5, 1.1).fill(EYE);
  g.circle(cx + 3, 12.5, 1.1).fill(EYE);
  g.circle(cx - 2.7, 12.2, 0.4).fill(0xffffff);
  g.circle(cx + 3.3, 12.2, 0.4).fill(0xffffff);
  g.ellipse(cx - 5.6, 14.8, 1.6, 1).fill({ color: BLUSH, alpha: 0.7 });
  g.ellipse(cx + 5.6, 14.8, 1.6, 1).fill({ color: BLUSH, alpha: 0.7 });
  g.ellipse(cx, 16.4, 1.3, 0.85).fill(MOUTH);

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
