// StageOS domain constants and helpers
export const STAGEOS_VERSION = "stageos-v4.1-webhook-signature" as const;

export const SCHOOL_STAGES = [
  { value: "primary", label: "小学" },
  { value: "junior", label: "初中" },
  { value: "senior", label: "高中" },
] as const;

export const PROGRAM_TYPES = [
  { value: "chorus", label: "合唱" },
  { value: "mixed_chorus", label: "混声合唱" },
  { value: "recitation", label: "朗诵" },
  { value: "drama", label: "戏剧/话剧" },
  { value: "classical_dance", label: "古典舞" },
  { value: "folk_dance", label: "民族舞" },
  { value: "modern_jazz_street", label: "现代/爵士/街舞" },
  { value: "ballet", label: "芭蕾" },
  { value: "western_orchestra", label: "西洋管弦乐" },
  { value: "folk_orchestra", label: "民族管弦乐" },
  { value: "instrument", label: "器乐" },
  { value: "host", label: "主持" },
  { value: "etiquette_award", label: "礼仪/颁奖" },
  { value: "acrobatics_martial_arts", label: "杂技/武术" },
  { value: "cheerleading", label: "啦啦操" },
  { value: "sports_opening_ceremony", label: "运动会开幕式" },
  { value: "class_showcase", label: "班级展演" },
  { value: "new_year_gala", label: "新年晚会" },
  { value: "holiday_festival", label: "节庆/校园节" },
  { value: "reunion_gala", label: "校友/返校晚会" },
  { value: "non_competition_group_show", label: "非比赛集体展演" },
] as const;

export const REHEARSAL_FREQUENCIES = [2, 3, 5] as const;

export const PROJECT_STATUSES = [
  { value: "draft", label: "草稿", tone: "muted" },
  { value: "planning", label: "排产中", tone: "info" },
  { value: "needs_revision", label: "待修订", tone: "warning" },
  { value: "confirmed", label: "已确认", tone: "success" },
  { value: "exported", label: "已导出", tone: "primary" },
] as const;

export type ProjectStatus = typeof PROJECT_STATUSES[number]["value"];

export const CONFIRMATION_STATUSES = [
  { value: "draft", label: "草稿" },
  { value: "needs_revision", label: "待修订" },
  { value: "confirmed", label: "已确认" },
] as const;

// ---------------------------------------------------------------------------
// 模块注册表（状态制）
//
// 规则：未实现的能力一律标 planned，不得以任何形式显示为"已接入"；
// entries 指向真实实现位置（源码路径或应用内路由），不再展示虚构的 API 路由。
// ---------------------------------------------------------------------------

export type ModuleStatus = "implemented" | "partial" | "planned";

export const MODULE_STATUS_META: Record<
  ModuleStatus,
  { label: string; tone: "success" | "warning" | "muted" }
> = {
  implemented: { label: "已实现", tone: "success" },
  partial: { label: "部分实现", tone: "warning" },
  planned: { label: "规划中", tone: "muted" },
};

export type StageOSModule = {
  group: string;
  status: ModuleStatus;
  desc: string;
  /** 真实实现位置：源码路径或应用内路由 */
  entries: string[];
};

export const STAGEOS_MODULES: StageOSModule[] = [
  {
    group: "方案引擎 Plan Engine",
    status: "implemented",
    desc: "本地确定性规则引擎：输入校验 → 知识检索 → 约束应用 → 配色 → 服装 → 队形 → 舞台 → 倒排 → 来源标记。离线可用、无需 Token。",
    entries: ["src/features/plan-engine/", "src/domain/stageos/"],
  },
  {
    group: "知识库 Knowledge Base",
    status: "implemented",
    desc: "舞台知识、约束规则与 853 色配色库，前后端共用同一份事实来源。",
    entries: [
      "supabase/functions/_shared/stage-knowledge.ts",
      "supabase/functions/_shared/stage-constraints.ts",
      "supabase/functions/_shared/palette-library.ts",
    ],
  },
  {
    group: "2.5D 舞台预览与队形编排",
    status: "partial",
    desc: "PixiJS/WebGL 中央渲染（非 SVG、非 Three.js）。Phase A 已可用：正面透视、台阶、36 人拖拽、9 种队形模板、关键帧、PNG 导出。框选/对齐均分在 Phase B。",
    entries: ["src/features/stage-2.5d/", "/projects/:id/preview-25d"],
  },
  {
    group: "配色与服装总表",
    status: "partial",
    desc: "本地规则生成已可用并带来源标记；AI 增强生成预留接口，失败自动回退本地规则并标记。",
    entries: [
      "src/features/plan-engine/resolve-palette.ts",
      "src/features/plan-engine/resolve-costume.ts",
    ],
  },
  {
    group: "3D 验证视图",
    status: "partial",
    desc: "React Three Fiber 队形 3D 视图已存在；待接入共享编辑器 store，与 2.5D 共用同一 x/z/riserLevel 米制坐标。",
    entries: ["/formation-3d", "src/pages/Formation3D.tsx"],
  },
  {
    group: "导出中心",
    status: "partial",
    desc: "2.5D 高清 PNG 导出已实现（RenderTexture / extract）；PDF 与导出任务队列（export_jobs）规划中。",
    entries: ["/exports", "src/features/stage-2.5d/export/export-png.ts"],
  },
  {
    group: "AI 增强生成",
    status: "planned",
    desc: "AI 生成入口预留（VITE_ENABLE_AI），未启用或失败时回退本地规则，界面明确标记来源。",
    entries: ["src/domain/stageos/provenance.ts"],
  },
  {
    group: "图片 / 视频渲染",
    status: "planned",
    desc: "定妆照与 15s 预览视频渲染，待真实渲染管线接入后开放。",
    entries: [],
  },
  {
    group: "服装商务建议",
    status: "planned",
    desc: "采购建议、参考图与平台搜索，仅提供建议且需人工核验。",
    entries: [],
  },
];

export type StageInputData = {
  schoolStage?: string;
  programType?: string;
  programTheme?: string;
  venueType?: string;
  performerCount?: number;
  maleCount?: number;
  femaleCount?: number;
  perPersonBudget?: number;
  screenThemeColor?: string;
  lightingStyle?: string;
  specialExpectation?: string;
  performanceDate?: string;
  rehearsalFrequencyPerWeek?: 2 | 3 | 5;
  students?: Array<{
    studentId: string;
    gender: "male" | "female";
    heightCm: number;
    roleLabel?: string;
  }>;
  confirmedFormation?: {
    summary?: string;
    rows?: number;
    layoutName?: string;
    spacingRule?: string;
  };
};

export type CostumePlanPayload = {
  femalePlan: PlanItem[];
  malePlan: PlanItem[];
  accessories: PlanItem[];
  totalEstimate: number;
  sizingReminders: string[];
  purchaseStrategy: string[];
  planB: string[];
};

export type PlanItem = {
  category: string;
  description: string;
  qty: number;
  unitEstimate: number;
  subtotal: number;
  sizing?: string;
};

export type Risk = { level: "low" | "medium" | "high"; title: string; detail: string };
export type ScheduleItem = { daysBefore: number; task: string; owner: string };
export type PlatformSearchItem = { platform: string; query: string; url: string; note: string };

export function validateStageInputDetailed(data: StageInputData): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { performerCount, maleCount, femaleCount, perPersonBudget, students, rehearsalFrequencyPerWeek } = data;

  const isNonNegInt = (n: unknown): n is number =>
    typeof n === "number" && Number.isFinite(n) && Number.isInteger(n) && n >= 0;

  if (performerCount !== undefined) {
    if (!isNonNegInt(performerCount) || performerCount <= 0) {
      errors.push(`总人数 performerCount 必须为正整数,当前:${performerCount}`);
    }
  }
  if (maleCount !== undefined && !isNonNegInt(maleCount)) {
    errors.push(`男生数 maleCount 必须为非负整数,当前:${maleCount}`);
  }
  if (femaleCount !== undefined && !isNonNegInt(femaleCount)) {
    errors.push(`女生数 femaleCount 必须为非负整数,当前:${femaleCount}`);
  }
  if (typeof perPersonBudget === "number" && (!Number.isFinite(perPersonBudget) || perPersonBudget < 0)) {
    errors.push(`人均预算必须为非负数,当前:${perPersonBudget}`);
  }
  if (rehearsalFrequencyPerWeek !== undefined && ![2, 3, 5].includes(rehearsalFrequencyPerWeek as number)) {
    errors.push(`彩排频次必须为 2 / 3 / 5,当前:${rehearsalFrequencyPerWeek}`);
  }

  if (typeof performerCount === "number" && typeof maleCount === "number" && typeof femaleCount === "number") {
    if (maleCount + femaleCount !== performerCount) {
      errors.push(
        `人数校验:男(${maleCount}) + 女(${femaleCount}) = ${maleCount + femaleCount},与总人数 ${performerCount} 不一致。`,
      );
    }
  } else if (typeof performerCount === "number" && (typeof maleCount === "number") !== (typeof femaleCount === "number")) {
    warnings.push("男生数与女生数需成对填写,否则无法校验总人数一致性。");
  }

  if (typeof performerCount === "number" && students && students.length > 0 && students.length !== performerCount) {
    warnings.push(`学生行数(${students.length})与总人数(${performerCount})不一致。`);
  }

  if (students && students.length > 0) {
    const ids = new Set<string>();
    students.forEach((s, i) => {
      if (!s.studentId?.trim()) errors.push(`第 ${i + 1} 行 studentId 必填。`);
      else if (ids.has(s.studentId)) errors.push(`studentId 重复:${s.studentId}`);
      else ids.add(s.studentId);
      if (!Number.isFinite(s.heightCm) || s.heightCm <= 0) {
        errors.push(`第 ${i + 1} 行 heightCm 需为正数。`);
      }
    });
    if (typeof maleCount === "number" && typeof femaleCount === "number") {
      const m = students.filter((s) => s.gender === "male").length;
      const f = students.filter((s) => s.gender === "female").length;
      if (students.length === (performerCount ?? students.length) && (m !== maleCount || f !== femaleCount)) {
        warnings.push(`学生性别分布(男${m}/女${f})与 maleCount/femaleCount(${maleCount}/${femaleCount})不一致。`);
      }
    }
  }

  return { errors, warnings };
}

export function validateStageInput(data: StageInputData): string[] {
  const { errors, warnings } = validateStageInputDetailed(data);
  return [...errors, ...warnings];
}

export type ValidationSnapshot = {
  checkedAt: string;
  errors: string[];
  warnings: string[];
};

const VALIDATION_HISTORY_LIMIT = 20;

/**
 * Append a validation snapshot to the persisted stage input.
 * Deduplicates against the last entry when errors/warnings are identical
 * (only updates checkedAt would spam the history), and caps the history size.
 */
export function appendValidationHistory(
  prevData: (StageInputData & { __validation?: ValidationSnapshot; __validationHistory?: ValidationSnapshot[] }) | undefined | null,
  snapshot: ValidationSnapshot,
): StageInputData & { __validation: ValidationSnapshot; __validationHistory: ValidationSnapshot[] } {
  const base = (prevData ?? {}) as StageInputData & { __validation?: ValidationSnapshot; __validationHistory?: ValidationSnapshot[] };
  const prevHistory = Array.isArray(base.__validationHistory) ? base.__validationHistory : [];
  const last = prevHistory[prevHistory.length - 1];
  const sameAsLast =
    last &&
    JSON.stringify(last.errors) === JSON.stringify(snapshot.errors) &&
    JSON.stringify(last.warnings) === JSON.stringify(snapshot.warnings);
  const nextHistory = sameAsLast
    ? [...prevHistory.slice(0, -1), snapshot]
    : [...prevHistory, snapshot];
  const trimmed = nextHistory.slice(-VALIDATION_HISTORY_LIMIT);
  return { ...base, __validation: snapshot, __validationHistory: trimmed };
}
