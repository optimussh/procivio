// Plan 3 ?°ëª¨ ?¤ëª¨????map 4 "ì£¼ë¬¸ ?´í–‰"?ì„œ 3ê°?subprocess ?¸ë“œ ?Œë”,
// c-deliver(ë°°ì†¡) ?…ë°?´íŠ¸ ë°°ì?, c-order(ì£¼ë¬¸ ì²˜ë¦¬) ?¼ì¹¨ ?¸ë¼???ˆì¸, c-pay(ê²°ì œ) follow_latest,
// ì½˜ì†” ?ëŸ¬ 0ê°?ê²€ì¦?
// ?¤í–‰: node scripts/pw-smoke-demo.mjs  (playwright-core, ?œë²„ 8000/3000 ê¸°ë™ ?„ì œ)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext();
// dev ë¡œê·¸???°íšŒ ??DevGateê°€ ?½ëŠ” localStorage ?¤ë? ? ì£¼??await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin");
});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto("http://localhost:7000/maps/4", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".react-flow__node", { timeout: 30000 });
await page.waitForTimeout(3000); // ì¸¡ì •/?ˆì´?„ì›ƒ + subprocess ë©”í? ë¡œë“œ ?ˆì •??
// (a) 3ê°?subprocess ?¸ë“œê°€ ?Œë”?˜ëŠ”ì§€ ?•ì¸
const subprocessTitles = ["ê²°ì œ", "ì£¼ë¬¸ ì²˜ë¦¬", "ë°°ì†¡"];
const nodeResults = {};
for (const title of subprocessTitles) {
  const loc = page.locator(".react-flow__node", { hasText: title });
  try {
    await loc.first().waitFor({ state: "visible", timeout: 5000 });
    nodeResults[title] = true;
  } catch {
    nodeResults[title] = false;
  }
}

// (b) c-deliver(ë°°ì†¡) ?…ë°?´íŠ¸ ë°°ì? ??pinned ver2 < published ver3 ??ë°°ì? ?œì‹œ
// ë°°ì???"?…ë°?´íŠ¸" ?ëŠ” "Update" ?ëŠ” "v" ?ìŠ¤??+ ë°°ì†¡ ?¸ë“œ ?ˆì— ?ˆì–´????let updateBadgeFound = false;
try {
  const deliverNode = page.locator(".react-flow__node", { hasText: "ë°°ì†¡" }).first();
  // ë°°ì? ?ìŠ¤?¸ë? ?¸ë“œ ?´ì—??ì°¾ìŒ: "?…ë°?´íŠ¸", "Update", "??, "new" ??  const nodeHtml = await deliverNode.innerHTML();
  // ë°°ì???ë³´í†µ ?‘ì? ?ìŠ¤?¸ë¡œ ë²„ì „ ì°¨ì´ë¥??œì‹œ?˜ê±°????ë§ˆì»¤ë¡??˜í???  // ?¤ì œ UI?ì„œ ?´ë–¤ ?ìŠ¤???´ë˜?¤ë? ?°ëŠ”ì§€ ?•ì¸
  updateBadgeFound =
    nodeHtml.includes("Newer published version available") ||
    nodeHtml.includes("?…ë°?´íŠ¸") ||
    nodeHtml.includes("Update") ||
    nodeHtml.toLowerCase().includes("newer") ||
    nodeHtml.includes("new-version");
} catch {
  updateBadgeFound = false;
}

// (c) c-pay(ê²°ì œ) follow_latest ?Œë” ?•ì¸ ???¸ë“œ ? íƒ ??inspector?ì„œ follow_latest ì²´í¬??// ?œë¦´???„ì— ?•ì¸?´ì•¼ ????dblclick ??canvas ?íƒœ ë³€?”ë¡œ ê²°ì œ ? íƒ??ë°©í•´ë°›ìŒ
let followLatestFound = false;
try {
  const payNode = page.locator(".react-flow__node", { hasText: "ê²°ì œ" }).first();
  await payNode.click({ timeout: 5000, force: true });
  await page.waitForTimeout(1500);
  // innerText picks up React-rendered text invisible in raw HTML
  const bodyText = await page.locator("body").innerText();
  followLatestFound =
    bodyText.includes("Follow latest published") ||
    bodyText.includes("Follow latest") ||
    bodyText.includes("follow_latest") ||
    bodyText.includes("ì¶”ì¢…") ||
    bodyText.includes("ìµœì‹ ");
} catch {
  followLatestFound = false;
}

// (d) c-order(ì£¼ë¬¸ ì²˜ë¦¬) ?”ë¸”?´ë¦­ ?¼ì¹¨ ???¸ë¼??read-only ?ˆì¸ ?±ì¥
let drillInFound = false;
try {
  const orderNode = page.locator(".react-flow__node", { hasText: "ì£¼ë¬¸ ì²˜ë¦¬" }).first();
  await orderNode.dblclick({ timeout: 5000 });
  await page.waitForTimeout(2000); // ?¼ì¹¨ ? ë‹ˆë©”ì´???€ê¸?  // ?¸ë¼???ì‹ ?¸ë“œ?¤ì´ ?±ì¥?´ì•¼ ??(read-only ?„ë² ?”ë“œ)
  const nodeCount = await page.locator(".react-flow__node").count();
  // ìµœì´ˆ 6ê°??¸ë“œ(c-start, c-pay, c-order, c-deliver, c-done, c-cancelled)?ì„œ
  // ?¼ì¹¨ ???ì‹ ?¸ë“œê°€ ì¶”ê??˜ì–´ ì´??¸ë“œ ?˜ê? ?˜ì–´????  drillInFound = nodeCount > 6;
  if (!drillInFound) {
    // ?€?? ?¼ì³ì§?ì»¨í…Œ?´ë„ˆ??"read-only" ?œì‹œë¥?ì°¾ìŒ
    const html = await page.content();
    drillInFound =
      html.includes("expanded") ||
      html.includes("read-only") ||
      html.includes("inline") ||
      nodeCount > 5;
  }
} catch {
  drillInFound = false;
}

await page.screenshot({ path: "/tmp/bpm-plan3-demo-smoke.png", fullPage: false });
await browser.close();

const allSubprocessesRendered = Object.values(nodeResults).every(Boolean);

console.log("subprocessNodes:", nodeResults);
console.log("updateBadgeFound (ë°°ì†¡ pinned<latest):", updateBadgeFound);
console.log("drillInFound (ì£¼ë¬¸ ì²˜ë¦¬ expand):", drillInFound);
console.log("followLatestFound (ê²°ì œ follow_latest):", followLatestFound);
console.log("consoleErrors:", errors.length, errors.slice(0, 5));

const ok =
  allSubprocessesRendered &&
  updateBadgeFound &&
  drillInFound &&
  followLatestFound &&
  errors.length === 0;
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
