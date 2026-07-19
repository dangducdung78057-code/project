/**
 * StageOS 统一领域模型(单一数据契约)。
 * 写库、2.5D、3D、导出共用同一套类型;运行时校验见 schemas.ts(Zod)。
 * 坐标约定:舞台米制坐标,x 为横向(左负右正,面向观众视角),z 为纵深
 * (负 = 舞台深处 / 上场口方向,正 = 朝观众 / 台口方向),不保存 Canvas 像素。
 */

/** 舞台米制坐标。riserLevel 为台阶层号(0 = 舞台地面)。 */
export type StagePosition = {
  x: number;
  z: number;
  riserLevel?: number;
};

export type PerformerGender = "male" | "female" | "unknown";

/** 匿名表演者:编号/身高/角色可用于标注,不保存真实姓名与人脸信息。 */
export type Performer = {
  id: string;
  /** 匿名编号,如 S001。 */
  anonId: string;
  gender: PerformerGender;
  heightCm: number;
  roleLabel?: string;
  groupId?: string;
  position: StagePosition;
  appearanceId: string;
};

export type PerformerGroup = {
  id: string;
  name: string;
  color?: string;
  performerIds: string[];
  locked?: boolean;
};

/** 关键帧:某个时间点的完整位置快照(开场/段落/高潮/结尾)。 */
export type FormationKeyframe = {
  id: string;
  name: string;
  timeSec: number;
  performerPositions: Record<string, StagePosition>;
};

/** 一套服装在某表演者身上的应用状态。 */
export type AppearanceState = {
  outfitId: string;
  colors: {
    top: string;
    bottom: string;
    footwear: string;
    accent: string;
  };
  accessories: string[];
};

/** 外观应用范围。 */
export type ApplyScope = "performer" | "group" | "all";

/**
 * 服装显式 Manifest:不再通过材质/文件名猜测业务归属。
 * 真实服装 GLB 到位前,modelUrl 可指向同骨骼模块化占位资产。
 */
export type OutfitManifest = {
  id: string;
  name: string;
  gender: "male" | "female" | "unisex";
  ageSegments: string[];
  programTypes: string[];
  modelUrl: string;
  slots: {
    skin: string[];
    hair: string[];
    top: string[];
    bottom: string[];
    footwear: string[];
    accent: string[];
    accessories: string[];
  };
  vertexBudget: number;
  materialSlots: string[];
  source?: SourceProvenance;
};

/** 配色预设(主/辅/点缀 + 精确 HEX)。 */
export type PalettePreset = {
  id: string;
  name: string;
  primary: string;
  primaryHex: string;
  secondary: string;
  secondaryHex: string;
  accent: string;
  accentHex: string;
  note?: string;
};

/** 舞台几何与硬件约束。 */
export type StageGeometrySpec = {
  /** 台口宽度(米)。 */
  width: number;
  /** 舞台深度(米)。 */
  depth: number;
  /** 合唱台阶层数(0 = 无台阶)。 */
  riserCount: number;
  /** 台阶单层深度(米)。 */
  riserDepth: number;
  /** 台阶单层高度(米)。 */
  riserHeight: number;
};

/** 约束检查结果:硬禁止不进入最终推荐;软警告给出原因与替代建议。 */
export type ConstraintResult = {
  ruleId: string;
  level: "hard" | "soft" | "info";
  scope: "costume" | "formation" | "stage" | "palette" | "schedule" | "procurement";
  reason: string;
  alternative?: string;
};

/** 诊断级别(遮挡/安全分析)。 */
export type DiagnosticLevel = "green" | "warning" | "error";

export type StageDiagnostic = {
  id: string;
  kind: "occlusion" | "safety" | "path";
  level: DiagnosticLevel;
  message: string;
  performerIds?: string[];
};

/** 生成来源标识:每个生成结果必须携带,界面必须明确展示。 */
export type SourceProvenance = {
  engine: "local-rules" | "ai-assisted";
  generatedAt: string;
  knowledgeVersion: string;
  constraintVersion: string;
  paletteVersion: string;
  sources: Array<{ kind: string; ref: string; note?: string }>;
  warnings: ConstraintResult[];
};

/** 2.5D/3D 共享编辑器快照(序列化进 stage_inputs.data.__stageEditor)。 */
export type StageEditorSnapshot = {
  schemaVersion: string;
  stage: StageGeometrySpec;
  spacing: number;
  performers: Performer[];
  groups: PerformerGroup[];
  keyframes: FormationKeyframe[];
  activeKeyframeId: string | null;
  appearance: Record<string, AppearanceState>;
  palette: PalettePreset | null;
  savedAt: string;
};
