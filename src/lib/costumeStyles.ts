// 儿童演出服款式预设,两种实现方式:
// 1. 分区染色款(不带 modelUrl):不改模型几何,染色着色器按"身体高度分区"模拟款式,
//    把白色布料按归一化身高(脚底 0 -> 头顶 1)划分为下装/上装/腰带/领口分别染色。
// 2. 真实模型款(带 modelUrl):人物模型保留,该款式的 3D 白衣服装作为覆盖层
//    "叠穿"在人物身上(按 fit 参数对齐肩线与身高比例),白衣染色照常生效,
//    既能看到人也有真实的裙摆/西装轮廓。
// 说明:分区数值为演出服常见比例,基于小学/初高段模型实测微调。

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
};

export const COSTUME_STYLES: CostumeStyle[] = [
  {
    id: "classic",
    name: "经典学生装",
    summary: "上衣 + 长裤/裙,标准两截式,最百搭",
    split: 0.5,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: false,
  },
  {
    id: "sailor",
    name: "水手服",
    summary: "海军领点缀 + 上下两截,合唱/朗诵经典款",
    split: 0.48,
    beltWidth: 0,
    collarFrom: 0.72,
    onePiece: false,
  },
  {
    id: "sport",
    name: "运动套装",
    summary: "上下分色 + 腰间撞色条,韵律操/啦啦操适用",
    split: 0.5,
    beltWidth: 0.025,
    collarFrom: 1,
    onePiece: false,
  },
  {
    id: "overalls",
    name: "背带裤",
    summary: "下装色一直延伸到胸口,活泼低龄感",
    split: 0.66,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: false,
  },
  {
    id: "dress",
    name: "连衣裙 / 连体服",
    summary: "整身同色,舞蹈群舞的整体感最强",
    split: 0,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: true,
  },
  {
    id: "formal",
    name: "礼服套装",
    summary: "两截式 + 领口点缀 + 腰带,颁奖/主持人款",
    split: 0.52,
    beltWidth: 0.02,
    collarFrom: 0.75,
    onePiece: false,
  },
  // ---- 真实模型款(云盘「模特服装图库」,服装叠穿在人物模型上) ----
  {
    id: "m-dress",
    name: "礼裙",
    summary: "真实裙摆服装叠穿,染整身色,晚会/合唱领唱",
    split: 0,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: true,
    modelUrl: "/models/style-dress.glb",
    fit: { height: 0.44, top: 0.70 },
  },
  {
    id: "m-embroidered",
    name: "刺绣裙",
    summary: "绣花连衣裙叠穿,民族风/古典舞",
    split: 0,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: true,
    modelUrl: "/models/style-embroidered.glb",
    fit: { height: 0.46, top: 0.70 },
  },
  {
    id: "m-tulle",
    name: "纱裙",
    summary: "蓬蓬纱裙叠穿,芭蕾/童话剧",
    split: 0,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: true,
    modelUrl: "/models/style-tulle.glb",
    fit: { height: 0.42, top: 0.70 },
  },
  {
    id: "m-white-dress",
    name: "素白长裙",
    summary: "简约长裙叠穿,诗朗诵/烛光合唱",
    split: 0,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: true,
    modelUrl: "/models/style-white-dress.glb",
    fit: { height: 0.52, top: 0.70 },
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
  {
    id: "m-romper",
    name: "幼儿爬服",
    summary: "低龄连体爬服叠穿,幼儿园/亲子节目",
    split: 0,
    beltWidth: 0,
    collarFrom: 1,
    onePiece: true,
    modelUrl: "/models/style-romper.glb",
    fit: { height: 0.40, top: 0.72 },
  },
];

export function getCostumeStyle(id: string): CostumeStyle {
  return COSTUME_STYLES.find((s) => s.id === id) ?? COSTUME_STYLES[0];
}
