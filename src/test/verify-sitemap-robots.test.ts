import { describe, it, expect } from "vitest";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { verifySitemapRobots } from "../../scripts/verify-sitemap-robots.mjs";

const ROOT = resolve(__dirname, "../..");
const SCRIPT_PATH = resolve(ROOT, "scripts/verify-sitemap-robots.mjs");

function minimalRobots(url = "https://example.com/sitemap.xml") {
  return `User-agent: *\nAllow: /\n\nSitemap: ${url}\n`;
}
function minimalSitemap(locs: string[] = ["https://example.com/"]) {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...locs.map((l) => `  <url><loc>${l}</loc></url>`),
    `</urlset>`,
  ].join("\n");
}

describe("verifySitemapRobots — success", () => {
  it("接受项目真实的 robots.txt 与 sitemap.xml", () => {
    const robotsText = readFileSync(resolve(ROOT, "public/robots.txt"), "utf8");
    const sitemapText = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf8");
    const result = verifySitemapRobots({ robotsText, sitemapText });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("");
  });

  it("接受最小合法组合", () => {
    expect(
      verifySitemapRobots({
        robotsText: minimalRobots(),
        sitemapText: minimalSitemap(),
      }).ok,
    ).toBe(true);
  });
});

describe("verifySitemapRobots — validation", () => {
  it("拒绝缺少 Sitemap 指令", () => {
    const result = verifySitemapRobots({
      robotsText: `User-agent: *\nAllow: /\n`,
      sitemapText: minimalSitemap(),
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("缺少 `Sitemap:` 指令");
  });

  it("拒绝不一致的域名", () => {
    const result = verifySitemapRobots({
      robotsText: minimalRobots(),
      sitemapText: minimalSitemap(["https://other.com/"]),
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("域名");
  });
});

describe("verifySitemapRobots — CLI", () => {
  function runInFixture(robots: string, sitemap: string) {
    const dir = mkdtempSync(join(tmpdir(), "vsr-"));
    mkdirSync(join(dir, "public"));
    writeFileSync(join(dir, "public/robots.txt"), robots);
    writeFileSync(join(dir, "public/sitemap.xml"), sitemap);
    return spawnSync("node", [SCRIPT_PATH], {
      cwd: dir,
      encoding: "utf8",
    });
  }

  it("合法输入时退出码为 0", () => {
    const result = runInFixture(minimalRobots(), minimalSitemap());
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[verify-sitemap-robots] ✓");
  });

  it("非法输入时退出码为 1", () => {
    const result = runInFixture(`User-agent: *\nAllow: /\n`, minimalSitemap());
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("[verify-sitemap-robots] ✗");
  });
});
