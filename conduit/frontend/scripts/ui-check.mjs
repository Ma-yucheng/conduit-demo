// 用真实浏览器验证 UI：登录、浏览文章、发布文章，并截图。
// 运行：node scripts/ui-check.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.WEB_BASE ?? "http://127.0.0.1:3000";
const OUT = fileURLToPath(new URL("../../docs/shots/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

const step = async (name, fn) => {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.log(`✗ ${name}: ${e.message.split("\n")[0]}`);
    throw e;
  }
};

await step("首页加载并渲染文章列表", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".article-preview", { timeout: 15000 });
  const count = await page.locator(".article-preview").count();
  if (count < 1) throw new Error("没有渲染出文章");
  console.log(`  文章数: ${count}`);
  await page.screenshot({ path: `${OUT}01-home.png`, fullPage: true });
});

await step("登录 alice", async () => {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "alice@example.com");
  await page.fill('input[type="password"]', "password123");
  await page.click('button:has-text("登录")');
  await page.waitForSelector('a[href="/editor"]', { timeout: 15000 });
  await page.waitForSelector(".article-preview", { timeout: 15000 });
  await page.screenshot({ path: `${OUT}02-home-logged-in.png`, fullPage: true });
});

await step("打开文章详情并点赞", async () => {
  await page.locator(".article-preview h2 a").first().click();
  await page.waitForSelector(".article-body", { timeout: 15000 });
  const before = await page.locator(".fav-btn").first().innerText();
  await page.locator(".fav-btn").first().click();
  await page.waitForTimeout(600);
  const after = await page.locator(".fav-btn").first().innerText();
  console.log(`  点赞数: ${before.trim()} → ${after.trim()}`);
  await page.screenshot({ path: `${OUT}03-article.png`, fullPage: true });
});

await step("发表评论", async () => {
  await page.fill("textarea", "来自自动化检查的评论 👍");
  await page.click('button:has-text("发表评论")');
  await page.waitForSelector(".comment-card", { timeout: 15000 });
  console.log("  评论数:", await page.locator(".comment-card").count());
  await page.screenshot({ path: `${OUT}04-comment.png`, fullPage: true });
});

await step("写一篇新文章", async () => {
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle" });
  const inputs = page.locator(".field input");
  await inputs.nth(0).fill("自动化测试发布的文章");
  await inputs.nth(1).fill("由 Playwright 脚本创建，用于验证流程");
  await page.fill("textarea", "如果这篇文章出现在列表里，说明前后端联调完全打通。");
  await inputs.nth(2).fill("playwright, test");
  await page.click('button:has-text("发布文章")');
  await page.waitForSelector(".article-body", { timeout: 15000 });
  const title = await page.locator(".article-header h1").innerText();
  console.log(`  已发布: ${title}`);
  await page.screenshot({ path: `${OUT}05-new-article.png`, fullPage: true });
});

await step("个人主页", async () => {
  await page.goto(`${BASE}/profile/alice`, { waitUntil: "networkidle" });
  await page.waitForSelector(".banner", { timeout: 15000 });
  await page.screenshot({ path: `${OUT}06-profile.png`, fullPage: true });
});

await browser.close();

if (errors.length) {
  console.log(`\n控制台错误 ${errors.length} 条:`);
  for (const e of errors.slice(0, 5)) console.log("  -", e.slice(0, 160));
} else {
  console.log("\n无控制台错误");
}
