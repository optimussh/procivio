// Issue 2 ?¤ëª¨????ëª¨ë‘ ?‘íŒ ?íƒœ?ì„œ???„ì›ƒ?¼ì¸???˜ìœ„?„ë¡œ?¸ìŠ¤ ??c-order/c-deliver)???¼ì¹˜ê¸??´í¬?˜ìŠ¤
// (chevron ë²„íŠ¼)ë¥?ë³´ì´?”ì?, ?´ë¦­?˜ë©´ (a) ?‰ì´ ?¼ì³ì§€ê³?(b) ìº”ë²„?¤ì— ?ì‹???„ë² ?œë˜?”ì? ?¤ì¸¡.
// map 3: c-order(ì£¼ë¬¸ ì²˜ë¦¬, linked=1) / c-deliver(ë°°ì†¡, linked=2). ?„ë² ???ì‹ id??"c-order/<?ë³¸id>" ?¤ì„?¤í˜?´ìŠ¤.
// ?¤í–‰: node scripts/pw-smoke-issue2-outline.mjs  (playwright-core, ?œë²„ 8000/3000 ê¸°ë™ ?„ì œ)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.addInitScript(() => window.localStorage.setItem("bpm.devUser", "admin"));
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("Couldn't create edge for source handle")) {
    errors.push(m.text());
  }
});

await page.goto("http://localhost:7000/maps/3", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".react-flow__node", { timeout: 30000 });
await page.waitForTimeout(2500);

// ?„ì›ƒ?¼ì¸ ??li) ì¤??¼ë²¨ ?ìŠ¤?¸ë¡œ ?‰ì„ ì°¾ì•„ ?¼ì¹˜ê¸?ë²„íŠ¼(aria-label expand/collapse) ? ë¬´ë¥?ë³¸ë‹¤.
async function rowState(label) {
  return page.evaluate((lbl) => {
    const lis = [...document.querySelectorAll("aside li, nav li, ul li")];
    const li = lis.find((el) => (el.textContent ?? "").includes(lbl) && el.querySelector("span,svg,button"));
    if (!li) return { found: false };
    const btn = li.querySelector("button[aria-label]");
    const al = btn?.getAttribute("aria-label") ?? "";
    // ChevronDown(?¼ì¹¨) vs ChevronRight(?‘í˜)?€ aria-label(collapse vs expand)ë¡?êµ¬ë¶„
    const expandable = !!btn && (al.toLowerCase().includes("expand") || al.toLowerCase().includes("collapse") || al.includes("?¼ì¹˜") || al.includes("?‘ê¸°"));
    const expanded = al.toLowerCase().includes("collapse") || al.includes("?‘ê¸°");
    return { found: true, expandable, expanded, ariaLabel: al };
  }, label);
}

// ?¼ì¹˜ê¸?ë²„íŠ¼ ?´ë¦­
async function clickRowExpand(label) {
  return page.evaluate((lbl) => {
    const lis = [...document.querySelectorAll("aside li, nav li, ul li")];
    const li = lis.find((el) => (el.textContent ?? "").includes(lbl) && el.querySelector("button[aria-label]"));
    const btn = li?.querySelector("button[aria-label]");
    if (!btn) return false;
    btn.click();
    return true;
  }, label);
}

// ìº”ë²„?¤ì— c-order???„ë² ???ì‹???ˆëŠ”ì§€ ??data-idê°€ "c-order/" ë¡??œì‘?˜ëŠ” RF ?¸ë“œ.
async function embeddedChildCount(hostId) {
  return page.evaluate((h) => {
    return [...document.querySelectorAll(".react-flow__node")].filter((el) =>
      (el.getAttribute("data-id") ?? "").startsWith(h + "/"),
    ).length;
  }, hostId);
}

// ===== (1) ?‘íŒ ?íƒœ: c-order/c-deliver ?‰ì´ ?¼ì¹˜ê¸??´í¬?˜ìŠ¤ë¥?ê°€ì§€?”ê? =====
const orderBefore = await rowState("ì£¼ë¬¸ ì²˜ë¦¬");
const deliverBefore = await rowState("ë°°ì†¡");
console.log("c-order row (collapsed):", JSON.stringify(orderBefore));
console.log("c-deliver row (collapsed):", JSON.stringify(deliverBefore));
const childrenBefore = await embeddedChildCount("c-order");
console.log("c-order embedded children before expand:", childrenBefore);

const affordanceOk =
  orderBefore.found && orderBefore.expandable && !orderBefore.expanded &&
  deliverBefore.found && deliverBefore.expandable && !deliverBefore.expanded;
console.log("(1) collapsed subprocess rows show expand affordance:", affordanceOk);

// ===== (2) ?´ë¦­ ?????¼ì¹¨ + ìº”ë²„???ì‹ ?„ë² ??=====
const clicked = await clickRowExpand("ì£¼ë¬¸ ì²˜ë¦¬");
console.log("clicked c-order expand:", clicked);
await page.waitForTimeout(2500); // resolved embed + materialize

const orderAfter = await rowState("ì£¼ë¬¸ ì²˜ë¦¬");
const childrenAfter = await embeddedChildCount("c-order");
console.log("c-order row (after click):", JSON.stringify(orderAfter));
console.log("c-order embedded children after expand:", childrenAfter);

const rowExpanded = orderAfter.found && orderAfter.expanded;
const canvasEmbedded = childrenAfter > childrenBefore && childrenAfter > 0;
console.log("(2a) row expanded after click:", rowExpanded);
console.log("(2b) canvas embedded children after click:", canvasEmbedded);

await page.screenshot({ path: "/tmp/bpm-issue2.png", fullPage: false });
console.log("consoleErrors:", errors.length, errors.slice(0, 5));
await browser.close();

const pass = affordanceOk && clicked && rowExpanded && canvasEmbedded && errors.length === 0;
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
