/**
 * 模块二:商家预选池与定制派单系统 回归测试
 * 覆盖:撮合硬条件(MOQ/交期/工艺)、二次审核闸门、排序规则、工艺单转译
 */
import { describe, expect, it } from "vitest";
import { matchMerchants, buildTechPack, submitRfq, isRfqConnected, type SupplyMerchant } from "@/lib/supplyChain";

/** 造一个默认全绿的合格商家档案 */
function makeMerchant(overrides: Partial<SupplyMerchant> = {}): SupplyMerchant {
  return {
    id: "M001",
    name: "广州华衣少儿服饰源头厂",
    rating: 4.9,
    badReviewRate: 0.005,
    disputeRate: 0.002,
    licenseVerified: true,
    isSourceFactory: true,
    depositPaid: true,
    recentOrders: 120,
    avgResponseMinutes: 15,
    violations90d: 0,
    supportsUrgentRestock: true,
    cooperatedSchools: 6,
    moq: 30,
    turnaroundDays: 7,
    crafts: ["Embroidery", "DigitalPrint"],
    ...overrides,
  };
}

describe("智能撮合引擎", () => {
  it("MOQ 高于订单量的商家被剔除(小单快反)", () => {
    const pool = [makeMerchant({ moq: 50 })];
    const out = matchMerchants(pool, { totalQuantity: 36, daysUntilPerformance: 20 });
    expect(out).toHaveLength(0);
  });

  it("交期赶不上演出倒计时(含 3 天物流预留)的商家被剔除", () => {
    const pool = [makeMerchant({ turnaroundDays: 15 })];
    // 演出 17 天后:17 - 3 = 14 < 15,来不及
    expect(matchMerchants(pool, { totalQuantity: 36, daysUntilPerformance: 17 })).toHaveLength(0);
    // 演出 18 天后:18 - 3 = 15 ≥ 15,刚好赶上
    expect(matchMerchants(pool, { totalQuantity: 36, daysUntilPerformance: 18 })).toHaveLength(1);
  });

  it("工艺不匹配的商家被剔除", () => {
    const pool = [makeMerchant({ crafts: ["TraditionalDye"] })];
    const out = matchMerchants(pool, { totalQuantity: 36, daysUntilPerformance: 20, requiredCraft: "Embroidery" });
    expect(out).toHaveLength(0);
  });

  it("未通过二次审核红线的商家即使供应链条件达标也被剔除", () => {
    const pool = [makeMerchant({ rating: 4.0 })]; // 低于 4.6 红线
    const out = matchMerchants(pool, { totalQuantity: 36, daysUntilPerformance: 20 });
    expect(out).toHaveLength(0);
  });

  it("排序:直达池优先于观察池,同池按审核分降序", () => {
    const strong = makeMerchant({ id: "A", name: "强商家" });
    // 弱商家:通过红线但二审分低(非源头/无保证金/响应慢/零学校)
    const weak = makeMerchant({
      id: "B",
      name: "弱商家",
      rating: 4.6,
      isSourceFactory: false,
      depositPaid: false,
      avgResponseMinutes: 300,
      supportsUrgentRestock: false,
      cooperatedSchools: 0,
      badReviewRate: 0.02,
    });
    const out = matchMerchants([weak, strong], { totalQuantity: 36, daysUntilPerformance: 20 });
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0].merchant.id).toBe("A");
    expect(out[0].vettingPool).toBe("direct");
  });
});

describe("RFQ 工艺单转译", () => {
  const colorConfig = { part1: "#3aa89e", part2: "#4a5568", part3: "#e8a468" };

  it("分体款拆出上衣/下装/点缀三个部位,通道与 Color ID 蒙版一致", () => {
    const tp = buildTechPack({ styleId: "sailor", colorConfig, studentCount: 36 });
    expect(tp.designSpecifications.colorWay).toHaveLength(3);
    expect(tp.designSpecifications.colorWay.map((c) => c.idChannel)).toEqual(["R", "G", "B"]);
    expect(tp.designSpecifications.colorWay[0].hex).toBe("#3aa89e");
    expect(tp.buyerProfile.totalUnits).toBe(36);
    expect(tp.status).toBe("PENDING_QUOTES");
  });

  it("连体款(连衣裙)只有整身色 + 点缀,不出现下装部位", () => {
    const tp = buildTechPack({ styleId: "dress", colorConfig, studentCount: 36 });
    expect(tp.designSpecifications.colorWay).toHaveLength(2);
    expect(tp.designSpecifications.colorWay.some((c) => c.idChannel === "G")).toBe(false);
  });

  it("默认体型段为 9-11 岁(4-5 年级)", () => {
    const tp = buildTechPack({ styleId: "classic", colorConfig, studentCount: 36 });
    expect(tp.buyerProfile.targetDemographic).toContain("9-11");
  });

  it("商家未接入时 submitRfq 返回预留占位但工艺单仍生成", async () => {
    expect(isRfqConnected()).toBe(false);
    const out = await submitRfq(
      { styleId: "sailor", colorConfig, studentCount: 36 },
      { totalQuantity: 36, daysUntilPerformance: 20 },
    );
    expect(out.reserved).toBe(true);
    expect(out.techPack.rfqId).toMatch(/^RFQ-/);
  });
});
