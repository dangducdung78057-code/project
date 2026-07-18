import { create } from "zustand";
import type { StageInputData } from "@/lib/stageos";
import {
  DEFAULT_KEYFRAMES,
  DEFAULT_SPACING,
  DEFAULT_STAGE,
  STAGEOS_SCHEMA_VERSION,
  computeTemplatePositions,
  type AppearanceState,
  type FormationKeyframe,
  type PalettePreset,
  type Performer,
  type PerformerGroup,
  type StageEditorSnapshot,
  type StageGeometrySpec,
  type StagePosition,
} from "@/domain/stageos";

type PositionsMap = Record<string, StagePosition>;

export type LabelSwitches = { id: boolean; height: boolean; risk: boolean };

export type StageEditorState = {
  projectId: string | null;
  stage: StageGeometrySpec;
  spacing: number;
  performers: Performer[];
  groups: PerformerGroup[];
  keyframes: FormationKeyframe[];
  activeKeyframeId: string | null;
  appearance: Record<string, AppearanceState>;
  palette: PalettePreset | null;
  selectedIds: string[];
  labels: LabelSwitches;
  dirty: boolean;
  lastSavedAt: string | null;
  past: PositionsMap[];
  future: PositionsMap[];

  initFromStageInput: (projectId: string, input: StageInputData, restored?: StageEditorSnapshot | null) => void;
  setPosition: (id: string, pos: StagePosition, opts?: { commit?: boolean }) => void;
  applyTemplate: (templateName: string) => boolean;
  select: (ids: string[], additive?: boolean) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setLabels: (patch: Partial<LabelSwitches>) => void;
  setRiserCount: (count: number) => void;
  setPalette: (palette: PalettePreset | null) => void;
  recordKeyframe: (keyframeId: string) => void;
  activateKeyframe: (keyframeId: string) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  serialize: () => StageEditorSnapshot;
};

function snapshotPositions(performers: Performer[]): PositionsMap {
  const map: PositionsMap = {};
  for (const p of performers) map[p.id] = { ...p.position };
  return map;
}

/** 按学段给匿名人物一个合理默认身高(学生名单未提供身高时兜底)。 */
function defaultHeightCm(schoolStage: string | undefined, gender: "male" | "female"): number {
  if (schoolStage === "primary") return 136;
  if (schoolStage === "senior") return gender === "male" ? 172 : 162;
  return gender === "male" ? 165 : 158; // 初中/未填写默认
}

type RawStudent = { studentId?: string; gender?: string; heightCm?: number };

function extractStudents(input: StageInputData): RawStudent[] {
  const raw = (input as unknown as { students?: unknown }).students;
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is RawStudent => typeof s === "object" && s !== null);
}

/** 由演出资料生成初始表演者集合(匿名编号,不含真实姓名)。 */
export function buildInitialPerformers(input: StageInputData, spacing = DEFAULT_SPACING): Performer[] {
  const students = extractStudents(input);
  const total = students.length > 0 ? students.length : (input.maleCount ?? 0) + (input.femaleCount ?? 0);
  if (total <= 0) return [];

  const grid = computeTemplatePositions("标准方阵式", total, spacing, DEFAULT_STAGE)
    ?? Array.from({ length: total }, (_, i) => ({ x: (i % 8) * spacing - 2.8, z: Math.floor(i / 8) * spacing - 1 }));

  const performers: Performer[] = [];
  for (let i = 0; i < total; i++) {
    const stu = students[i];
    const gender: Performer["gender"] =
      stu?.gender === "male" || stu?.gender === "female"
        ? stu.gender
        : i < (input.maleCount ?? 0)
          ? "male"
          : "female";
    performers.push({
      id: `pf-${i + 1}`,
      anonId: `S${String(i + 1).padStart(3, "0")}`,
      gender,
      heightCm: stu?.heightCm ?? defaultHeightCm(input.schoolStage, gender === "male" ? "male" : "female"),
      groupId: gender === "male" ? "grp-male" : "grp-female",
      position: grid[i] ?? { x: 0, z: 0 },
      appearanceId: "basic-white",
    });
  }
  return performers;
}

const DEFAULT_GROUPS: PerformerGroup[] = [
  { id: "grp-male", name: "男生组", color: "#4F7CBF", performerIds: [] },
  { id: "grp-female", name: "女生组", color: "#C06C9E", performerIds: [] },
];

export const useStageEditorStore = create<StageEditorState>()((set, get) => ({
  projectId: null,
  stage: { ...DEFAULT_STAGE },
  spacing: DEFAULT_SPACING,
  performers: [],
  groups: DEFAULT_GROUPS.map((g) => ({ ...g })),
  keyframes: [],
  activeKeyframeId: null,
  appearance: {},
  palette: null,
  selectedIds: [],
  labels: { id: true, height: false, risk: true },
  dirty: false,
  lastSavedAt: null,
  past: [],
  future: [],

  initFromStageInput: (projectId, input, restored) => {
    if (restored && restored.schemaVersion === STAGEOS_SCHEMA_VERSION) {
      set({
        projectId,
        stage: { ...restored.stage },
        spacing: restored.spacing,
        performers: restored.performers.map((p) => ({ ...p, position: { ...p.position } })),
        groups: restored.groups.map((g) => ({ ...g, performerIds: [...g.performerIds] })),
        keyframes: restored.keyframes.map((k) => ({ ...k, performerPositions: { ...k.performerPositions } })),
        activeKeyframeId: restored.activeKeyframeId,
        appearance: { ...restored.appearance },
        palette: restored.palette,
        selectedIds: [],
        past: [],
        future: [],
        dirty: false,
        lastSavedAt: restored.savedAt,
      });
      return;
    }
    const performers = buildInitialPerformers(input);
    const groups = DEFAULT_GROUPS.map((g) => ({
      ...g,
      performerIds: performers.filter((p) => p.groupId === g.id).map((p) => p.id),
    })).filter((g) => g.performerIds.length > 0);
    const positions = snapshotPositions(performers);
    const keyframes: FormationKeyframe[] = DEFAULT_KEYFRAMES.map((k) => ({
      ...k,
      performerPositions: { ...positions },
    }));
    set({
      projectId,
      stage: { ...DEFAULT_STAGE },
      spacing: DEFAULT_SPACING,
      performers,
      groups,
      keyframes,
      activeKeyframeId: keyframes[0]?.id ?? null,
      appearance: {},
      palette: null,
      selectedIds: [],
      past: [],
      future: [],
      dirty: false,
      lastSavedAt: null,
    });
  },

  setPosition: (id, pos, opts) => {
    const state = get();
    const commit = opts?.commit ?? true;
    const performers = state.performers.map((p) => (p.id === id ? { ...p, position: { ...pos } } : p));
    if (commit) {
      set({
        performers,
        past: [...state.past.slice(-49), snapshotPositions(state.performers)],
        future: [],
        dirty: true,
      });
    } else {
      set({ performers, dirty: true });
    }
  },

  applyTemplate: (templateName) => {
    const state = get();
    const positions = computeTemplatePositions(templateName, state.performers.length, state.spacing, state.stage);
    if (!positions) return false;
    const performers = state.performers.map((p, i) => ({ ...p, position: positions[i] ?? p.position }));
    set({
      performers,
      past: [...state.past.slice(-49), snapshotPositions(state.performers)],
      future: [],
      dirty: true,
    });
    return true;
  },

  select: (ids, additive) => {
    const state = get();
    set({ selectedIds: additive ? Array.from(new Set([...state.selectedIds, ...ids])) : ids });
  },

  toggleSelect: (id) => {
    const state = get();
    set({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((s) => s !== id)
        : [...state.selectedIds, id],
    });
  },

  clearSelection: () => set({ selectedIds: [] }),

  setLabels: (patch) => set((s) => ({ labels: { ...s.labels, ...patch } })),

  setRiserCount: (count) => set((s) => ({ stage: { ...s.stage, riserCount: count }, dirty: true })),

  setPalette: (palette) => set({ palette, dirty: true }),

  recordKeyframe: (keyframeId) => {
    const state = get();
    const positions = snapshotPositions(state.performers);
    set({
      keyframes: state.keyframes.map((k) =>
        k.id === keyframeId ? { ...k, performerPositions: positions } : k,
      ),
      dirty: true,
    });
  },

  activateKeyframe: (keyframeId) => {
    const state = get();
    const kf = state.keyframes.find((k) => k.id === keyframeId);
    if (!kf) return;
    const performers = state.performers.map((p) => ({
      ...p,
      position: kf.performerPositions[p.id] ? { ...kf.performerPositions[p.id] } : p.position,
    }));
    set({
      performers,
      activeKeyframeId: keyframeId,
      past: [...state.past.slice(-49), snapshotPositions(state.performers)],
      future: [],
      dirty: true,
    });
  },

  undo: () => {
    const state = get();
    const prev = state.past[state.past.length - 1];
    if (!prev) return;
    const current = snapshotPositions(state.performers);
    const performers = state.performers.map((p) => ({ ...p, position: prev[p.id] ? { ...prev[p.id] } : p.position }));
    set({
      performers,
      past: state.past.slice(0, -1),
      future: [current, ...state.future].slice(0, 50),
      dirty: true,
    });
  },

  redo: () => {
    const state = get();
    const next = state.future[0];
    if (!next) return;
    const current = snapshotPositions(state.performers);
    const performers = state.performers.map((p) => ({ ...p, position: next[p.id] ? { ...next[p.id] } : p.position }));
    set({
      performers,
      past: [...state.past.slice(-49), current],
      future: state.future.slice(1),
      dirty: true,
    });
  },

  markSaved: () => set({ dirty: false, lastSavedAt: new Date().toISOString() }),

  serialize: () => {
    const state = get();
    return {
      schemaVersion: STAGEOS_SCHEMA_VERSION,
      stage: { ...state.stage },
      spacing: state.spacing,
      performers: state.performers.map((p) => ({ ...p, position: { ...p.position } })),
      groups: state.groups.map((g) => ({ ...g, performerIds: [...g.performerIds] })),
      keyframes: state.keyframes.map((k) => ({ ...k, performerPositions: { ...k.performerPositions } })),
      activeKeyframeId: state.activeKeyframeId,
      appearance: { ...state.appearance },
      palette: state.palette,
      savedAt: new Date().toISOString(),
    };
  },
}));

/** 从 stage_inputs.data 中取出编辑器快照(不存在则返回 null)。 */
export function extractEditorSnapshot(data: unknown): StageEditorSnapshot | null {
  if (typeof data !== "object" || data === null) return null;
  const raw = (data as Record<string, unknown>).__stageEditor;
  if (typeof raw !== "object" || raw === null) return null;
  const snap = raw as StageEditorSnapshot;
  if (snap.schemaVersion !== STAGEOS_SCHEMA_VERSION || !Array.isArray(snap.performers)) return null;
  return snap;
}
