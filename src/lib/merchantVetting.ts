// StageOS · 商家二次审核引擎 v1.0
// 用途:商家接入后,进入"一键直达预选池"前的自动化二次审核。
// 两级审核模型:
//   一审(硬性红线,一票否决) → 二审(加权评分 + 分池)
// 全部阈值集中在 VettingPolicy,可按需调整,无需改审核逻辑。

// ---------- 商家档案(接入商家时需提供的最小字段集) ----------

export type MerchantProfile = {
  id: string;
  name: string;
  /** 平台评分(0-5) */
  rating: number;
  /** 近 90 天差评率(0-1) */
  badReviewRate: number;
  /** 近 90 天纠纷率(0-1) */
  disputeRate: number;
  /** 营业执照已核验 */
  licenseVerified: boolean;
  /** 是否源头工厂/一级货源(非二道贩子) */
  isSourceFactory: boolean;
  /** 已缴纳质量保证金 */
  depositPaid: boolean;
  /** 近 90 天成交单数 */
  recentOrders: number;
  /** 平均响应时长(分钟) */
  avgResponseMinutes: number;
  /** 近 90 天违规记录次数(虚假发货/掉包/刷单等) */
  violations90d: number;
  /** 支持 48h 应急补货 */
  supportsUrgentRestock?: boolean;
  /** 历史合作过的学校数(冷启动为 0) */
  cooperatedSchools?: number;
};

// ---------- 审核策略(全部阈值可调) ----------

export type VettingPolicy = {
  /** 一审红线 */
  minRating: number;              // 评分下限
  maxBadReviewRate: number;       // 差评率上限
  maxDisputeRate: number;         // 纠纷率上限
  maxViolations90d: number;       // 90 天违规次数上限
  requireLicense: boolean;        // 必须营业执照核验
  minRecentOrders: number;        // 最低成交量(过滤空壳店)
  /** 二审分池线 */
  directPoolScore: number;        // ≥ 此分进入直达预选池
  watchPoolScore: number;         // ≥ 此分进入观察池(人工复核)
};

export const DEFAULT_POLICY: VettingPolicy = {
  minRating: 4.6,
  maxBadReviewRate: 0.02,
  maxDisputeRate: 0.01,
  maxViolations90d: 0,
  requireLicense: true,
  minRecentOrders: 30,
  directPoolScore: 80,
  watchPoolScore: 60,
};

// ---------- 审核结果 ----------

export type VettingPool = "direct" | "watch" | "rejected";

export type VettingResult = {
  merchantId: string;
  pool: VettingPool;
  score: number;
  /** 一审被否决的红线原因(空数组 = 通过一审) */
  vetoReasons: string[];
  /** 二审加分/减分明细(可直接展示给运营) */
  scoreBreakdown: { label: string; delta: number }[];
};

// ---------- 一审:硬性红线(一票否决) ----------

export function hardScreen(m: MerchantProfile, policy: VettingPolicy = DEFAULT_POLICY): string[] {
  const reasons: string[] = [];
  if (m.rating < policy.minRating) reasons.push(`评分 ${m.rating.toFixed(1)} 低于门槛 ${policy.minRating}`);
  if (m.badReviewRate > policy.maxBadReviewRate)
    reasons.push(`差评率 ${(m.badReviewRate * 100).toFixed(1)}% 超过上限 ${(policy.maxBadReviewRate * 100).toFixed(1)}%`);
  if (m.disputeRate > policy.maxDisputeRate)
    reasons.push(`纠纷率 ${(m.disputeRate * 100).toFixed(1)}% 超过上限 ${(policy.maxDisputeRate * 100).toFixed(1)}%`);
  if (m.violations90d > policy.maxViolations90d) reasons.push(`近 90 天违规 ${m.violations90d} 次`);
  if (policy.requireLicense && !m.licenseVerified) reasons.push("营业执照未核验");
  if (m.recentOrders < policy.minRecentOrders) reasons.push(`近 90 天成交 ${m.recentOrders} 单,低于 ${policy.minRecentOrders} 单(疑似空壳)`);
  return reasons;
}

// ---------- 二审:加权评分 + 分池 ----------

export function vetMerchant(m: MerchantProfile, policy: VettingPolicy = DEFAULT_POLICY): VettingResult {
  const vetoReasons = hardScreen(m, policy);
  if (vetoReasons.length > 0) {
    return { merchantId: m.id, pool: "rejected", score: 0, vetoReasons, scoreBreakdown: [] };
  }

  const breakdown: { label: string; delta: number }[] = [];
  const add = (label: string, delta: number) => breakdown.push({ label, delta });

  // 基础分:评分线性映射(4.6→50 分, 5.0→70 分)
  add("平台评分基础分", Math.round(50 + ((m.rating - policy.minRating) / (5 - policy.minRating)) * 20));

  // 源头工厂优先:最大单项加分,保证同分时源头商排前
  if (m.isSourceFactory) add("源头工厂/一级货源", 15);
  // 质量保证金
  if (m.depositPaid) add("已缴质量保证金", 8);
  // 响应速度(≤30min 加满,>240min 不加)
  if (m.avgResponseMinutes <= 30) add("响应 ≤30 分钟", 6);
  else if (m.avgResponseMinutes <= 120) add("响应 ≤2 小时", 3);
  // 应急补货能力(演出场景强需求)
  if (m.supportsUrgentRestock) add("支持 48h 应急补货", 6);
  // 学校合作履历
  const schools = m.cooperatedSchools ?? 0;
  if (schools >= 5) add(`已服务 ${schools} 所学校`, 5);
  else if (schools >= 1) add(`已服务 ${schools} 所学校`, 2);
  // 差评率越低加分越多(0% → +5)
  add("低差评率加成", Math.round((1 - m.badReviewRate / policy.maxBadReviewRate) * 5));

  const score = Math.min(100, breakdown.reduce((s, b) => s + b.delta, 0));
  const pool: VettingPool = score >= policy.directPoolScore ? "direct" : score >= policy.watchPoolScore ? "watch" : "rejected";
  return { merchantId: m.id, pool, score, vetoReasons: [], scoreBreakdown: breakdown };
}

/** 批量审核并输出三池分组,直达池内按分数降序(源头工厂自然靠前) */
export function buildPools(merchants: MerchantProfile[], policy: VettingPolicy = DEFAULT_POLICY) {
  const results = merchants.map((m) => ({ merchant: m, result: vetMerchant(m, policy) }));
  const byPool = (p: VettingPool) =>
    results.filter((r) => r.result.pool === p).sort((a, b) => b.result.score - a.result.score);
  return { direct: byPool("direct"), watch: byPool("watch"), rejected: byPool("rejected") };
}
