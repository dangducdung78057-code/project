// 儿童演出服款式预设(全部为真实模型款,带 modelUrl):
// 人物模型保留,该款式的 3D 白衣服装作为覆盖层"叠穿"在人物身上
// (按 fit 参数对齐肩线与身高比例),白衣染色照常生效,
// 既能看到人也有真实的裙摆/西装轮廓。
// split/beltWidth/collarFrom/onePiece 仍用于人物底模的分区染色回退。

export type CostumeStyle = {
  id: string;
  name: string;
  /** 一句话说明(悬停提示) */
  summary: string;
  /** 上下装分界线(归一化身高,以下为下装色) */
  split: number;
  /** 腰带条半宽(0 = 无腰带) */
  beltWidth: number;
  /** 领口点缀条起点(归一化身高,以上为点缀色;1 = 无领饰) */
  collarFrom: number;
  /** 连体款:整身只用上装色(裙装/连体服) */
  onePiece: boolean;
  /** 真实模型款:该款式的服装 .glb 路径(男女生共用),叠穿在人物模型上 */
  modelUrl?: string;
  /**
   * 穿着适配(仅真实模型款):服装叠穿在人物身上的比例。
   * height = 服装总高占身高的比例;top = 服装上沿对齐的身高位置(肩线约 0.82)
   */
  fit?: { height: number; top: number };
  /**
   * 男生替代款式 id(仅裙装等女生专属款需要):
   * 选中裙装时女生照常穿裙,男生自动换穿该替代款(礼服/西装),
   * 符合真实演出「女裙男装」的着装惯例,避免男生穿裙子。
   */
  maleVariant?: string;
};

// 全部为真实模型款(云盘「模特服装图库」,服装叠穿在人物模型上)
export const COSTUME_STYLES: CostumeStyle[] = [
  {
    id: "m-dress",
    name: "礼裙",
    summary: "真实裙摆服装叠穿,染整身色,晚会/合唱领唱(男生自动着两件套礼服)",
    split: 0,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: true,
    modelUrl: "/models/style-dress.glb",
    fit: { height: 0.44, top: 0.70 },
    maleVariant: "m-two-piece",
  },
  {
    id: "m-embroidered",
    name: "刺绣裙",
    summary: "绣花连衣裙叠穿,民族风/古典舞(男生自动着和风罩袍)",
    split: 0,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: true,
    modelUrl: "/models/style-embroidered.glb",
    fit: { height: 0.46, top: 0.70 },
    maleVariant: "m-kimono",
  },
  {
    id: "m-tulle",
    name: "纱裙",
    summary: "蓬蓬纱裙叠穿,芭蕾/童话剧(男生自动着连体演出服)",
    split: 0,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: true,
    modelUrl: "/models/style-tulle.glb",
    fit: { height: 0.42, top: 0.70 },
    maleVariant: "m-jumpsuit",
  },
  {
    id: "m-white-dress",
    name: "素白长裙",
    summary: "简约长裙叠穿,诗朗诵/烛光合唱(男生自动着三件套礼服)",
    split: 0,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: true,
    modelUrl: "/models/style-white-dress.glb",
    fit: { height: 0.52, top: 0.70 },
    maleVariant: "m-three-piece",
  },
  {
    id: "m-baby-formal",
    name: "小西装",
    summary: "低龄礼服套装叠穿,主持人/颁奖",
    split: 0.5,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: false,
    modelUrl: "/models/style-baby-formal.glb",
    fit: { height: 0.50, top: 0.72 },
  },
  {
    id: "m-three-piece",
    name: "三件套礼服",
    summary: "马甲三件套叠穿,正式晚会",
    split: 0.5,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: false,
    modelUrl: "/models/style-three-piece.glb",
    fit: { height: 0.50, top: 0.72 },
  },
  {
    id: "m-two-piece",
    name: "两件套礼服",
    summary: "两件套西装叠穿,合唱指挥/领诵",
    split: 0.5,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: false,
    modelUrl: "/models/style-two-piece.glb",
    fit: { height: 0.50, top: 0.72 },
  },
  {
    id: "m-jumpsuit",
    name: "连体演出服",
    summary: "连体衣叠穿,现代舞/街舞",
    split: 0,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: true,
    modelUrl: "/models/style-jumpsuit.glb",
    fit: { height: 0.58, top: 0.72 },
  },
  {
    id: "m-kimono",
    name: "和风罩袍",
    summary: "和服式罩袍叠穿,戏剧/传统文化节目",
    split: 0,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: true,
    modelUrl: "/models/style-kimono.glb",
    fit: { height: 0.54, top: 0.72 },
  },
];

export function getCostumeStyle(id: string): CostumeStyle {
  return COSTUME_STYLES.find((s) => s.id === id) ?? COSTUME_STYLES[0];
}

/**
 * 按性别解析实际穿着的款式:
 * 女生返回所选款式本身;男生遇到裙装(带 maleVariant)时自动换穿替代礼服款,
 * 保证「女裙男装」的正确着装组合。
 */
export function resolveCostumeStyle(id: string, gender: "male" | "female"): CostumeStyle {
  const style = getCostumeStyle(id);
  if (gender === "male" && style.maleVariant) {
    return getCostumeStyle(style.maleVariant);
  }
  return style;
}
