// ?¬í˜„ ???˜ìœ„?„ë¡œ?¸ìŠ¤ ?¼ì¹œ ?íƒœ?ì„œ ROOT ?¸ë“œê°€ ?¬ì „???¸ì§‘(?œë˜ê·? ê°€?¥í•œì§€ ?¤ì¸¡.
// ë£¨íŠ¸ ?¸ë“œ c-done(?´í–‰ ?„ë£Œ)???¼ì¹¨ ???„ë¡œ opacityÂ·transform ë¹„êµ + ?¤ì œ ?œë˜ê·?
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
// ?¼ì¹˜ë©?footprint shiftë¡?ë£¨íŠ¸ ?¸ë“œê°€ ?°ì¸¡?¼ë¡œ ë°€??ê¸°ë³¸ ë·°í¬?¸ë? ë²—ì–´?œë‹¤ ???‰ë„‰??ë·°í¬??+ fitViewë¡??”ë©´ ?ˆì— ?”ë‹¤.
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.addInitScript(() => window.localStorage.setItem("bpm.devUser", "admin"));
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://localhost:7000/maps/3", { waitUntil: "domcontentloaded" });
await page.waitForSelector('.react-flow__node[data-id="c-done"]', { timeout: 30000 });
await page.waitForTimeout(2000);

const readRoot = () => page.evaluate(() => {
  const el = document.querySelector('.react-flow__node[data-id="c-done"]');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { opacity: cs.opacity, transform: el.style.transform, draggableAttr: el.classList.contains("nodrag") };
});

const beforeExpand = await readRoot();

// ì£¼ë¬¸ ì²˜ë¦¬(c-order) ?¼ì¹¨
const orderNode = page.locator('.react-flow__node[data-id="c-order"]').first();
await orderNode.hover();
await page.waitForTimeout(200);
let clicked = false;
try {
  await orderNode.locator('button[title*="ubprocess"], button[title*="?¼ì¹˜ê¸?]').first().click({ timeout: 4000, force: true });
  clicked = true;
} catch {
  clicked = await page.evaluate(() => {
    const o = document.querySelector('.react-flow__node[data-id="c-order"]');
    const b = o?.querySelector("button[title]");
    if (!b) return false;
    b.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return true;
  });
}
await page.waitForTimeout(2000);

const afterExpand = await readRoot();

// ?¼ì¹¨ ??c-done???°ì¸¡?¼ë¡œ ë°€???”ë©´ ë°–ì¼ ???ˆë‹¤ ??ctrl+? ë¡œ ì¤Œì•„?ƒí•´ ?„ì²´ ??„ ?”ë©´ ?ˆì— ?£ëŠ”??
// (RF??ctrl+wheel??ì¤Œìœ¼ë¡?ì²˜ë¦¬. ??fitView ì»¨íŠ¸ë¡¤ì? ì¤?? ì?Â·ì¢Œìƒ???•ë ¬?´ë¼ ?“ì? ì½˜í…ì¸ ë? ëª??´ìŒ.)
const pane = await page.locator(".react-flow__pane").boundingBox();
if (pane) {
  const cx = pane.x + pane.width / 2;
  const cy = pane.y + pane.height / 2;
  await page.mouse.move(cx, cy);
  await page.keyboard.down("Control");
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 200); // ?‘ìˆ˜ deltaY + ctrl = ì¤Œì•„??    await page.waitForTimeout(70);
  }
  await page.keyboard.up("Control");
}
await page.waitForTimeout(600);

// ?¤ì œ ?œë˜ê·???c-done??ì¢Œìƒ?¨ìœ¼ë¡??”ë©´ ?ˆìª½ ë°©í–¥) ?´ë™
const box = await page.locator('.react-flow__node[data-id="c-done"]').boundingBox();
const onScreen = box && box.x > 0 && box.x < 1400 && box.y > 0 && box.y < 900;
let dragMoved = false;
const transformBeforeDrag = onScreen ? (await readRoot())?.transform : null;
if (onScreen) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height / 2 - 50, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  const afterDrag = await readRoot();
  dragMoved = afterDrag && transformBeforeDrag != null && afterDrag.transform !== transformBeforeDrag;
}
console.log("c-done on-screen for drag:", onScreen);

await page.screenshot({ path: "/tmp/bpm-repro-root-edit.png", fullPage: false });
await browser.close();

console.log("beforeExpand c-done:", JSON.stringify(beforeExpand));
console.log("toggle clicked:", clicked);
console.log("afterExpand  c-done:", JSON.stringify(afterExpand));
console.log("root drag moved after expand:", dragMoved);
console.log("consoleErrors:", errors.length);
const rootEditable = afterExpand && afterExpand.opacity === "1" && !afterExpand.draggableAttr && dragMoved;
console.log(rootEditable ? "ROOT EDITABLE WHEN EXPANDED (no bug)" : "ROOT READ-ONLY WHEN EXPANDED (bug reproduced)");
