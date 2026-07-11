// Task 6b ?¤ëª¨?????¸ë¼???„ë² ???ì‹ ?¸ë“œ ?´ë¦­ ? íƒ UX ê²€ì¦?
// ?‘ìˆ˜ ?¸ë“œ ?´ë¦­ ??.selected ?´ëž˜???ë“, ring ?¤í????ìš©, ?°í´ë¦???ì»¨í…?¤íŠ¸ ë©”ë‰´ ?†ìŒ.
// ?¤í–‰: node scripts/pw-smoke-task6b.mjs  (playwright-core, ?œë²„ 8000/3000 ê¸°ë™ ?„ì œ)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext();
await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin");
});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://localhost:7000/maps/3", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".react-flow__node", { timeout: 30000 });
await page.waitForTimeout(2000);

// "ì£¼ë¬¸ ì²˜ë¦¬" ?˜ìœ„?„ë¡œ?¸ìŠ¤ ?¸ë“œ ?¼ì¹˜ê¸?const orderNode = page.locator(".react-flow__node", { hasText: "ì£¼ë¬¸ ì²˜ë¦¬" }).first();
await orderNode.hover();
await page.waitForTimeout(200);
const toggle = orderNode.locator('button[title*="ubprocess"], button[title*="?¼ì¹˜ê¸?]').first();
let clicked = false;
try {
  await toggle.click({ timeout: 4000, force: true });
  clicked = true;
} catch {
  clicked = await page.evaluate(() => {
    const order = [...document.querySelectorAll(".react-flow__node")].find((n) => n.textContent?.includes("ì£¼ë¬¸ ì²˜ë¦¬"));
    const btn = order?.querySelector("button[title]");
    if (!btn) return false;
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return true;
  });
}
await page.waitForTimeout(2000);

// ?ì‹ ?¸ë“œ ?•ì¸
const textsAfter = await page.$$eval(".react-flow__node", (ns) => ns.map((n) => n.textContent?.trim() ?? ""));
const hasJeobsu = textsAfter.some((t) => t.includes("?‘ìˆ˜"));
const hasGeomto = textsAfter.some((t) => t.includes("ê²€??));

// 1. "?‘ìˆ˜" ?„ë² ???ì‹ ?¸ë“œ ?´ë¦­
const jeobsuNode = page.locator(".react-flow__node", { hasText: "?‘ìˆ˜" }).first();
await jeobsuNode.click();
await page.waitForTimeout(500);

// ? íƒ ?íƒœ ?•ì¸ ??RF???´ë¦­???¸ë“œ??.selected ?´ëž˜?¤ë? ì¶”ê?
const selectedAfterClick = await page.evaluate(() => {
  const node = [...document.querySelectorAll(".react-flow__node")].find((n) => n.textContent?.trim().includes("?‘ìˆ˜"));
  if (!node) return { hasSelected: false, hasRing: false };
  return {
    hasSelected: node.classList.contains("selected"),
    // ring ?´ëž˜?¤ëŠ” process-node ?´ë? div???ˆìŒ
    hasRing: node.querySelector('[class*="ring"]') !== null,
  };
});

// ?œëž˜ê·?ê°€???¬ë? ??draggable:falseë©?noDrag ?´ëž˜?¤ê? ë¶™ìŒ
const notDraggable = await page.evaluate(() => {
  const node = [...document.querySelectorAll(".react-flow__node")].find((n) => n.textContent?.trim().includes("?‘ìˆ˜"));
  return node ? node.classList.contains("noDrag") || !node.draggable : true;
});

// 2. ?°í´ë¦???ì»¨í…?¤íŠ¸ ë©”ë‰´ ?±ìž¥?˜ì? ?Šì•„????await jeobsuNode.click({ button: "right" });
await page.waitForTimeout(500);
// ë©”ë‰´ ?”ì†Œ ?•ì¸: ??ì»¨í…?¤íŠ¸ ë©”ë‰´(role=menu ?ëŠ” data-menu)
const menuVisible = await page.evaluate(() => {
  // ?±ì´ ?Œë”?˜ëŠ” ì»¨í…?¤íŠ¸ ë©”ë‰´ ??role=menu ?¹ì? ?´ëž˜?¤ì— "menu"ë¥??¬í•¨?˜ëŠ” ê°€???”ì†Œ
  const menus = [...document.querySelectorAll('[role="menu"], [data-menu]')];
  const visibleMenus = menus.filter((m) => {
    const s = window.getComputedStyle(m);
    return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
  });
  return visibleMenus.length > 0;
});

await page.screenshot({ path: "/tmp/bpm-task6b-smoke.png", fullPage: false });
await browser.close();

console.log("toggle clicked:", clicked);
console.log("embedded visible ???‘ìˆ˜:", hasJeobsu, "ê²€??", hasGeomto);
console.log("selected after click:", JSON.stringify(selectedAfterClick));
console.log("not draggable:", notDraggable);
console.log("menu visible after right-click:", menuVisible);
console.log("consoleErrors:", errors.length, errors.slice(0, 5));

const embedOk = clicked && hasJeobsu && hasGeomto;
const selectionOk = selectedAfterClick.hasSelected || selectedAfterClick.hasRing;
const noMenuOk = !menuVisible;
const ok = embedOk && selectionOk && noMenuOk && errors.length === 0;

console.log("embedOk:", embedOk, "selectionOk:", selectionOk, "noMenuOk:", noMenuOk, "errorsOk:", errors.length === 0);
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
