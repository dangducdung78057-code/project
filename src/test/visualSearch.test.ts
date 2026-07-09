// 模块三:以图搜图系统回归测试
// 注:嵌入提取的 canvas 路径依赖浏览器环境,这里通过注入测试适配器
// 验证向量数学、入库/检索契约与排序逻辑(与 Python 版行为对齐)。
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  registerMerchantProduct,
  searchSimilarClothing,
  registerEmbeddingAdapter,
  isProductionEmbedding,
  clearMemoryStore,
  l2Normalize,
  dot,
  type EmbeddingAdapter,
} from "@/lib/visualSearch";

/** 测试用嵌入适配器:按图片体积生成确定性向量,保证测试可复现 */
function makeTestAdapter(): EmbeddingAdapter {
  return {
    modelId: "test/deterministic",
    dimension: 4,
    async extract(image: Blob) {
      const size = image.size;
      // 不同 size 产生方向不同的向量
      return l2Normalize(new Float32Array([1, size % 7, (size * 3) % 11, (size * 5) % 13]));
    },
  };
}

function blobOfSize(n: number): Blob {
  return new Blob([new Uint8Array(n)]);
}

describe("模块三:向量数学", () => {
  it("l2Normalize 后向量模长为 1", () => {
    const v = l2Normalize(new Float32Array([3, 4]));
    expect(Math.sqrt(v[0] * v[0] + v[1] * v[1])).toBeCloseTo(1, 6);
  });

  it("归一化向量的点积即余弦相似度:自身相似度为 1", () => {
    const v = l2Normalize(new Float32Array([2, 5, 1]));
    expect(dot(v, v)).toBeCloseTo(1, 6);
  });

  it("维度不匹配时抛错", () => {
    expect(() => dot(new Float32Array([1]), new Float32Array([1, 2]))).toThrow();
  });
});

describe("模块三:入库与检索契约", () => {
  beforeEach(() => {
    clearMemoryStore();
    registerEmbeddingAdapter(makeTestAdapter());
  });

  afterEach(() => {
    clearMemoryStore();
  });

  it("空库检索返回空结果与提示语(与 Python 版一致)", async () => {
    const r = await searchSimilarClothing(blobOfSize(100));
    expect(r.status).toBe("success");
    if (r.status === "success") {
      expect(r.results).toHaveLength(0);
      expect(r.message).toContain("暂无");
    }
  });

  it("入库成功返回带 SKU 的成功消息", async () => {
    const r = await registerMerchantProduct("SKU_99102_WHITE_DRESS", blobOfSize(50), {
      merchantName: "针织世家儿童礼服工厂",
      price: 89,
      stock: 450,
      sourceUrl: "https://detail.1688.com/offer/123456.html",
    });
    expect(r.status).toBe("success");
    expect(r.message).toContain("SKU_99102_WHITE_DRESS");
  });

  it("正确入库后可检索,完全同图相似度为 1 且排第一", async () => {
    await registerMerchantProduct("SKU_A", blobOfSize(100), { merchantName: "厂A", price: 89, stock: 450 });
    await registerMerchantProduct("SKU_B", blobOfSize(333), { merchantName: "厂B", price: 59, stock: 120 });

    const r = await searchSimilarClothing(blobOfSize(100), 3);
    expect(r.status).toBe("success");
    if (r.status === "success") {
      expect(r.results[0].skuId).toBe("SKU_A");
      expect(r.results[0].similarity).toBeCloseTo(1, 3);
      expect(r.results[0].merchantInfo.merchantName).toBe("厂A");
      // 降序排序
      expect(r.results[0].similarity).toBeGreaterThanOrEqual(r.results[1]?.similarity ?? -1);
    }
  });

  it("topK 截断生效", async () => {
    for (let i = 0; i < 5; i++) {
      await registerMerchantProduct(`SKU_${i}`, blobOfSize(100 + i * 37), { merchantName: `厂${i}`, price: 10, stock: 1 });
    }
    const r = await searchSimilarClothing(blobOfSize(100), 2);
    expect(r.status).toBe("success");
    if (r.status === "success") expect(r.results).toHaveLength(2);
  });

  it("注入适配器后 isProductionEmbedding 为 true", () => {
    expect(isProductionEmbedding()).toBe(true);
  });
});
