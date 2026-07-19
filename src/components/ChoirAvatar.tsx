import { useLayoutEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * 合唱团小人:加载按部位分块命名的模型(hunyuan_split.glb),
 * 按网格名精准注入色号 —— UI 面板选什么色,衣服就是什么色。
 *
 * 模型要求:在 Three.js Editor 等工具里把网格命名为含
 * Shirt/body_upper(上衣)、Pants/Skirt/body_lower(下装)、
 * Skin/arm/leg(皮肤)的名称后导出 .glb 放到 public/models/。
 */
export default function ChoirAvatar({
  shirtColor = "#3A9E9A", // 高级青绿(上衣)
  pantsColor = "#EAB308", // 高级赭石(下装)
  skinColor = "#FADBB4", // 统一质感肤色
  url = "/models/hunyuan_split.glb",
}: {
  shirtColor?: string;
  pantsColor?: string;
  skinColor?: string;
  url?: string;
}) {
  // 1. 加载分块模型
  const { scene } = useGLTF(url);

  // 2. 深度克隆:舞台放 36 个小人时每个都能独立换色,互不干扰
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    clonedScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const src = mesh.material as THREE.MeshStandardMaterial;

      // 3. 按网格名精准捕捉"独立块块",决定注入哪个色号
      const name = mesh.name.toLowerCase();
      let color: string | null = null;
      if (name.includes("shirt") || name.includes("body_upper")) {
        color = shirtColor;
      } else if (name.includes("pants") || name.includes("skirt") || name.includes("body_lower")) {
        color = pantsColor;
      } else if (name.includes("skin") || name.includes("arm") || name.includes("leg") || name.includes("head")) {
        color = skinColor;
      }

      // 4. 升级为干净的卡通赛璐璐材质;关闭 toneMapping 防止色号被压灰
      //    (保留原贴图,未命中命名规则的部位维持原色)
      const mat = new THREE.MeshToonMaterial({
        color: color ? new THREE.Color(color) : (src.color?.clone() ?? new THREE.Color("#ffffff")),
        map: color ? null : (src.map ?? null),
      });
      mat.toneMapped = false;
      mesh.material = mat;

      // 5. 开启舞台光影投射
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  }, [clonedScene, shirtColor, pantsColor, skinColor]);

  return <primitive object={clonedScene} />;
}
