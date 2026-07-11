// PNG ?´ë³´?´ê¸° ê²€ì¦????ë””??Ctrl+Shift+E)Â·ë¹„êµ(Export ë²„íŠ¼) ì¶œë ¥???£ì?(ê²€?€ ?¤ì„ )ê°€ ?¤ì œë¡?// ê·¸ë ¤ì§€?”ì? ê²€?€ ?½ì? ?˜ë¡œ ?ì • + ìº¡ì²˜ ???¼ì´ë¸??£ì? ?¤í????ìƒë³µêµ¬ ?•ì¸.
// ?¤í–‰: node scripts/pw-verify-png-export.mjs  (playwright-core, ?œë²„ 8000/3000 ê¸°ë™, ë§?6 ?œë“œ ?„ì œ)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const MIN_BLACK_PX = 2000; // 2Ã— ?´ìƒ?„ì—???£ì? 10ê°œë©´ ?˜ë§Œ ?½ì? ??ë³´ìˆ˜???˜í•œ

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1456, height: 900 } });
await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin.kim");
  window.localStorage.setItem("bpm.lang", "en");
  window.__png = null;
  const orig = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) { window.__png = this.href; return; }
    return orig.call(this);
  };
});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

// dataURL PNG??ê²€?€ ?½ì? ?????£ì? ?¤ì„  ì¡´ìž¬ ?ì •
const countBlack = (dataUrl) =>
  page.evaluate(async (url) => {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = img.width; canvas.height = img.height;
    const g = canvas.getContext("2d");
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, canvas.width, canvas.height).data;
    let black = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] < 40 && d[i + 1] < 40 && d[i + 2] < 40 && d[i + 3] > 200) black++;
    }
    return { black, width: img.width, height: img.height };
  }, dataUrl);

// ?€?€ ?ë””???´ë³´?´ê¸° ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
await page.goto("http://localhost:7000/maps/6", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".react-flow__edge", { state: "attached", timeout: 30000 });
await page.waitForTimeout(1500);
const strokeBefore = await page.evaluate(
  () => getComputedStyle(document.querySelector(".react-flow__edge-path")).stroke,
);
await page.keyboard.press("Control+Shift+E");
await page.waitForFunction(() => window.__png !== null, undefined, { timeout: 30000 });
const editorPng = await page.evaluate(() => window.__png);
const editor = await countBlack(editorPng);
await page.waitForTimeout(300);
const strokeAfter = await page.evaluate(
  () => getComputedStyle(document.querySelector(".react-flow__edge-path")).stroke,
);

// ?€?€ ë¹„êµ ?”ë©´ ?´ë³´?´ê¸° ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
await page.evaluate(() => { window.__png = null; });
await page.goto("http://localhost:7000/maps/6/compare", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".react-flow__edge", { state: "attached", timeout: 30000 });
await page.waitForTimeout(2000);
await page.getByRole("button", { name: "Export" }).click();
await page.waitForFunction(() => window.__png !== null, undefined, { timeout: 30000 });
const compare = await countBlack(await page.evaluate(() => window.__png));

const pass =
  editor.black > MIN_BLACK_PX &&
  compare.black > MIN_BLACK_PX &&
  strokeBefore === strokeAfter &&
  errors.length === 0;
console.log(
  JSON.stringify(
    { editor, compare, strokeRestored: strokeBefore === strokeAfter, consoleErrors: errors.length, pass },
    null,
    2,
  ),
);
await browser.close();
process.exit(pass ? 0 : 1);
