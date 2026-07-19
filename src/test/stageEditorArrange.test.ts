import { beforeEach, describe, expect, it } from "vitest";
import { useStageEditorStore } from "@/stores/stage-editor-store";
import type { StageInputData } from "@/lib/stageos";

const input = {
  programType: "chorus",
  performerCount: 12,
  maleCount: 6,
  femaleCount: 6,
} as StageInputData;

function reset() {
  useStageEditorStore.getState().initFromStageInput("proj-arrange", input, null);
}

describe("2.5D Phase B 编排(对齐/均分/多选拖动)", () => {
  beforeEach(reset);

  it("左对齐:选中者 x 统一到最小 x", () => {
    const st = useStageEditorStore.getState();
    const ids = st.performers.slice(0, 4).map((p) => p.id);
    st.select(ids);
    useStageEditorStore.getState().alignSelection("left");
    const after = useStageEditorStore.getState().performers.filter((p) => ids.includes(p.id));
    const xs = new Set(after.map((p) => p.position.x));
    expect(xs.size).toBe(1);
  });

  it("水平居中对齐:x 统一到均值", () => {
    const st = useStageEditorStore.getState();
    const picked = st.performers.slice(0, 3);
    const mean = picked.reduce((a, p) => a + p.position.x, 0) / picked.length;
    st.select(picked.map((p) => p.id));
    useStageEditorStore.getState().alignSelection("centerX");
    const after = useStageEditorStore.getState().performers.filter((p) => picked.some((q) => q.id === p.id));
    after.forEach((p) => expect(p.position.x).toBeCloseTo(mean, 5));
  });

  it("横向等距:首尾不动,中间均匀分布", () => {
    const st = useStageEditorStore.getState();
    const picked = st.performers.slice(0, 5);
    st.select(picked.map((p) => p.id));
    const xs = picked.map((p) => p.position.x).sort((a, b) => a - b);
    useStageEditorStore.getState().distributeSelection("x");
    const after = useStageEditorStore.getState().performers
      .filter((p) => picked.some((q) => q.id === p.id))
      .map((p) => p.position.x)
      .sort((a, b) => a - b);
    expect(after[0]).toBeCloseTo(xs[0], 5);
    expect(after[after.length - 1]).toBeCloseTo(xs[xs.length - 1], 5);
    const step = after[1] - after[0];
    for (let i = 2; i < after.length; i++) expect(after[i] - after[i - 1]).toBeCloseTo(step, 5);
  });

  it("多选拖动手势:begin/endTransform 只产生一条历史,undo 一次回到手势前", () => {
    const st = useStageEditorStore.getState();
    const ids = st.performers.slice(0, 3).map((p) => p.id);
    st.select(ids);
    const before = new Map(useStageEditorStore.getState().performers.map((p) => [p.id, { ...p.position }]));
    useStageEditorStore.getState().beginTransform();
    useStageEditorStore.getState().moveSelectionBy(1, 0.5);
    // 同一手势内第二次移动:以手势起点为基准,不累计位移
    useStageEditorStore.getState().moveSelectionBy(1, 0.5);
    useStageEditorStore.getState().endTransform();
    let after = useStageEditorStore.getState().performers.filter((p) => ids.includes(p.id));
    after.forEach((p) => {
      expect(p.position.x).toBeCloseTo((before.get(p.id)?.x ?? 0) + 1, 5);
      expect(p.position.z).toBeCloseTo((before.get(p.id)?.z ?? 0) + 0.5, 5);
    });
    useStageEditorStore.getState().undo();
    after = useStageEditorStore.getState().performers.filter((p) => ids.includes(p.id));
    after.forEach((p) => {
      expect(p.position.x).toBeCloseTo(before.get(p.id)?.x ?? 0, 5);
      expect(p.position.z).toBeCloseTo(before.get(p.id)?.z ?? 0, 5);
    });
  });

  it("选中不足 2 人时对齐不生效", () => {
    const st = useStageEditorStore.getState();
    const before = JSON.stringify(st.performers.map((p) => p.position));
    st.select([st.performers[0].id]);
    useStageEditorStore.getState().alignSelection("left");
    expect(JSON.stringify(useStageEditorStore.getState().performers.map((p) => p.position))).toBe(before);
  });

  it("选中不足 3 人时等距不生效", () => {
    const st = useStageEditorStore.getState();
    const before = JSON.stringify(st.performers.map((p) => p.position));
    st.select(st.performers.slice(0, 2).map((p) => p.id));
    useStageEditorStore.getState().distributeSelection("x");
    expect(JSON.stringify(useStageEditorStore.getState().performers.map((p) => p.position))).toBe(before);
  });
});
