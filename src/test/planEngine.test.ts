import { describe, expect, it } from "vitest";
import type { StageInputData } from "@/lib/stageos";
import { STAGEOS_SCHEMA_VERSION, engineModeLabel } from "@/domain/stageos";
import { generateStagePlan } from "@/features/plan-engine/generate-plan";
import { toPlanSnapshotInsert } from "@/features/plan-engine/persist-snapshot";

const baseInput: StageInputData = {
  programType: "chorus",
  activityType: "合唱",
  ageRange: "初中",
  maleCount: 20,
  femaleCount: 20,
  venueType: "音乐厅",
  weather: "晴",
  movementIntensity: "低",
  costumeForm: "短款",
  styleDirection: "经典",
  themeLabel: "青春",
  specialNotes: "",
  eventType: "校级艺术节",
  budgetLevel: "中",
  durationMin: 5,
} as StageInputData;

describe("统一方案编排器(本地规则引擎)", () => {
  it("无 Token 时生成完整方案:服装/配色/队形/舞台/风险/倒排", () => {
    const result = generateStagePlan(baseInput);
    expect(result.costumePlan).toBeTruthy();
    expect(result.visualPlan.palette).toBeTruthy();
    expect(result.visualPlan.formation).toBeTruthy();
    expect(result.visualPlan.stage.venueType).toBe("音乐厅");
    expect(Array.isArray(result.risks)).toBe(true);
    expect(Array.isArray(result.reverseSchedule)).toBe(true);
  });

  it("结果必须标记来源:engine/local-rules + 版本号", () => {
    const result = generateStagePlan(baseInput);
    expect(result.provenance.engine).toBe("local-rules");
    expect(result.provenance.knowledgeVersion).toBeTruthy();
    expect(result.provenance.constraintVersion).toBeTruthy();
    expect(result.provenance.paletteVersion).toBeTruthy();
    expect(result.provenance.generatedAt).toBeTruthy();
    expect(Array.isArray(result.provenance.sources)).toBe(true);
  });

  it("知识库命中节目原型并给出队形建议", () => {
    const result = generateStagePlan(baseInput);
    expect(result.knowledge.archetypeId).toBeTruthy();
    expect(result.visualPlan.formation.recommended).toBeTruthy();
    expect(result.visualPlan.formation.riserCount).toBe(4);
  });

  it("人数为 0 时抛出校验错误", () => {
    expect(() => generateStagePlan({ ...baseInput, maleCount: 0, femaleCount: 0 })).toThrow(/校验失败/);
  });

  it("快照插入行:mode 为 local-rules 且带 provenance/warnings", () => {
    const result = generateStagePlan(baseInput);
    const row = toPlanSnapshotInsert({ projectId: "p1", userId: "u1", version: 3, result });
    expect(row.mode).toBe("local-rules");
    expect(row.engine).toBe("local-rules");
    expect(row.schema_version).toBe(STAGEOS_SCHEMA_VERSION);
    expect(row.version).toBe(3);
    expect(row.costume_plan).toBeTruthy();
  });

  it("engineModeLabel 如实展示来源", () => {
    expect(engineModeLabel("local-rules")).toBe("本地规则生成");
    expect(engineModeLabel("ai")).toBe("AI 增强生成");
    expect(engineModeLabel("mock")).toBe("本地规则(旧)");
    expect(engineModeLabel("ai", "fallback")).toBe("已回退本地规则");
  });
});
