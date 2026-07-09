// 块一:前端 3D 一键换装与改色系统 (3D Avatar Configurator)
// 核心技术:参数化材质替换 (Color ID Mapping)。
// 不实时生成 3D 几何体,而是通过 GLSL 着色器动态读取服装模型上的
// ID 蒙版(RGB 通道),在浏览器端实现毫秒级颜色替换,100% 不穿模。
//
// 通道约定:
//   R 通道 = 部位 1(如:衬衫/上衣)
//   G 通道 = 部位 2(如:百褶裙/下装)
//   B 通道 = 部位 3(如:领结/点缀)
//   无通道覆盖区域 = 保留底图原色(皮肤/头发)
//
// 该类为独立引擎(自建 renderer/scene/camera),供网页端/小程序 WebView
// 嵌入使用;主编辑器的 R3F 管线在 StudentGlbModel 中复用同一套
// Color ID 片元逻辑(见 buildIdMapFragment)。
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/** ID 蒙版换色片元逻辑(与 StudentGlbModel 的 onBeforeCompile 注入共用) */
export const ID_MAP_FRAGMENT = /* glsl */ `
  vec4 idMap = texture2D(uIdMapTex, vMapUv);
  float mask1 = idMap.r;
  float mask2 = idMap.g;
  float mask3 = idMap.b;
  float baseMask = max(0.0, 1.0 - (mask1 + mask2 + mask3));
  // 正片叠底:染色乘在底图上,保留白模的光影褶皱
  vec3 zoneTint = mask1 * uColorPart1 + mask2 * uColorPart2 + mask3 * uColorPart3 + baseMask * vec3(1.0);
  diffuseColor.rgb *= zoneTint;
`;

export class ClothingRenderEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clothingMaterial: THREE.ShaderMaterial | null = null;
  private rafId = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;

  constructor(canvasContainer: HTMLElement) {
    this.container = canvasContainer;
    this.scene = new THREE.Scene();

    // 相机:3/4 视角对准人物躯干
    this.camera = new THREE.PerspectiveCamera(
      40,
      Math.max(canvasContainer.clientWidth, 1) / Math.max(canvasContainer.clientHeight, 1),
      0.1,
      50,
    );
    this.camera.position.set(1.4, 1.3, 2.2);
    this.camera.lookAt(0, 0.85, 0);

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasContainer.appendChild(this.renderer.domElement);

    // 舞台灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(ambientLight, directionalLight);

    // 容器尺寸自适应
    this.resizeObserver = new ResizeObserver(() => {
      const w = Math.max(this.container.clientWidth, 1);
      const h = Math.max(this.container.clientHeight, 1);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
    this.resizeObserver.observe(canvasContainer);

    this.animate();
  }

  /** 生成基于 Color ID 的智能材质球 */
  buildSmartMaterial(baseTexture: THREE.Texture, idMapTexture: THREE.Texture): THREE.ShaderMaterial {
    const vertexShader = /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // 片元着色器:解析 R/G/B 通道作为遮罩,应用用户自定义颜色
    const fragmentShader = /* glsl */ `
      uniform sampler2D uBaseTex;
      uniform sampler2D uIdMapTex;
      uniform vec3 colorPart1; // 红通道区域(如:衬衫)
      uniform vec3 colorPart2; // 绿通道区域(如:百褶裙)
      uniform vec3 colorPart3; // 蓝通道区域(如:领结)
      varying vec2 vUv;

      void main() {
        vec4 base = texture2D(uBaseTex, vUv);
        vec4 idMap = texture2D(uIdMapTex, vUv);

        float mask1 = idMap.r;
        float mask2 = idMap.g;
        float mask3 = idMap.b;
        float baseMask = max(0.0, 1.0 - (mask1 + mask2 + mask3));

        // 混合逻辑:各通道颜色加权 + 底色区域保持白(=不染色)
        vec3 zoneTint = (mask1 * colorPart1) +
                        (mask2 * colorPart2) +
                        (mask3 * colorPart3) +
                        (baseMask * vec3(1.0));

        // 正片叠底:保留白模的光影褶皱
        gl_FragColor = vec4(zoneTint * base.rgb, base.a);
      }
    `;

    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uBaseTex: { value: baseTexture },
        uIdMapTex: { value: idMapTexture },
        colorPart1: { value: new THREE.Color("#ffffff") },
        colorPart2: { value: new THREE.Color("#ffffff") },
        colorPart3: { value: new THREE.Color("#ffffff") },
      },
    });
  }

  /** 加载服装资产并应用材质 */
  async loadGarmentAsset(modelUrl: string, baseUrl: string, idMapUrl: string): Promise<void> {
    const texLoader = new THREE.TextureLoader();
    const [baseTex, idMapTex] = await Promise.all([texLoader.loadAsync(baseUrl), texLoader.loadAsync(idMapUrl)]);
    baseTex.flipY = false;
    idMapTex.flipY = false;
    baseTex.colorSpace = THREE.SRGBColorSpace;
    // ID 蒙版是数据贴图,禁用色彩空间转换,保证通道值精确
    idMapTex.colorSpace = THREE.NoColorSpace;

    this.clothingMaterial = this.buildSmartMaterial(baseTex, idMapTex);

    const gltf = await new GLTFLoader().loadAsync(modelUrl);
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = this.clothingMaterial!;
    });
    this.scene.add(gltf.scene);
  }

  /**
   * 暴露给前端 UI 的变色 API
   * @param partIndex 1(R 通道) / 2(G 通道) / 3(B 通道)
   * @param hexColor 十六进制颜色,如 '#ff0000'
   */
  updateColor(partIndex: 1 | 2 | 3, hexColor: string): void {
    if (!this.clothingMaterial) return;
    (this.clothingMaterial.uniforms[`colorPart${partIndex}`].value as THREE.Color).set(hexColor);
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
  };

  /** 销毁引擎,释放 WebGL 资源 */
  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
