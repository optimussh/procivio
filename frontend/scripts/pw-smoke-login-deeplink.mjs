// ë¡œê·¸???¥ë§??ë³µì› ?¤ëª¨??dev ëª¨ë“œ) ??ë¯¸ë¡œê·¸ì¸ ?¥ë§????/login ??dev ë¡œê·¸?????ëž˜ ë§?ë³µê? + unsafe returnTo ê±°ë?.
// ?¤í–‰: frontend/ ?ì„œ node scripts/pw-smoke-login-deeplink.mjs
// ?„ì œ: backend(:8000)+frontend(:3000) ê¸°ë™, dev.db ?œë“œ(ë§?MAP_ID ì¡´ìž¬). playwright-core+?œìŠ¤??Chrome.
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:7000";
const MAP_ID = process.env.MAP_ID ?? "2";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` ??${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

// ??ë¯¸ë¡œê·¸ì¸ ?¥ë§????/login ë¦¬ë‹¤?´ë ‰????dev ë¡œê·¸?????ëž˜ ë§?ë³µê?
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/maps/${MAP_ID}`, { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/login", { timeout: 15000 });
  check("deeplink redirects to /login", true);
  await page.click('[data-id="login-dev"]');
  await page.waitForSelector('[data-id="dev-login-modal"]');
  await page.click('[data-id="dev-user-row"]'); // ì²?? ì?(admin.kim)
  await page.waitForURL(`**/maps/${MAP_ID}`, { timeout: 15000 });
  check("returnTo restores deep link after dev login", true);
  const returnToLeft = await page.evaluate(() => window.sessionStorage.getItem("bpm.returnTo"));
  check("returnTo consumed after restore", returnToLeft === null, `left=${returnToLeft}`);
  await ctx.close();
}

// ??unsafe returnTo??ë¬´ì‹œ?˜ê³  ?ˆìœ¼ë¡?{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.sessionStorage.setItem("bpm.returnTo", "//evil.com"));
  await page.click('[data-id="login-dev"]');
  await page.waitForSelector('[data-id="dev-login-modal"]');
  await page.click('[data-id="dev-user-row"]');
  await page.waitForURL((url) => url.pathname === "/", { timeout: 15000 });
  check("unsafe returnTo ignored, lands on home", true);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(failed.length === 0 ? `ALL PASS (${results.length})` : `${failed.length} FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
