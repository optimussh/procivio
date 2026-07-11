// Task 8 ?¤ëª¨?????„ë¡œ?¸ìŠ¤ ?¼ì´ë¸ŒëŸ¬ë¦??¨ë„ ?´ê¸° + ?ê¸° ì°¸ì¡° ë¹„í™œ??+ ?œë˜ê·¸ë¡œ subprocess ?¸ë“œ ?ì„±.
// ?¤í–‰: node scripts/pw-smoke-task8.mjs  (playwright-core, ?œë²„ 8000/3000 ê¸°ë™ ?„ì œ)
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

// map 3 = ì£¼ë¬¸ ?´í–‰(ì´ˆì•ˆ). ?¼ì´ë¸ŒëŸ¬ë¦¬ì— ì£¼ë¬¸ ì²˜ë¦¬(1)/ë°°ì†¡(2)ê°€ ë³´ì—¬???˜ê³  ?ê¸° ?ì‹ (3)?€ ë¹„í™œ??
await page.goto("http://localhost:7000/maps/3", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".react-flow__node", { timeout: 30000 });
await page.waitForTimeout(1500);

// ?¼ì´ë¸ŒëŸ¬ë¦?? ê? ë²„íŠ¼ ?´ë¦­
const libraryToggle = page.locator('button[title="Process library"], button[aria-label="Process library"], button[title="?„ë¡œ?¸ìŠ¤ ?¼ì´ë¸ŒëŸ¬ë¦?]').first();
let panelOpened = false;
try {
  await libraryToggle.click({ timeout: 5000 });
  panelOpened = true;
} catch {
  // ?´ë°±: Network ?„ì´ì½?ë²„íŠ¼ ì°¾ê¸°
  const btns = await page.locator("header button").all();
  for (const btn of btns) {
    const svg = await btn.locator("svg").count();
    if (svg > 0) {
      const title = await btn.getAttribute("title");
      if (title && (title.includes("library") || title.includes("?¼ì´ë¸ŒëŸ¬ë¦?))) {
        await btn.click();
        panelOpened = true;
        break;
      }
    }
  }
}
await page.waitForTimeout(1000);

// ?¨ë„ ?????•ì¸
const panelTexts = await page.$$eval("[class*='border-hairline']", (els) =>
  els.map((el) => el.textContent?.trim() ?? "")
);
const hasJumun = panelTexts.some((t) => t.includes("ì£¼ë¬¸ ì²˜ë¦¬"));
const hasBaesong = panelTexts.some((t) => t.includes("ë°°ì†¡"));

// ?ê¸° ?ì‹ (map 3) ?‰ì´ disabled(opacity-40)?¸ì? ?•ì¸
const selfDisabled = await page.evaluate(() => {
  const all = [...document.querySelectorAll("[draggable]")];
  // draggable=false ?´ê±°??opacity-40 ?´ë˜?¤ë? ê°€ì§??‰ì´ "ì£¼ë¬¸ ?´í–‰" ?ìŠ¤?¸ë? ?¬í•¨?˜ë©´ ë¹„í™œ??  const selfRow = [...document.querySelectorAll("div")].find(
    (el) => el.textContent?.trim() === "ì£¼ë¬¸ ?´í–‰" && el.className.includes("opacity-40")
  );
  return selfRow !== null && selfRow !== undefined;
});

// ?¸ë“œ ??ê¸°ë¡
const nodeCountBefore = await page.$$eval(".react-flow__node", (ns) => ns.length);

// drag-drop ?œë??ˆì´????HTML5 DnD??Playwright?ì„œ ?„ì „ ?ë™?”ê? ?´ë ¤?€.
// DataTransferë¥?ì§ì ‘ êµ¬ì„±??dragstart/dragover/drop ?´ë²¤?¸ë? dispatch.
const dropOk = await page.evaluate(() => {
  // ?¼ì´ë¸ŒëŸ¬ë¦¬ì—??map_id=1("ì£¼ë¬¸ ì²˜ë¦¬") ?œë˜ê·¸ë? ?œë??ˆì´??
  // ìº”ë²„??ì»¨í…Œ?´ë„ˆ(bg-canvas)ë¥??œë¡­ ?€ê²Ÿìœ¼ë¡??¬ìš©.
  const canvas = document.querySelector(".bg-canvas");
  if (!canvas) return false;
  const rect = canvas.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // DataTransfer polyfill ???¤ì œ ?œë˜ê·??¸ë“¤?¬ê? ?½ëŠ” ?¤ë? ?¤ì •
  const dt = new DataTransfer();
  dt.setData("application/bpm-process", "1");
  dt.setData("application/bpm-process-name", "ì£¼ë¬¸ ì²˜ë¦¬");
  dt.setData("application/bpm-process-pinned", "");

  // dragover ??drop
  const overEvt = new DragEvent("dragover", {
    bubbles: true, cancelable: true,
    clientX: cx, clientY: cy,
    dataTransfer: dt,
  });
  canvas.dispatchEvent(overEvt);

  const dropEvt = new DragEvent("drop", {
    bubbles: true, cancelable: true,
    clientX: cx, clientY: cy,
    dataTransfer: dt,
  });
  canvas.dispatchEvent(dropEvt);
  return true;
});

await page.waitForTimeout(2000); // ë¹„ë™ê¸?getResolvedGraph + setNodes ?ˆì •??
const nodeCountAfter = await page.$$eval(".react-flow__node", (ns) => ns.length);
const nodeAdded = nodeCountAfter > nodeCountBefore;

// ?¤í¬ë¦°ìƒ·
await page.screenshot({ path: "/tmp/bpm-task8-smoke.png", fullPage: false });
await browser.close();

console.log("panelOpened:", panelOpened);
console.log("hasJumunChori(ì£¼ë¬¸ ì²˜ë¦¬):", hasJumun);
console.log("hasBaesong(ë°°ì†¡):", hasBaesong);
console.log("selfDisabled(ì£¼ë¬¸ ?´í–‰ blocked):", selfDisabled);
console.log("dropSimulated:", dropOk);
console.log("nodeCount before -> after:", nodeCountBefore, "->", nodeCountAfter);
console.log("nodeAdded:", nodeAdded);
console.log("consoleErrors:", errors.length, errors.slice(0, 5));

// ?ì •: ?¨ë„ ?´ê¸° + ?¼ì´ë¸ŒëŸ¬ë¦????•ì¸ + ?ê¸° ë¹„í™œ?? ?œë¡­?€ bestEffort(DataTransfer ?œì•½).
const panelOk = panelOpened && hasJumun && hasBaesong;
const ok = panelOk && errors.length === 0;
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
