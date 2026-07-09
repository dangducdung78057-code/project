// 模块三:基于向量检索的"以图搜图"系统 (Visual Search Engine)
// ---------------------------------------------------------------
// 对应设计文档的 Python/CLIP 版 ImageSearchEngine 的 TypeScript 契约实现:
//   商品入库:商家上传现货服装图 -> 嵌入模型提取高维特征向量 -> 存入向量库
//   用户搜索:老师上传服装截图 -> 同一模型提取向量 -> 余弦相似度最近邻检索
//
// 架构与模块二(merchantGateway/supplyChain)一致的适配器预留模式:
//   - EmbeddingAdapter:嵌入模型适配层。生产环境注入远端 CLIP 推理服务
//     (openai/clip-vit-base-patch32,512 维);未注入时回退到内置的
//     浏览器本地特征提取器(canvas 颜色直方图,零依赖可演示)。
//   - VectorStoreAdapter:向量库适配层。生产环境注入 Milvus / Pinecone /
//     pgvector;未注入时使用内存向量库(与 Python 版 mock 行为一致)。
// 接入真实服务时只需调用 registerEmbeddingAdapter / registerVectorStoreAdapter,
// 检索调用方与 UI 零改动。

// ---------- 数据契约(与 Python 版字段一一对应) ----------

/** 商家现货商品档案(入库时随向量一起存储) */
export type MerchantProductInfo = {
  merchantName: string;
  price: number;
  stock: number;
  /** 外部商品链接(如 1688 详情页) */
  sourceUrl?: string;
  [key: string]: unknown;
};

/** 检索命中结果(similarity: 余弦相似度,-1 ~ 1,越接近 1 越相似) */
export type VisualSearchHit = {
  skuId: string;
  similarity: number;
  merchantInfo: MerchantProductInfo;
};

export type VisualSearchResult =
  | { status: "success"; results: VisualSearchHit[]; message?: string }
  | { status: "error"; message: string };

// ---------- 适配层 ----------

/** 嵌入模型适配器:输入图片,输出 L2 归一化后的特征向量 */
export type EmbeddingAdapter = {
  /** 模型标识,如 "openai/clip-vit-base-patch32" */
  modelId: string;
  /** 向量维度,如 512 */
  dimension: number;
  extract: (image: Blob) => Promise<Float32Array>;
};

/** 向量库适配器:生产环境对接 Milvus / Pinecone / pgvector */
export type VectorStoreAdapter = {
  upsert: (skuId: string, vector: Float32Array, merchantInfo: MerchantProductInfo) => Promise<void>;
  /** 返回按相似度降序的前 K 个命中 */
  query: (vector: Float32Array, topK: number) => Promise<VisualSearchHit[]>;
  count: () => Promise<number>;
};

let embeddingAdapter: EmbeddingAdapter | null = null;
let vectorStoreAdapter: VectorStoreAdapter | null = null;

/** 接入真实嵌入模型推理服务(如部署好的 CLIP HTTP 端点) */
export function registerEmbeddingAdapter(adapter: EmbeddingAdapter) {
  embeddingAdapter = adapter;
}

/** 接入真实向量数据库 */
export function registerVectorStoreAdapter(adapter: VectorStoreAdapter) {
  vectorStoreAdapter = adapter;
}

/** 是否已接入生产级嵌入模型(未接入时使用本地回退特征,仅供演示) */
export function isProductionEmbedding(): boolean {
  return embeddingAdapter !== null;
}

// ---------- 内置回退:浏览器本地特征提取(零依赖) ----------
// 用 canvas 将图片降采样后提取 HSV 加权颜色直方图 + 亮度分布,
// 得到 512 维归一化向量。对"颜色 + 大致明暗结构"相似的服装图有效,
// 精度不及 CLIP,但让以图搜图链路在未接入模型服务时即可端到端演示。

const FALLBACK_DIM = 512;

async function fallbackExtract(image: Blob): Promise<Float32Array> {
  const bitmap = await createImageBitmap(image);
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 上下文不可用");
  ctx.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();
  const { data } = ctx.getImageData(0, 0, size, size);

  // 8(H) x 4(S) x 4(V) = 128 个颜色桶 x 4 个空间象限 = 512 维
  const vec = new Float32Array(FALLBACK_DIM);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const v = max;
      const s = max === 0 ? 0 : (max - min) / max;
      let h = 0;
      if (max !== min) {
        if (max === r) h = ((g - b) / (max - min) + 6) % 6;
        else if (max === g) h = (b - r) / (max - min) + 2;
        else h = (r - g) / (max - min) + 4;
        h /= 6;
      }
      const hBin = Math.min(7, Math.floor(h * 8));
      const sBin = Math.min(3, Math.floor(s * 4));
      const vBin = Math.min(3, Math.floor(v * 4));
      // 空间象限:让"上衣色在上、裙色在下"这类布局差异可区分
      const quadrant = (y < size / 2 ? 0 : 2) + (x < size / 2 ? 0 : 1);
      vec[quadrant * 128 + hBin * 16 + sBin * 4 + vBin] += 1;
    }
  }
  return l2Normalize(vec);
}

// ---------- 内存向量库(与 Python 版 mock 行为一致) ----------

const memoryStore = new Map<string, { vector: Float32Array; merchantInfo: MerchantProductInfo }>();

const memoryVectorStore: VectorStoreAdapter = {
  async upsert(skuId, vector, merchantInfo) {
    memoryStore.set(skuId, { vector, merchantInfo });
  },
  async query(vector, topK) {
    const hits: VisualSearchHit[] = [];
    for (const [skuId, entry] of memoryStore) {
      hits.push({
        skuId,
        // 已归一化:点积即余弦相似度
        similarity: Math.round(dot(vector, entry.vector) * 10000) / 10000,
        merchantInfo: entry.merchantInfo,
      });
    }
    hits.sort((a, b) => b.similarity - a.similarity);
    return hits.slice(0, topK);
  },
  async count() {
    return memoryStore.size;
  },
};

// ---------- 向量数学 ----------

export function l2Normalize(v: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return v;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

export function dot(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new Error(`向量维度不匹配: ${a.length} vs ${b.length}`);
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

// ---------- 对外 API(与 Python 版方法一一对应) ----------

async function extractVector(image: Blob): Promise<Float32Array> {
  if (embeddingAdapter) return embeddingAdapter.extract(image);
  return fallbackExtract(image);
}

function store(): VectorStoreAdapter {
  return vectorStoreAdapter ?? memoryVectorStore;
}

/** 商品入库:商家上架现货时提取图片特征并存入向量库(对应 register_merchant_product) */
export async function registerMerchantProduct(
  skuId: string,
  image: Blob,
  merchantInfo: MerchantProductInfo,
): Promise<{ status: "success" | "error"; message: string }> {
  try {
    const vector = await extractVector(image);
    await store().upsert(skuId, vector, merchantInfo);
    return { status: "success", message: `商品 ${skuId} 特征入库成功` };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

/** 以图搜图:上传服装截图,返回相似度最高的前 K 个现货商品(对应 search_similar_clothing) */
export async function searchSimilarClothing(queryImage: Blob, topK = 3): Promise<VisualSearchResult> {
  try {
    if ((await store().count()) === 0) {
      return { status: "success", results: [], message: "库中暂无商家现货数据" };
    }
    const queryVector = await extractVector(queryImage);
    const results = await store().query(queryVector, topK);
    return { status: "success", results };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

/** 测试与运维辅助:清空内存向量库 */
export function clearMemoryStore() {
  memoryStore.clear();
}
