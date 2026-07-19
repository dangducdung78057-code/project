import { describe, expect, it } from "vitest";
import {
  DEFAULT_STAGE,
  PRIMARY_TEMPLATE_NAMES,
  clampToStage,
  computeTemplatePositions,
  heartPositions,
  listFormationTemplates,
} from "@/domain/stageos";

const stage = { ...DEFAULT_STAGE };

describe("队形模板库(领域层)", () => {
  it("Epic 首批模板全部可用", () => {
    const available = listFormationTemplates();
    for (const name of PRIMARY_TEMPLATE_NAMES) {
      expect(available, `缺少模板:${name}`).toContain(name);
    }
  });

  it("模板坐标数与人数一致(36 人)", () => {
    for (const name of listFormationTemplates()) {
      const positions = computeTemplatePositions(name, 36, 0.8, stage);
      expect(positions, name).not.toBeNull();
      expect(positions?.length, name).toBe(36);
    }
  });

  it("模板坐标不越过舞台安全边界", () => {
    const mx = stage.width / 2;
    const mz = stage.depth / 2;
    for (const name of listFormationTemplates()) {
      const positions = computeTemplatePositions(name, 60, 0.8, stage) ?? [];
      for (const p of positions) {
        expect(Math.abs(p.x), `${name} x 越界`).toBeLessThanOrEqual(mx);
        expect(Math.abs(p.z), `${name} z 越界`).toBeLessThanOrEqual(mz);
      }
    }
  });

  it("心形模板生成非共线坐标且中轴对称", () => {
    const pts = heartPositions(30);
    expect(pts.length).toBe(30);
    const xs = pts.map(([x]) => x);
    const zs = pts.map(([, z]) => z);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(3);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(2);
  });

  it("clampToStage 钳制越界坐标", () => {
    const clamped = clampToStage({ x: 99, z: -99 }, stage);
    expect(clamped.x).toBeLessThanOrEqual(stage.width / 2);
    expect(clamped.z).toBeGreaterThanOrEqual(-stage.depth / 2);
  });

  it("未知模板返回 null", () => {
    expect(computeTemplatePositions("不存在的模板", 10, 0.8, stage)).toBeNull();
  });
});
