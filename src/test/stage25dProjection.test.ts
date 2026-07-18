import { describe, expect, it } from "vitest";
import { DEFAULT_STAGE, computeStage25DLayout } from "@/domain/stageos";
import {
  groundYAtZ,
  projectPosition,
  scaleAtZ,
  unprojectPosition,
} from "@/features/stage-2.5d/projection/front-perspective";

const stage = { ...DEFAULT_STAGE };
const layout = computeStage25DLayout(stage, { width: 1280, height: 720 });

describe("2.5D 正面透视投影", () => {
  it("后排(z 负)人物比前排(z 正)小", () => {
    const back = scaleAtZ(-stage.depth / 2, stage);
    const front = scaleAtZ(stage.depth / 2, stage);
    expect(back).toBeLessThan(front);
    expect(back).toBeGreaterThan(0.5);
    expect(front).toBeLessThanOrEqual(1.05);
  });

  it("地面 Y 从地平线到台口单调递增", () => {
    const yBack = groundYAtZ(-stage.depth / 2, stage, layout);
    const yMid = groundYAtZ(0, stage, layout);
    const yFront = groundYAtZ(stage.depth / 2, stage, layout);
    expect(yBack).toBeLessThan(yMid);
    expect(yMid).toBeLessThan(yFront);
  });

  it("台阶层号增加垂直抬升(屏幕 Y 减小)", () => {
    const ground = projectPosition({ x: 0, z: -4, riserLevel: 0 }, stage, layout);
    const onRiser = projectPosition({ x: 0, z: -4, riserLevel: 3 }, stage, layout);
    expect(onRiser.screenY).toBeLessThan(ground.screenY);
  });

  it("投影/反投影往返一致(地面平面)", () => {
    const origin = { x: 2.4, z: -1.6 };
    const pr = projectPosition(origin, stage, layout);
    const back = unprojectPosition(pr.screenX, pr.screenY, stage, layout);
    expect(back.x).toBeCloseTo(origin.x, 1);
    expect(back.z).toBeCloseTo(origin.z, 1);
  });

  it("舞台中轴人物投影在屏幕中线", () => {
    const pr = projectPosition({ x: 0, z: 0 }, stage, layout);
    expect(pr.screenX).toBeCloseTo(layout.centerX, 5);
  });

  it("z 落入台阶区时自动推断层号", () => {
    const backEdgeZ = -stage.depth / 2 + stage.riserDepth * 1.5;
    const pr = projectPosition({ x: 0, z: backEdgeZ }, stage, layout);
    // riserLevel 2 层抬升 > 地面
    const ground = projectPosition({ x: 0, z: backEdgeZ, riserLevel: 0 }, stage, layout);
    expect(pr.screenY).toBeLessThan(ground.screenY);
  });
});
