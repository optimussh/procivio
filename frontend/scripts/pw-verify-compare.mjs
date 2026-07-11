// ?µí•© ë¹„êµ ?”ë©´ ê²€ì¦????¨ì¼ ë³‘í•© ìº”ë²„???Œë” + diff ???œë“œ ?¤ë¼??added1/removed1/changed2) +
// dev-auth ?ˆì´???˜ì •(GET /maps/{id} 200) + ë³€ê²½ëª©ë¡??´ë¦­ ?¬ì»¤??
// ?¤í–‰: node scripts/pw-verify-compare.mjs  (playwright-core, ?œë²„ 8000/3000 ê¸°ë™ + reset_db ?œë“œ ?„ì œ)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext();
// dev ë¡œê·¸???°íšŒ ??DevGateê°€ ?½ëŠ” localStorage ??? ì£¼??sysadmin=admin)
await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin");
});

// ë¹„êµ ?°ëª¨ ë§?id ì°¾ê¸° (admin ?¤ë”ë¡?API ì§ì ‘ ì¡°íšŒ)
const apiRes = await ctx.request.get("http://localhost:7000/api/maps", {
  headers: { "X-Dev-User": "admin" },
});
const maps = await apiRes.json();
const demo =
  maps.find((m) => /comparison/i.test(m.name)) ??
  maps.find((m) => /as-is|to-be/i.test(m.name));
if (!demo) {
  console.log(JSON.stringify({ ok: false, reason: "compare demo map not found", maps: maps.map((m) => m.name) }, null, 2));
  await browser.close();
  process.exit(1);
}

const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
let mapStatus = null;
page.on("response", (r) => {
  if (r.url().endsWith(`/api/maps/${demo.id}`)) mapStatus = r.status();
});

await page.goto(`http://localhost:7000/maps/${demo.id}/compare`, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".react-flow__node", { timeout: 30000 });
await page.waitForTimeout(1500);

const counts = await page.evaluate(() => ({
  nodes: document.querySelectorAll(".react-flow__node").length,
  ringAdded: document.querySelectorAll(".ring-added").length,
  ringRemoved: document.querySelectorAll(".ring-removed").length,
  ringChanged: document.querySelectorAll(".ring-changed").length,
  edges: document.querySelectorAll(".react-flow__edge").length,
  changeItems: document.querySelectorAll('[data-id="compare-changes"] li').length,
  changesText: document.querySelector('[data-id="compare-changes"]')?.innerText ?? "",
  panes: document.querySelectorAll(".react-flow").length, // ?¨ì¼ ìº”ë²„?¤ë©´ 1
}));

// ?´ë¦­ ?¬ì»¤????ì²?ë³€ê²???ª© ?´ë¦­ ??ë·°í¬??transform ë³€???•ì¸
const vpBefore = await page.evaluate(
  () => document.querySelector(".react-flow__viewport")?.style.transform ?? "",
);
let focusWorked = false;
const firstItem = page.locator('[data-id="compare-changes"] li button').first();
if ((await firstItem.count()) > 0) {
  await firstItem.click();
  await page.waitForTimeout(700);
  const vpAfter = await page.evaluate(
    () => document.querySelector(".react-flow__viewport")?.style.transform ?? "",
  );
  focusWorked = vpBefore !== vpAfter;
}

console.log(
  JSON.stringify(
    { ok: true, mapId: demo.id, mapName: demo.name, mapStatus, counts, focusWorked, errors },
    null,
    2,
  ),
);
await browser.close();
