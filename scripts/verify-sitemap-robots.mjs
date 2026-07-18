/**
 * 构建时校验：public/sitemap.xml 与 public/robots.txt 一致性。
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const OK = { ok: true, message: "" };

export function verifySitemapRobots(input) {
  const { robotsText, sitemapText } = input;

  const sitemapDirectives = [
    ...robotsText.matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gim),
  ].map((m) => m[1]);
  if (sitemapDirectives.length === 0) {
    return { ok: false, message: "robots.txt 缺少 `Sitemap:` 指令。" };
  }
  if (new Set(sitemapDirectives).size > 1) {
    return {
      ok: false,
      message: `robots.txt 声明了多个不同的 Sitemap URL：${sitemapDirectives.join(", ")}`,
    };
  }
  const robotsSitemapUrl = sitemapDirectives[0];

  let robotsSitemapOrigin;
  let robotsSitemapPath;
  try {
    const url = new URL(robotsSitemapUrl);
    robotsSitemapOrigin = url.origin;
    robotsSitemapPath = url.pathname;
  } catch {
    return {
      ok: false,
      message: `robots.txt 中的 Sitemap URL 非法：${robotsSitemapUrl}`,
    };
  }

  if (robotsSitemapPath !== "/sitemap.xml") {
    return {
      ok: false,
      message: `robots.txt Sitemap 指向 ${robotsSitemapPath}，但项目中的 sitemap 位于 /sitemap.xml。`,
    };
  }

  const uaBlocks = robotsText.split(/^\s*User-agent:/gim).slice(1);
  for (const block of uaBlocks) {
    const [firstLine, ...rest] = block.split("\n");
    if (firstLine.trim() !== "*") continue;
    if (/^\s*Disallow:\s*\/\s*$/im.test(rest.join("\n"))) {
      return {
        ok: false,
        message:
          "robots.txt 对 `User-agent: *` 使用 `Disallow: /` 全站屏蔽，却同时声明了 Sitemap，配置自相矛盾。",
      };
    }
  }

  const locs = [...sitemapText.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(
    (match) => match[1],
  );
  if (locs.length === 0) {
    return { ok: false, message: "sitemap.xml 未包含任何 <loc> 条目。" };
  }

  const mismatched = [];
  for (const loc of locs) {
    let origin;
    try {
      origin = new URL(loc).origin;
    } catch {
      return { ok: false, message: `sitemap.xml 中存在非法 URL：${loc}` };
    }
    if (origin !== robotsSitemapOrigin) mismatched.push(loc);
  }

  if (mismatched.length > 0) {
    return {
      ok: false,
      message: `sitemap.xml 中以下 URL 与 robots.txt Sitemap 域名 (${robotsSitemapOrigin}) 不一致：\n  - ${mismatched.join("\n  - ")}`,
    };
  }

  return OK;
}

function main() {
  const root = resolve(process.cwd());
  let robotsText;
  let sitemapText;

  try {
    robotsText = readFileSync(resolve(root, "public/robots.txt"), "utf8");
  } catch {
    console.error(`[verify-sitemap-robots] ✗ 无法读取 robots.txt: ${resolve(root, "public/robots.txt")}`);
    process.exit(1);
  }

  try {
    sitemapText = readFileSync(resolve(root, "public/sitemap.xml"), "utf8");
  } catch {
    console.error(`[verify-sitemap-robots] ✗ 无法读取 sitemap.xml: ${resolve(root, "public/sitemap.xml")}`);
    process.exit(1);
  }

  const result = verifySitemapRobots({ robotsText, sitemapText });
  if (!result.ok) {
    console.error(`[verify-sitemap-robots] ✗ ${result.message}`);
    process.exit(1);
  }

  const locs = [...sitemapText.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)];
  const origin = new URL(
    [...robotsText.matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gim)][0][1],
  ).origin;
  console.log(
    `[verify-sitemap-robots] ✓ robots.txt 与 sitemap.xml 一致（域名 ${origin}，共 ${locs.length} 条 URL）。`,
  );
}

if (
  typeof process.argv[1] === "string" &&
  import.meta.url === `file://${process.argv[1]}`
) {
  main();
}
