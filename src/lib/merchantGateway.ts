// StageOS · 商家网关预留接口 v1.0
// 三个预留能力:一键比价 / 一键直达 / 二手互转。
// 设计与 procurementProvider 一致:适配器注册制 + 未接入时返回 RESERVED 占位,
// 后续接入商家时只需 registerGatewayAdapter() 注入实现,UI 与调用方零改动。

import type { PlanItem } from "./procurementMatch";
import type { MerchantProfile, VettingPolicy } from "./merchantVetting";
import { vetMerchant, DEFAULT_POLICY } from "./merchantVetting";

// ---------- 数据契约 ----------

/** 一键比价:同一物料在多个商家的实时报价 */
export type PriceQuote = {
  merchantId: string;
  merchantName: string;
  unitPrice: number;
  moq: number;                 // 起订量
  deliveryDays: number;        // 承诺交期(天)
  isSourceFactory: boolean;
  url?: string;
};

/** 一键直达:向预选池商家发起的直连工单 */
export type DirectReachTicket = {
  ticketId: string;
  merchantId: string;
  item: PlanItem;
  quantity: number;
  deadline?: string;           // 演出倒排的到货截止日
  status: "created" | "accepted" | "quoted" | "closed";
};

/** 二手互转:学校间演出服转让挂牌 */
export type SecondHandListing = {
  listingId: string;
  title: string;
  category: string;
  sizeRange: string;
  quantity: number;
  askPrice: number;
  condition: "like-new" | "good" | "worn";
  schoolRegion?: string;
  contact?: string;
};

export type GatewayResult<T> =
  | { reserved: true; message: string }
  | { reserved: false; data: T };

// ---------- 适配器契约(接入商家时实现此接口) ----------

export interface MerchantGatewayAdapter {
  /** 一键比价:返回按单价升序的报价列表 */
  comparePrices(item: PlanItem, quantity: number): Promise<PriceQuote[]>;
  /** 一键直达:向指定商家创建直连工单 */
  directReach(merchantId: string, item: PlanItem, quantity: number, deadline?: string): Promise<DirectReachTicket>;
  /** 二手互转:挂牌 / 检索转让信息 */
  listSecondHand(query: { category?: string; region?: string }): Promise<SecondHandListing[]>;
  publishSecondHand(listing: Omit<SecondHandListing, "listingId">): Promise<SecondHandListing>;
  /** 商家档案拉取(供二次审核引擎消费) */
  fetchMerchantProfiles(merchantIds?: string[]): Promise<MerchantProfile[]>;
}

// ---------- 注册与调用 ----------

let adapter: MerchantGatewayAdapter | null = null;

/** 接入商家时调用一次,注入真实实现(HTTP/Supabase Edge Function 均可) */
export function registerGatewayAdapter(impl: MerchantGatewayAdapter) {
  adapter = impl;
}

export function isGatewayConnected(): boolean {
  return adapter !== null;
}

const RESERVED_MSG = "接口已预留,商家尚未接入。接入后此按钮自动生效,无需升级应用。";

export async function priceCompare(item: PlanItem, quantity: number): Promise<GatewayResult<PriceQuote[]>> {
  if (!adapter) return { reserved: true, message: RESERVED_MSG };
  const quotes = await adapter.comparePrices(item, quantity);
  return { reserved: false, data: quotes.sort((a, b) => a.unitPrice - b.unitPrice) };
}

/**
 * 一键直达(带二次审核闸门):
 * 只有通过二次审核、进入直达预选池(pool === "direct")的商家才允许直连。
 * 观察池/被拒商家在此处被强制拦截,即使 UI 被绕过也无法下发工单。
 */
export async function directReach(
  merchantId: string,
  item: PlanItem,
  quantity: number,
  opts?: { deadline?: string; policy?: VettingPolicy },
): Promise<GatewayResult<DirectReachTicket>> {
  if (!adapter) return { reserved: true, message: RESERVED_MSG };
  const policy = opts?.policy ?? DEFAULT_POLICY;
  const profiles = await adapter.fetchMerchantProfiles([merchantId]);
  const profile = profiles[0];
  if (!profile) return { reserved: true, message: "商家档案不存在,已拦截直达请求。" };
  const vetting = vetMerchant(profile, policy);
  if (vetting.pool !== "direct") {
    const why = vetting.vetoReasons.length > 0 ? vetting.vetoReasons.join(";") : `评分 ${vetting.score} 未达直达池门槛 ${policy.directPoolScore}`;
    return { reserved: true, message: `该商家未通过二次审核(${why}),已拦截。` };
  }
  const ticket = await adapter.directReach(merchantId, item, quantity, opts?.deadline);
  return { reserved: false, data: ticket };
}

export async function secondHandSearch(query: { category?: string; region?: string }): Promise<GatewayResult<SecondHandListing[]>> {
  if (!adapter) return { reserved: true, message: RESERVED_MSG };
  return { reserved: false, data: await adapter.listSecondHand(query) };
}

export async function secondHandPublish(listing: Omit<SecondHandListing, "listingId">): Promise<GatewayResult<SecondHandListing>> {
  if (!adapter) return { reserved: true, message: RESERVED_MSG };
  return { reserved: false, data: await adapter.publishSecondHand(listing) };
}
