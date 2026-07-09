// 卡通学生 .glb 模型加载管线(useGLTF + SkeletonUtils.clone,唯一渲染路径)。
// 模型文件按学段 x 性别四套:
//   小学段: public/models/boy.glb / girl.glb
//   初高段: public/models/teen-boy.glb / teen-girl.glb
// 设计师的正式模型到位后直接覆盖对应文件即可,无需改代码。
// 要求:标准人体比例、Y 轴向上、面向 +Z、原点在双脚之间的地面。
// 渲染:材质自动替换为 MeshToonMaterial(三阶渐变贴图,卡通光影分界)。
// 服装换色:材质命名约定(top/pants/skirt)优先;单材质白衣模型走像素级染色着色器。
import { useEffect, useMemo, useState } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { resolveCostumeStyle } from "@/lib/costumeStyles";

// ---- Color ID Mapping(块一:一键换装与改色系统) ----
// 每个模型可选配一张 ID 蒙版贴图(与模型同名,后缀 -idmap.png,共享同一套 UV):
//   R 通道 = 部位 1(上衣) / G 通道 = 部位 2(下装) / B 通道 = 部位 3(点缀)
// 蒙版存在时优先走通道分区换色(100% 精确不穿模);
// 缺蒙版时自动回退到"高度分区 + 白色检测"启发式方案。
const idMapCache = new Map<string, THREE.Texture | null>();
const idMapPending = new Map<string, Promise<THREE.Texture | null>>();

function loadIdMapTexture(modelUrl: string): Promise<THREE.Texture | null> {
  if (idMapCache.has(modelUrl)) return Promise.resolve(idMapCache.get(modelUrl)!);
  const pending = idMapPending.get(modelUrl);
  if (pending) return pending;
  const idMapUrl = modelUrl.replace(/\.glb$/, "-idmap.png");
  const p = new THREE.TextureLoader()
    .loadAsync(idMapUrl)
    .then((tex) => {
      tex.flipY = false; // 与 glTF UV 约定一致
      tex.colorSpace = THREE.NoColorSpace; // 数据贴图:通道值必须精确,禁用色彩转换
      idMapCache.set(modelUrl, tex);
      return tex;
    })
    .catch(() => {
      idMapCache.set(modelUrl, null); // 无蒙版:记住结果,回退启发式方案
      return null;
    })
    .finally(() => idMapPending.delete(modelUrl));
  idMapPending.set(modelUrl, p);
  return p;
}

/** 尝试加载模型对应的 ID 蒙版;加载完成前返回 null(先用回退方案渲染,零等待) */
function useIdMapTexture(modelUrl: string): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(() => idMapCache.get(modelUrl) ?? null);
  useEffect(() => {
    let alive = true;
    loadIdMapTexture(modelUrl).then((t) => {
      if (alive) setTex(t);
    });
    return () => {
      alive = false;
    };
  }, [modelUrl]);
  return tex;
}

/** 学段:小学段 primary / 初高段 secondary */
export type StageGroup = "primary" | "secondary";

const MODEL_URLS = {
  primary: {
    male: "/models/boy.glb",
    female: "/models/girl.glb",
  },
  secondary: {
    male: "/models/teen-boy.glb",
    female: "/models/teen-girl.glb",
  },
} as const;

// 模块加载即预取四套模型,首帧渲染前就绪,学段/性别切换零卡顿
for (const group of Object.values(MODEL_URLS)) {
  useGLTF.preload(group.male);
  useGLTF.preload(group.female);
}

// 朝向校正:当前这批 Tripo 生成件默认面向 +X(画面右侧),
// 统一绕 Y 轴 -90° 转到面向 +Z(正前方/观众席)。
// 后续换用已面向 +Z 的模型时把该值改为 0 即可。
const FACING_FIX_Y = -Math.PI / 2;

// ---- 模型实例渲染 ----

type CostumeColors = {
  /** 上衣颜色 */
  top: string;
  /** 下装颜色 */
  bottom: string;
  /** 裙摆/点缀颜色 */
  accent: string;
};

function matchSlot(name: string): keyof CostumeColors | null {
  const n = name.toLowerCase();
  if (/top|shirt|jacket|上衣|衫/.test(n)) return "top";
  if (/bottom|pants|trouser|短裤|裤/.test(n)) return "bottom";
  if (/skirt|dress|裙/.test(n)) return "accent";
  return null;
}

// ---- 卡通渲染:三阶渐变贴图(光影分界生硬,二次元质感;模块级共享一份) ----

let toonGradientMap: THREE.DataTexture | null = null;
function getToonGradientMap(): THREE.DataTexture {
  if (toonGradientMap) return toonGradientMap;
  // 三阶亮度:暗部 / 中间调 / 亮部
  const data = new Uint8Array([80, 80, 80, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  toonGradientMap = tex;
  return tex;
}

/**
 * 渲染一个卡通学生模型实例:
 * - SkeletonUtils.clone 深拷贝(带骨骼也安全),36 个小人共用一套底层几何体数据
 * - 按包围盒把模型精确缩放到目标身高,脚底对齐地面
 * - 材质替换为 MeshToonMaterial(保留原贴图与颜色,卡通光影)
 * - 按材质命名约定应用服装色系
 */
export function StudentGlbModel({
  gender,
  heightM,
  colors,
  selected,
  stageGroup = "primary",
  styleId = "m-two-piece",
}: {
  gender: "male" | "female";
  heightM: number;
  colors: CostumeColors;
  selected: boolean;
  /** 学段:小学段用儿童模型,初高段用少男少女模型 */
  stageGroup?: StageGroup;
  /** 服装款式预设 id(见 costumeStyles.ts) */
  styleId?: string;
}) {
  // 人物模型始终保留(学段 x 性别);真实模型款的服装作为覆盖层叠穿在人物身上
  const modelUrl = MODEL_URLS[stageGroup][gender];
  const { scene } = useGLTF(modelUrl);
  // Color ID 蒙版:存在时走通道分区换色,不存在时回退高度分区方案
  const idMapTex = useIdMapTexture(modelUrl);

  const instance = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene);

    // 姿态归一化:部分建模工具(Blender 扫描件等)导出 Z 轴朝上,
    // 检测到"高度在 Z 轴"时自动立起来(绕 X 轴 +90°)
    const rawBox = new THREE.Box3().setFromObject(cloned);
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);
    const isZUp = rawSize.z > rawSize.y * 1.5;
    if (isZUp) {
      cloned.rotation.x = Math.PI / 2;
      cloned.updateMatrixWorld(true);
    }
    // 款式分区染色需要几何体本地坐标下的身高范围(顶点着色器用)。
    // Z-up 模型旋转只发生在节点层,几何体本地高度轴仍是 z。
    const heightAxis: "y" | "z" = isZUp ? "z" : "y";
    const geomMinH = isZUp ? rawBox.min.z : rawBox.min.y;
    const geomMaxH = isZUp ? rawBox.max.z : rawBox.max.y;

    // 尺寸归一化:按包围盒缩放到目标身高,原点对齐脚底
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = size.y > 0.001 ? heightM / size.y : 1;
    cloned.scale.multiplyScalar(scale);
    cloned.position.y = -box.min.y * scale;
    // 水平居中(扫描模型原点常偏离脚底中心)
    const center = new THREE.Vector3();
    box.getCenter(center);
    cloned.position.x = -center.x * scale;
    cloned.position.z = -center.z * scale;

    // 替换为 Three.js 卡通渲染材质:提取原贴图颜色 + 服装换色 + 阶梯渐变
    let matchedAny = false;
    let hasTexture = false;
    const gradientMap = getToonGradientMap();
    const toToon = (m: THREE.Material, meshName: string): THREE.MeshToonMaterial => {
      const src = m as THREE.MeshStandardMaterial;
      const slot = matchSlot(src.name || meshName);
      if (slot) matchedAny = true;
      if (src.map) hasTexture = true;
      const mat = new THREE.MeshToonMaterial({
        // 提取原本的贴图颜色;命中服装槽位时替换为色系颜色
        color: slot ? new THREE.Color(colors[slot]) : (src.color?.clone() ?? new THREE.Color("#ffffff")),
        map: src.map ?? null,
        gradientMap,
      });
      mat.name = src.name;
      // 单材质白衣模型(如 Tripo AI 生成件)的像素级换色 + 款式分区:
      // 1. 贴图中"高亮度 + ��饱和"的纯白布料染色,皮肤/头发自动豁免;
      // 2. 按像素在身体上的归一化高��(脚 0 -> 头 1)分区:
      //    下装区染下装色、上装区染上装色、腰带/领口条染点缀色,
      //    从而在同一模型上呈现水手服/背带裤/连衣裙等不同款式轮廓。
      if (!slot && src.map && idMapTex) {
        // ---- 方案 A:Color ID Mapping(参数化材质替换) ----
        // 读取 ID 蒙版 RGB 通道作为部位遮罩,正片叠底染色,
        // 保留白模光影褶皱,毫秒级换色且 100% 不穿模。
        const style = resolveCostumeStyle(styleId, gender);
        const part1 = new THREE.Color(colors.top); // R 通道:上衣
        const part2 = style.onePiece ? new THREE.Color(colors.top) : new THREE.Color(colors.bottom); // G 通道:下装
        const part3 = new THREE.Color(colors.accent); // B 通道:点缀
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uIdMapTex = { value: idMapTex };
          shader.uniforms.uColorPart1 = { value: part1 };
          shader.uniforms.uColorPart2 = { value: part2 };
          shader.uniforms.uColorPart3 = { value: part3 };
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              `#include <common>
varying vec2 vIdUv;`,
            )
            .replace(
              "#include <begin_vertex>",
              `#include <begin_vertex>
vIdUv = uv;`,
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              `#include <common>
varying vec2 vIdUv;
uniform sampler2D uIdMapTex;
uniform vec3 uColorPart1;
uniform vec3 uColorPart2;
uniform vec3 uColorPart3;`,
            )
            .replace(
              "#include <map_fragment>",
              `#include <map_fragment>
{
  vec4 idMap = texture2D(uIdMapTex, vIdUv);
  float mask1 = idMap.r;
  float mask2 = idMap.g;
  float mask3 = idMap.b;
  float baseMask = max(0.0, 1.0 - (mask1 + mask2 + mask3));
  // 正片叠底:染色乘在底图上,保留光影褶皱;无通道覆盖区域(皮肤/头发)保持原色
  vec3 zoneTint = mask1 * uColorPart1 + mask2 * uColorPart2 + mask3 * uColorPart3 + baseMask * vec3(1.0);
  diffuseColor.rgb *= zoneTint;
}`,
            );
        };
        mat.customProgramCacheKey = () =>
          `cloth-idmap-${style.id}-${part1.getHexString()}-${part2.getHexString()}-${part3.getHexString()}`;
      } else if (!slot && src.map) {
        // ---- 方案 B(回退):高度分区 + 白色检测启发式 ----
        const style = resolveCostumeStyle(styleId, gender);
        const topTint = new THREE.Color(colors.top);
        const bottomTint = style.onePiece ? new THREE.Color(colors.top) : new THREE.Color(colors.bottom);
        const accentTint = new THREE.Color(colors.accent);
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uTopTint = { value: topTint };
          shader.uniforms.uBottomTint = { value: bottomTint };
          shader.uniforms.uAccentTint = { value: accentTint };
          shader.uniforms.uSplit = { value: style.split };
          shader.uniforms.uBeltW = { value: style.beltWidth };
          shader.uniforms.uCollarFrom = { value: style.collarFrom };
          shader.uniforms.uMinH = { value: geomMinH };
          shader.uniforms.uMaxH = { value: geomMaxH };
          // 顶点着色器:输出归一化身体高度(几何体本地坐标,考虑 Z-up 模型)
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              `#include <common>
varying float vBodyH;
uniform float uMinH;
uniform float uMaxH;`,
            )
            .replace(
              "#include <begin_vertex>",
              `#include <begin_vertex>
vBodyH = clamp((position.${heightAxis} - uMinH) / max(uMaxH - uMinH, 0.001), 0.0, 1.0);`,
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              `#include <common>
varying float vBodyH;
uniform vec3 uTopTint;
uniform vec3 uBottomTint;
uniform vec3 uAccentTint;
uniform float uSplit;
uniform float uBeltW;
uniform float uCollarFrom;`,
            )
            .replace(
              "#include <map_fragment>",
              `#include <map_fragment>
{
  float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  float sat = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)) - min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
  float whiteMask = smoothstep(0.60, 0.78, lum) * (1.0 - smoothstep(0.06, 0.16, sat));
  // 高度分区选色:默认上装色 -> 分界线以下换下装色 -> 腰带条/领口条换点缀色
  vec3 zone = uTopTint;
  if (vBodyH < uSplit) zone = uBottomTint;
  if (uBeltW > 0.0 && abs(vBodyH - uSplit) < uBeltW) zone = uAccentTint;
  if (vBodyH > uCollarFrom && vBodyH < uCollarFrom + 0.05) zone = uAccentTint;
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * zone, whiteMask);
}`,
            );
        };
        // 不同款式 x 配色需要独立着色器程序缓存
        mat.customProgramCacheKey = () =>
          `cloth-style-${style.id}-${topTint.getHexString()}-${bottomTint.getHexString()}-${accentTint.getHexString()}-${heightAxis}`;
      }
      return mat;
    };
    cloned.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      // 开启阴影投射和接收
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((m) => toToon(m, mesh.name))
        : toToon(mesh.material, mesh.name);
    });
    // 无命名匹配且无整体贴图时:整体着上衣主色。
    // 有完整贴图的模型(如设计师提供的扫描/绘制模型)保留原始外观,不做整体染色
    if (!matchedAny && !hasTexture) {
      cloned.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return;
        const mat = (obj as THREE.Mesh).material as THREE.MeshToonMaterial;
        mat.color?.set(colors.top);
      });
    }
    return cloned;
  }, [scene, heightM, colors.top, colors.bottom, colors.accent, styleId, idMapTex, gender]);

  // 选中时轻微自发光提示(MeshToonMaterial 支持 emissive)
  useEffect(() => {
    instance.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mats = (obj as THREE.Mesh).material;
      for (const mat of Array.isArray(mats) ? mats : [mats]) {
        const toon = mat as THREE.MeshToonMaterial;
        if (toon.emissive) {
          toon.emissive.set(selected ? "#3aa89e" : "#000000");
          toon.emissiveIntensity = selected ? 0.3 : 0;
        }
      }
    });
  }, [instance, selected]);

  // 朝向校正放在外层(绕父级 Y 轴),不与实例内部的 Z-up 校正(rotation.x)相互干扰;
  // 实例已水平居中,绕原点旋转不影响站位与脚底对齐。
  // 款式按性别解析:男生遇裙装自动换穿替代礼服款(女裙男装)
  const style = resolveCostumeStyle(styleId, gender);
  return (
    <group rotation={[0, FACING_FIX_Y, 0]}>
      <primitive object={instance} />
      {style.modelUrl && style.fit ? (
        <GarmentOverlay
          url={style.modelUrl}
          fit={style.fit}
          heightM={heightM}
          colors={colors}
          onePiece={style.onePiece}
          split={style.split}
        />
      ) : null}
    </group>
  );
}

/**
 * 服装叠穿覆盖层:把款式服装模型(白衣)按穿着比例套在人物身上。
 * - 服装缩放到 heightM x fit.height,上沿对齐 heightM x fit.top(肩线)
 * - 白色布料按上/下装分区染色(与人物染色同一套色系)
 * - 人物模型完整保留,头手腿正常可见
 */
function GarmentOverlay({
  url,
  fit,
  heightM,
  colors,
  onePiece,
  split,
}: {
  url: string;
  fit: { height: number; top: number };
  heightM: number;
  colors: CostumeColors;
  onePiece: boolean;
  split: number;
}) {
  const { scene } = useGLTF(url);

  const garment = useMemo(() => {
    const cloned = scene.clone(true);

    // 姿态归一化(与人物同款逻辑):Z-up 模型立起来
    const rawBox = new THREE.Box3().setFromObject(cloned);
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);
    if (rawSize.z > rawSize.y * 1.5) {
      cloned.rotation.x = Math.PI / 2;
      cloned.updateMatrixWorld(true);
    }

    // 穿着定位:缩放到 身高 x fit.height,上沿对齐 身高 x fit.top
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const targetH = heightM * fit.height;
    const scale = size.y > 0.001 ? targetH / size.y : 1;
    cloned.scale.multiplyScalar(scale);
    const center = new THREE.Vector3();
    box.getCenter(center);
    cloned.position.x = -center.x * scale;
    cloned.position.z = -center.z * scale;
    cloned.position.y = heightM * fit.top - box.max.y * scale;

    // 白衣染色:连体款整身上装色;两截款按服装自身高度分上/下装色
    const gMinY = box.min.y;
    const gMaxY = box.max.y;
    const topTint = new THREE.Color(colors.top);
    const bottomTint = onePiece ? new THREE.Color(colors.top) : new THREE.Color(colors.bottom);
    const gradientMap = getToonGradientMap();
    cloned.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = true;
      const convert = (m: THREE.Material): THREE.MeshToonMaterial => {
        const src = m as THREE.MeshStandardMaterial;
        const mat = new THREE.MeshToonMaterial({
          color: src.color?.clone() ?? new THREE.Color("#ffffff"),
          map: src.map ?? null,
          gradientMap,
        });
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uTop = { value: topTint };
          shader.uniforms.uBottom = { value: bottomTint };
          shader.uniforms.uSplit = { value: onePiece ? 0 : split };
          shader.uniforms.uMinY = { value: gMinY };
          shader.uniforms.uMaxY = { value: gMaxY };
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              `#include <common>
varying float vGH;
uniform float uMinY;
uniform float uMaxY;`,
            )
            .replace(
              "#include <begin_vertex>",
              `#include <begin_vertex>
vGH = clamp((position.y - uMinY) / max(uMaxY - uMinY, 0.001), 0.0, 1.0);`,
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              `#include <common>
varying float vGH;
uniform vec3 uTop;
uniform vec3 uBottom;
uniform float uSplit;`,
            )
            .replace(
              "#include <map_fragment>",
              `#include <map_fragment>
{
  float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  float sat = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)) - min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
  float whiteMask = smoothstep(0.55, 0.75, lum) * (1.0 - smoothstep(0.08, 0.2, sat));
  vec3 zone = vGH < uSplit ? uBottom : uTop;
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * zone, whiteMask);
}`,
            );
        };
        mat.customProgramCacheKey = () =>
          `garment-${topTint.getHexString()}-${bottomTint.getHexString()}-${onePiece ? 0 : split}`;
        return mat;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convert) : convert(mesh.material);
    });
    return cloned;
  }, [scene, heightM, fit.height, fit.top, colors.top, colors.bottom, onePiece, split]);

  return <primitive object={garment} />;
}
