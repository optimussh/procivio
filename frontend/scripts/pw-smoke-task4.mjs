// Task 4 ?œê° ?¤ëª¨????subprocess ?¸ë“œê°€ ??ëª¨ì–‘ + ?¸ë“¤ë¡??Œë”?˜ëŠ”ì§€ ?œìŠ¤??Chrome?¼ë¡œ ?¤ì¸¡.
// ?¤í–‰: node scripts/pw-smoke-task4.mjs  (playwright-core --no-save ?¤ì¹˜ ?„ì œ, ?œë²„ 8000/3000 ê¸°ë™ ?„ì œ)
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
// React Flow ?¸ë“œê°€ ë¶™ì„ ?Œê¹Œì§€
await page.waitForSelector(".react-flow__node", { timeout: 30000 });
await page.waitForTimeout(1500); // ì¸¡ì •/?ˆì´?„ì›ƒ ?ˆì •??
const nodeTexts = await page.$$eval(".react-flow__node", (ns) => ns.map((n) => n.textContent?.trim() ?? ""));
const hasOrder = nodeTexts.some((t) => t.includes("ì£¼ë¬¸ ì²˜ë¦¬"));
const hasDeliver = nodeTexts.some((t) => t.includes("ë°°ì†¡"));

// subprocess ?¸ë“œ(ì£¼ë¬¸ ì²˜ë¦¬)???¸ë“¤ ????ì¢?input + ??source(??
const orderHandles = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll(".react-flow__node")];
  const order = nodes.find((n) => n.textContent?.includes("ì£¼ë¬¸ ì²˜ë¦¬"));
  if (!order) return null;
  const handles = [...order.querySelectorAll(".react-flow__handle")];
  return {
    total: handles.length,
    sources: handles.filter((h) => h.classList.contains("source")).length,
    targets: handles.filter((h) => h.classList.contains("target")).length,
  };
});

await page.screenshot({ path: "/tmp/bpm-task4-smoke.png", fullPage: false });
await browser.close();

console.log("nodeTexts:", JSON.stringify(nodeTexts));
console.log("hasOrder:", hasOrder, "hasDeliver:", hasDeliver);
console.log("orderHandles:", JSON.stringify(orderHandles));
console.log("consoleErrors:", errors.length, errors.slice(0, 5));

const ok = hasOrder && hasDeliver && orderHandles && orderHandles.targets >= 1 && orderHandles.sources >= 1;
console.log(ok ? "SMOKE PASS" : "SMOKE FAIL");
process.exit(ok ? 0 : 1);
