// Task 5 ?œê° ?¤ëª¨?????˜ìœ„?„ë¡œ?¸ìŠ¤ ?¸ë“œë¥??¼ì¹˜ë©?ë§í¬ë§?map 1) resolved ê·¸ëž˜?„ê? ?„ë² ???ì‹?¼ë¡œ ?±ìž¥?˜ëŠ”ì§€ ?¤ì¸¡.
// ?©ì„± ?¸ë¦¬(fullGraph)ê°€ ë§í¬ë§?resolvedë¥??¼ì›Œ ?Œë” ?´ë¦¬?œê? ê·¸ë?ë¡??ì‹??ê·¸ë¦¬?”ì? ê²€ì¦?
// ?¤í–‰: node scripts/pw-smoke-task5.mjs  (playwright-core, ?œë²„ 8000/3000 ê¸°ë™ ?„ì œ)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext();
// dev ë¡œê·¸???°íšŒ ??DevGateê°€ ?½ëŠ” localStorage ?¤ë? ? ì£¼??await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin");
});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://localhost:7000/maps/3", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".react-flow__node", { timeout: 30000 });
await page.waitForTimeout(2000); // ì¸¡ì •/?ˆì´?„ì›ƒ + resolved ? ë¡œ??subEnds) ?ˆì •??
const textsBefore = await page.$$eval(".react-flow__node", (ns) => ns.map((n) => n.textContent?.trim() ?? ""));
const hasOrder = textsBefore.some((t) => t.includes("ì£¼ë¬¸ ì²˜ë¦¬"));

// "ì£¼ë¬¸ ì²˜ë¦¬"(map 1 ë§í¬) ?˜ìœ„?„ë¡œ?¸ìŠ¤ ?¸ë“œ?????¸ë“¤ ??subEnds ? ë¡œ???•ì¸(?„ë£Œ=primary + ì·¨ì†Œ ??source 2ê°?ê¸°ë?)
const handlesBefore = await page.evaluate(() => {
  const order = [...document.querySelectorAll(".react-flow__node")].find((n) => n.textContent?.includes("ì£¼ë¬¸ ì²˜ë¦¬"));
  if (!order) return null;
  const handles = [...order.querySelectorAll(".react-flow__handle")];
  return {
    sources: handles.filter((h) => h.classList.contains("source")).length,
    targets: handles.filter((h) => h.classList.contains("target")).length,
  };
});

// ?¼ì¹¨ ? ê? ?´ë¦­ ???¸ë“œ hoverë¡?toggle(opacity-0 group-hover) ?¸ì¶œ ???´ë¦­.
// ? ê??€ title ?ì„±(?????????˜ìš©)?¼ë¡œ ?ë³„. ?¸ë“œ ??? ì¼??title ë²„íŠ¼.
const orderNode = page.locator(".react-flow__node", { hasText: "ì£¼ë¬¸ ì²˜ë¦¬" }).first();
await orderNode.hover();
await page.waitForTimeout(200);
const toggle = orderNode.locator('button[title*="ubprocess"], button[title*="?¼ì¹˜ê¸?]').first();
let clicked = false;
try {
  await toggle.click({ timeout: 4000, force: true });
  clicked = true;
} catch {
  // ?´ë°±: ì§ì ‘ DOM ?”ìŠ¤?¨ì¹˜(opacity-0?´ë¼ ?€?‰í„° ?´ë¦­??ë¶ˆì•ˆ?•í•  ???ˆìŒ)
  clicked = await page.evaluate(() => {
    const order = [...document.querySelectorAll(".react-flow__node")].find((n) => n.textContent?.includes("ì£¼ë¬¸ ì²˜ë¦¬"));
    const btn = order?.querySelector("button[title]");
    if (!btn) return false;
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return true;
  });
}

await page.waitForTimeout(2000); // ?¼ì¹¨ ? ë‹ˆë©”ì´??+ materialize

const textsAfter = await page.$$eval(".react-flow__node", (ns) => ns.map((n) => n.textContent?.trim() ?? ""));
const hasJeobsu = textsAfter.some((t) => t.includes("?‘ìˆ˜"));   // map 1 ?„ë² ???ì‹
const hasGeomto = textsAfter.some((t) => t.includes("ê²€??));   // map 1 ?„ë² ???ì‹
const nodeCountBefore = textsBefore.length;
const nodeCountAfter = textsAfter.length;

await page.screenshot({ path: "/tmp/bpm-task5-smoke.png", fullPage: false });
await browser.close();

console.log("hasOrder:", hasOrder);
console.log("handlesBefore (subEnds proof):", JSON.stringify(handlesBefore));
console.log("toggle clicked:", clicked);
console.log("nodeCount before -> after:", nodeCountBefore, "->", nodeCountAfter);
console.log("embedded visible ???‘ìˆ˜:", hasJeobsu, "ê²€??", hasGeomto);
console.log("consoleErrors:", errors.length, errors.slice(0, 5));

const subEndsOk = handlesBefore && handlesBefore.sources >= 2 && handlesBefore.targets >= 1;
const embedOk = hasOrder && clicked && hasJeobsu && hasGeomto && nodeCountAfter > nodeCountBefore;
const ok = subEndsOk && embedOk && errors.length === 0;
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
