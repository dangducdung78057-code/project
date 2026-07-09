// StageOS · 模块二:商家预选池与定制派单系统 (B2B Supply Chain) v1.0
// 设计来源:《后端商家预选池与定制派单系统设计说明》
// 职责:
//   1. 商家画像库(Merchant Profile):在二次审核档案基础上扩展 MOQ/交期/工艺标签
//   2. 智能撮合引擎(Matchmaking):按订单量、演出倒计时、工艺要求反向筛选商家
//   3. RFQ 派发:将前端 3D 换装数据(款式 + Color ID 配色)转译为工厂工艺单(Tech Pack)
// 说明:本项目为前端 SPA,撮合与工艺单生成先以纯函数实现(与 merchantGateway 的
// 适配器模式一致);接入真实商家后,同一套数据契约可原样迁移到服务端 API。

import type { MerchantProfile, VettingPolicy } from "./merchantVetting";
import { vetMerchant, DEFAULT_POLICY } from "./merchantVetting";
import { getCostumeStyle } from "./costumeStyles";

// ---------- 商家画像库(在二次审核档案上扩展供应链字段) ----------

/** 支持的定制工艺标签 */
export type CraftTag = "Embroidery" | "DigitalPrint" | "TraditionalDye" | "HeatTransfer" | "Sequin";

export const CRAFT_LABELS: Record<CraftTag, string> = {
  Embroidery: "刺绣",
  DigitalPrint: "数码印花",
  TraditionalDye: "传统染整",
  HeatTransfer: "热转印",
  Sequin: "亮片钉珠",
};

/** 柔性定制商家画像 = 二次审核档案 + 小单快反供应链标签 */
export type SupplyMerchant = MerchantProfile & {
  /** 最小起订量(件) */
  moq: number;
  /** 生产交期(天) */
  turnaroundDays: number;
  /** 支持工艺 */
  crafts: CraftTag[];
  /** 支持的儿童体型段(如 "9-11岁") */
  sizeRanges?: string[];
};

// ---------- 智能撮合引擎 ----------

export type MatchRequest = {
  /** 订单总件数(合唱团人数) */
  totalQuantity: number;
  /** 距演出天数 */
  daysUntilPerformance: number;
  /** 必须支持的工艺(可选) */
  requiredCraft?: CraftTag;
  /** 物流预留天数(默认 3 天) */
  logisticsBufferDays?: number;
};

export type MatchResult = {
  merchant: SupplyMerchant;
  /** 二次审核结果(直达池商家才可派单) */
  vettingScore: number;
  vettingPool: "direct" | "watch" | "rejected";
  /** 撮合命中说明(可直接展示) */
  matchNotes: string[];
};

/**
 * 智能匹配可用商家:
 * 1. 供应链硬条件:MOQ ≤ 订单量、交期 ≤ 演出倒计时 - 物流预留、工艺命中
 * 2. 复用二次审核引擎:被拒商家直接剔除,直达池优先、观察池垫底
 * 3. 排序:先按审核池(直达 > 观察),再按审核分,同分源头工厂靠前
 */
export function matchMerchants(
  pool: SupplyMerchant[],
  req: MatchRequest,
  policy: VettingPolicy = DEFAULT_POLICY,
): MatchResult[] {
  const buffer = req.logisticsBufferDays ?? 3;
  const deadline = req.daysUntilPerformance - buffer;

  const results: MatchResult[] = [];
  for (const m of pool) {
    // 供应链硬条件
    if (m.moq > req.totalQuantity) continue; // 起订量高于订单量,接不了小单
    if (m.turnaroundDays > deadline) continue; // 交期赶不上演出(含物流预留)
    if (req.requiredCraft && !m.crafts.includes(req.requiredCraft)) continue;

    // 二次审核闸门:被拒商家不进入撮合结果
    const vetting = vetMerchant(m, policy);
    if (vetting.pool === "rejected") continue;

    const notes: string[] = [
      `起订 ${m.moq} 件 ≤ 订单 ${req.totalQuantity} 件`,
      `交期 ${m.turnaroundDays} 天,演出前 ${buffer} 天物流预留仍可送达`,
    ];
    if (req.requiredCraft) notes.push(`支持${CRAFT_LABELS[req.requiredCraft]}工艺`);
    if (m.isSourceFactory) notes.push("源头工厂直供");

    results.push({ merchant: m, vettingScore: vetting.score, vettingPool: vetting.pool, matchNotes: notes });
  }

  return results.sort((a, b) => {
    if (a.vettingPool !== b.vettingPool) return a.vettingPool === "direct" ? -1 : 1;
    if (b.vettingScore !== a.vettingScore) return b.vettingScore - a.vettingScore;
    return Number(b.merchant.isSourceFactory) - Number(a.merchant.isSourceFactory);
  });
}

// ---------- RFQ 工艺单(Tech Pack)生成 ----------

/** 前端 3D 换装数据 → 工厂工艺单的颜色部位映射(与 Color ID 蒙版通道一一对应) */
export type ColorConfig = {
  /** R 通道:上衣 */
  part1: string;
  /** G 通道:下装 */
  part2: string;
  /** B 通道:点缀(领结/腰带) */
  part3: string;
};

export type TechPack = {
  rfqId: string;
  timestamp: string;
  buyerProfile: {
    targetDemographic: string;
    totalUnits: number;
  };
  designSpecifications: {
    baseModel: string;
    baseModelName: string;
    colorWay: { part: string; hex: string; material: string; idChannel: "R" | "G" | "B" }[];
    referenceImages: string[];
  };
  status: "PENDING_QUOTES" | "QUOTED" | "CONFIRMED" | "CLOSED";
};

export type RfqRequest = {
  /** 款式预设 id(costumeStyles.ts) */
  styleId: string;
  /** 3D 换装配色(Color ID 三通道) */
  colorConfig: ColorConfig;
  /** 学生人数 */
  studentCount: number;
  /** 体型段描述(如 "4-5年级,9-11岁") */
  demographic?: string;
  /** 前端 3D 渲染截图(导出后填入) */
  referenceImages?: string[];
};

/**
 * 一键生成工艺单:将 3D 设计参数转译为服装厂能看懂的生产参数。
 * 部位命名与面料从款式预设推导(连体款只有整身色,分体款拆上衣/下装)。
 */
export function buildTechPack(req: RfqRequest): TechPack {
  const style = getCostumeStyle(req.styleId);
  const colorWay: TechPack["designSpecifications"]["colorWay"] = style.onePiece
    ? [
        { part: "整身(连体款)", hex: req.colorConfig.part1, material: "Chiffon", idChannel: "R" },
        { part: "领口/腰带点缀", hex: req.colorConfig.part3, material: "Satin", idChannel: "B" },
      ]
    : [
        { part: "上衣", hex: req.colorConfig.part1, material: "Cotton", idChannel: "R" },
        { part: "下装", hex: req.colorConfig.part2, material: "Chiffon", idChannel: "G" },
        { part: "领结/腰带点缀", hex: req.colorConfig.part3, material: "Satin", idChannel: "B" },
      ];

  return {
    rfqId: `RFQ-${Date.now()}`,
    timestamp: new Date().toISOString(),
    buyerProfile: {
      targetDemographic: req.demographic ?? "9-11 岁(4-5 年级)",
      totalUnits: req.studentCount,
    },
    designSpecifications: {
      baseModel: style.id,
      baseModelName: style.name,
      colorWay,
      referenceImages: req.referenceImages ?? [],
    },
    status: "PENDING_QUOTES",
  };
}

// ---------- RFQ 派发(走商家网关适配器,未接入时预留) ----------

export type RfqDispatchResult =
  | { reserved: true; message: string; techPack: TechPack }
  | { reserved: false; techPack: TechPack; dispatchedTo: string[] };

/** RFQ 派发适配器:接入商家端(MQTT/Webhook/HTTP)时注入实现 */
export interface RfqDispatchAdapter {
  broadcast(techPack: TechPack, merchantIds: string[]): Promise<void>;
  fetchSupplyMerchants(): Promise<SupplyMerchant[]>;
}

let rfqAdapter: RfqDispatchAdapter | null = null;

export function registerRfqAdapter(impl: RfqDispatchAdapter) {
  rfqAdapter = impl;
}

export function isRfqConnected(): boolean {
  return rfqAdapter !== null;
}

/**
 * 一键定制派单:生成工艺单 → 撮合合格工厂 → 广播询价。
 * 商家未接入时返回预留占位(工艺单仍然生成,可先导出给线下工厂)。
 */
export async function submitRfq(
  rfq: RfqRequest,
  match: MatchRequest,
  policy: VettingPolicy = DEFAULT_POLICY,
): Promise<RfqDispatchResult> {
  const techPack = buildTechPack(rfq);
  if (!rfqAdapter) {
    return {
      reserved: true,
      message: "定制工艺单已生成。商家端尚未接入,接入后将自动推送至预选工厂池询价。",
      techPack,
    };
  }
  const pool = await rfqAdapter.fetchSupplyMerchants();
  const matched = matchMerchants(pool, match, policy);
  const directIds = matched.filter((r) => r.vettingPool === "direct").map((r) => r.merchant.id);
  await rfqAdapter.broadcast(techPack, directIds);
  return { reserved: false, techPack, dispatchedTo: directIds };
}
