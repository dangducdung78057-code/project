import { beforeEach, describe, expect, it } from "vitest";
import type { StageInputData } from "@/lib/stageos";
import { buildInitialPerformers, extractEditorSnapshot, useStageEditorStore } from "@/stores/stage-editor-store";

const input: StageInputData = {
  programType: "chorus",
  activityType: "合唱",
  ageRange: "初中",
  maleCount: 18,
  femaleCount: 18,
  venueType: "音乐厅",
  movementIntensity: "低",
  styleDirection: "经典",
  themeLabel: "",
  specialNotes: "",
} as StageInputData;

describe("stage-editor-store(2.5D/3D 共享状态)", () => {
  beforeEach(() => {
    useStageEditorStore.getState().initFromStageInput("proj-test", input, null);
  });

  it("按男女数量生成匿名表演者", () => {
    const st = useStageEditorStore.getState();
    expect(st.performers.length).toBe(36);
    expect(st.performers.filter((p) => p.gender === "male").length).toBe(18);
    expect(st.performers[0].anonId).toBe("S001");
    // 不包含真实姓名字段
    expect(JSON.stringify(st.performers)).not.toMatch(/name/i);
  });

  it("buildInitialPerformers 生成默认关键帧坐标", () => {
    const performers = buildInitialPerformers(input);
    expect(performers.length).toBe(36);
    const st = useStageEditorStore.getState();
    expect(st.keyframes.length).toBeGreaterThanOrEqual(3);
    expect(st.keyframes[0].performerPositions[performers[0].id]).toBeDefined();
  });

  it("应用队形模板保持人数并标记 dirty", () => {
    const st = useStageEditorStore.getState();
    const ok = st.applyTemplate("弧形环抱式");
    expect(ok).toBe(true);
    const after = useStageEditorStore.getState();
    expect(after.performers.length).toBe(36);
    expect(after.dirty).toBe(true);
  });

  it("未知模板返回 false 且不产生历史", () => {
    const st = useStageEditorStore.getState();
    const pastLen = st.past.length;
    expect(st.applyTemplate("不存在的模板")).toBe(false);
    expect(useStageEditorStore.getState().past.length).toBe(pastLen);
  });

  it("拖拽提交后可撤销/重做", () => {
    const store = useStageEditorStore.getState();
    const target = store.performers[0];
    const original = { ...target.position };
    store.setPosition(target.id, { x: 3, z: 2 }, { commit: true });
    expect(useStageEditorStore.getState().performers[0].position.x).toBe(3);
    useStageEditorStore.getState().undo();
    expect(useStageEditorStore.getState().performers[0].position.x).toBeCloseTo(original.x, 5);
    useStageEditorStore.getState().redo();
    expect(useStageEditorStore.getState().performers[0].position.x).toBe(3);
  });

  it("关键帧记录与切换", () => {
    const store = useStageEditorStore.getState();
    const first = store.performers[0];
    store.setPosition(first.id, { x: 5, z: 3 }, { commit: true });
    const kfId = useStageEditorStore.getState().keyframes[1].id;
    useStageEditorStore.getState().recordKeyframe(kfId);
    const kf = useStageEditorStore.getState().keyframes[1];
    expect(kf.performerPositions[first.id].x).toBe(5);
    // 移走后切换回关键帧应恢复
    useStageEditorStore.getState().setPosition(first.id, { x: -5, z: 0 }, { commit: true });
    useStageEditorStore.getState().activateKeyframe(kfId);
    expect(useStageEditorStore.getState().performers[0].position.x).toBe(5);
  });

  it("serialize/extractEditorSnapshot 往返一致", () => {
    const store = useStageEditorStore.getState();
    store.setPosition(store.performers[2].id, { x: 1.5, z: -2 }, { commit: true });
    const snap = useStageEditorStore.getState().serialize();
    const restored = extractEditorSnapshot({ __stageEditor: snap });
    expect(restored).not.toBeNull();
    expect(restored?.performers.length).toBe(36);
    // 用快照重新初始化
    useStageEditorStore.getState().initFromStageInput("proj-test", input, restored);
    expect(useStageEditorStore.getState().performers[2].position.x).toBe(1.5);
    expect(useStageEditorStore.getState().dirty).toBe(false);
  });

  it("extractEditorSnapshot 对脏数据返回 null", () => {
    expect(extractEditorSnapshot(null)).toBeNull();
    expect(extractEditorSnapshot({})).toBeNull();
    expect(extractEditorSnapshot({ __stageEditor: { schemaVersion: "0.0.0" } })).toBeNull();
  });
});
