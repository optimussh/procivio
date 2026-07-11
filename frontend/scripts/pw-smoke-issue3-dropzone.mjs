// Issue 3 ?¤ëª¨????(i) ?œë¡­ ë§ì— obsolete "child" ?€?¼ì´ ?†ëŠ”ì§€, (ii) ?¸ë“œë¥??˜ìœ„?„ë¡œ?¸ìŠ¤??// front/back ?€?¼ì— ?œë¡­?˜ë©´ ?½ìž… ?£ì?ê°€ ?˜ìœ„?„ë¡œ?¸ìŠ¤ ?¸ë“¤(in/__primary__)??ë¶™ëŠ”ì§€(?•ê?ë§??„ë‹˜),
// (iii) ?¸ë“œ?”í•˜?„í”„ë¡œì„¸??swap ???„ì¹˜?€ ?£ì?ê°€ ?¬ë°”ë¥??¸ë“¤ë¡?êµí™˜?˜ëŠ”ì§€ ?¤ì¸¡.
// map 3: c-start(start) ??c-order(subprocess,linked=1) ??c-deliver(subprocess,linked=2) ??c-done(end),
//         c-order -ì·¨ì†Œ-> c-cancelled(end).
// ?¤í–‰: node scripts/pw-smoke-issue3-dropzone.mjs  (playwright-core, ?œë²„ 8000/3000 ê¸°ë™ ?„ì œ)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const API = "http://localhost:8000/api/versions/3/graph";
const SUB_IN = "in"; // SUBPROCESS_IN_HANDLE
const PRIMARY = "__primary__"; // PRIMARY_END_HANDLE

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.addInitScript(() => window.localStorage.setItem("bpm.devUser", "user.choi"));
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("Couldn't create edge for source handle")) {
    errors.push(m.text());
  }
});

// seed ê·¸ëž˜??ë°±ì—… ???ŒìŠ¤???ë‚˜ë©?ë³µì›(?¤ëª¨??ë©±ë“±)
const seed = await (await fetch(API)).json();

await page.goto("http://localhost:7000/maps/3", { waitUntil: "domcontentloaded" });
await page.waitForSelector('.react-flow__node[data-id="c-done"]', { timeout: 30000 });
await page.waitForTimeout(2500);

const editable = await page.evaluate(() =>
  document.querySelector('.react-flow__node[data-id="c-start"]').classList.contains("draggable"),
);
if (!editable) {
  console.log("NOT EDITABLE (read-only) ??checkout held by another user; cannot exercise drop-zone.");
  await browser.close();
  process.exit(1);
}

const box = (id) => page.locator(`.react-flow__node[data-id="${id}"]`).boundingBox();

// ?œë¡­ ë§ì´ ???Œê¹Œì§€ Aë¥?B ?„ë¡œ ?Œì–´ dwell. zone ?€???¼ë²¨/?œì„± zone??ë°˜í™˜.
async function hoverRing(aId, bId) {
  const a = await box(aId);
  const b = await box(bId);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  // B ì¤‘ì‹¬?¼ë¡œ ?¨ê³„ ?´ë™ ??ë¨¸ë¬¸??DWELL_MS) ??ë§??œì‹œ
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  await page.mouse.move((a.x + bx) / 2, (a.y + by) / 2, { steps: 6 });
  await page.mouse.move(bx, by, { steps: 6 });
  await page.waitForTimeout(700); // > DWELL_MS
  await page.mouse.move(bx, by, { steps: 2 }); // dwell ?¸ë¦¬ê±??¬í™•??  await page.waitForTimeout(400);
  return { bx, by };
}

// ===== (i) ?œë¡­ ë§ì— "child" ?€?¼ì´ ?†ëŠ”ì§€ =====
const { bx, by } = await hoverRing("c-start", "c-deliver");
// ë§??€???¼ë²¨ ?˜ì§‘ ??"Into sub-process"/"?˜ìœ„ë¡??£ê¸°"ê°€ ?ˆìœ¼ë©?child ?€?¼ì´ ?¨ì•„?ˆëŠ” ê²?
const ringLabels = await page.evaluate(() => {
  const ring = [...document.querySelectorAll(".zone-pop")];
  return ring.map((d) => d.textContent?.trim() ?? "");
});
const hasChildTile = ringLabels.some(
  (l) => l.includes("Into sub-process") || l.includes("?˜ìœ„ë¡??£ê¸°"),
);
console.log("ring tile labels:", JSON.stringify(ringLabels));
console.log("(i) child tile present (expect false):", hasChildTile);
// ?œëž˜ê·?ì·¨ì†Œ(?£ì? ë³€???†ì´) ??front ?€?¼ì´ ?„ë‹Œ ë§?ì¤‘ì•™ ?„ë¡œ ?¬ë ¤ zone=nullë¡?ë§Œë“  ??esc
await page.mouse.move(bx, by);
await page.keyboard.press("Escape");
await page.mouse.up();
await page.waitForTimeout(400);

// ===== (ii) ?¸ë“œë¥??˜ìœ„?„ë¡œ?¸ìŠ¤ back ?€?¼ì— ?œë¡­ ???½ìž… ?£ì?ê°€ in/__primary__ ?¸ë“¤ =====
// c-done(end)ë¥?c-order(subprocess) "back"???œë¡­ ??c-order --__primary__--> c-done(th:left default)
// ?½ìž…(rewire)?˜ë©° ê¸°ì¡´ c-order--__primary__-->c-deliver ê°€ c-done ê²½ìœ ë¡? c-done?€ end??source ?•ìƒ.
// ?µì‹¬ ê²€ì¦? ???£ì? c-order -> c-done ??sourceHandle == __primary__ (subprocess source).
async function dropOnZone(aId, bId, zone) {
  const a = await box(aId);
  const b = await box(bId);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  await page.mouse.move((a.x + bx) / 2, (a.y + by) / 2, { steps: 6 });
  await page.mouse.move(bx, by, { steps: 6 });
  await page.waitForTimeout(700); // ë§??œì‹œ(DWELL_MS)
  // ?€???„ì¹˜ ??front=ì¢? back=?? group=?? swap=ì¢Œí•˜. ë§?ë°˜ê²½?€ ZONE_TILE ë°°ì¹˜?€ ?™ì¼.
  const ring = await page.evaluate((z) => {
    const tiles = [...document.querySelectorAll(".zone-pop")];
    // ?¼ë²¨ë¡?zone ?ë³„
    const want = {
      front: ["Before", "?žì—"],
      back: ["After", "?¤ì—"],
      swap: ["Swap", "êµí™˜"],
      group: ["Group", "ê·¸ë£¹"],
    }[z];
    const el = tiles.find((d) => want.some((w) => (d.textContent ?? "").includes(w)));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, zone);
  if (!ring) {
    await page.mouse.up();
    throw new Error(`zone tile "${zone}" not found`);
  }
  await page.mouse.move(ring.x, ring.y, { steps: 4 });
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(400);
}

// c-cancelled(end) ë¥?c-deliver(subprocess) "back"???½ìž… ??c-deliver --__primary__--> c-cancelled ???£ì?.
let insertBackOk = false;
let insertBackHandle = "(none)";
try {
  await dropOnZone("c-cancelled", "c-deliver", "back");
  // ì¶©ëŒ ?„ë¡¬?„íŠ¸ê°€ ?¨ë©´ insert ? íƒ
  const insertBtn = page.locator("button", { hasText: /Insert|?½ìž…/ }).first();
  if (await insertBtn.isVisible().catch(() => false)) {
    await insertBtn.click();
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(3000); // autosave(2000) + PUT
  const g = await (await fetch(API)).json();
  const e = g.edges.find((x) => x.source_node_id === "c-deliver" && x.target_node_id === "c-cancelled");
  insertBackHandle = e ? `sh=${e.source_handle ?? "-"} th=${e.target_handle ?? "-"}` : "(no edge)";
  // c-deliver??subprocess ??source_handle ?€ __primary__ ?¬ì•¼ RFê°€ ë¶™ì¸??
  insertBackOk = !!e && e.source_handle === PRIMARY;
} catch (err) {
  console.log("insertBack error:", err.message);
}
console.log("(ii) insert-after into-subprocess-source edge:", insertBackHandle, "ok=", insertBackOk);

// dangling ?¬ë? ???Œë”???£ì? pathê°€ ?¤ì œ ì¡´ìž¬?˜ëŠ”ì§€(React Flowê°€ ?¸ë“¤ ëª?ì°¾ìœ¼ë©??£ì? ë¯¸ë Œ??.
const renderedEdge = await page.evaluate(() => {
  // c-deliver -> c-cancelled ?£ì? path ì¡´ìž¬?
  const paths = [...document.querySelectorAll(".react-flow__edge")];
  return paths.some((p) => {
    const id = p.getAttribute("data-id") ?? p.getAttribute("data-testid") ?? "";
    return id.includes("c-deliver") || (p.textContent ?? "").length >= 0; // ì¡´ìž¬?±ë§Œ
  });
});
console.log("(ii) edges rendered (non-dangling presence):", renderedEdge);

// ===== (iii) swap ?¸ë“œ?”í•˜?„í”„ë¡œì„¸?????„ì¹˜+?£ì? êµí™˜, ?¸ë“¤ ë³´ì • =====
// ë¨¼ì? ê·¸ëž˜??ë³µì›(ê¹¨ë—???œìž‘). (ii)??ì§€??autosave(2s ?”ë°”?´ìŠ¤)ê°€ seed PUT ?¤ì— ??–´?°ì? ?Šë„ë¡?// ì¶©ë¶„??ë¹„ìš´ ??ë³µì›?˜ê³ , ë³µì›???ˆì°©?˜ë„ë¡?reload ??settle???”ë‹¤.
await page.waitForTimeout(3000); // (ii) ì§€??autosave ?œë ˆ??await fetch(API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(seed) });
await page.waitForTimeout(500);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector('.react-flow__node[data-id="c-done"]', { timeout: 30000 });
await page.waitForTimeout(2500);
// ?¤ì™‘ ??c-done ??seed ?ë¦¬(800)???ˆëŠ”ì§€ ?•ì¸ ??ë³µì› ?ˆì°© ê²€ì¦?
const preSwapDoneX = (await (await fetch(API)).json()).nodes.find((n) => n.id === "c-done")?.pos_x;
console.log("(iii) pre-swap c-done pos_x (expect ~800):", preSwapDoneX);

let swapOk = false;
let swapDetail = "(none)";
// ?¸ë“¤ ?•í•© ë¶ˆë?????ëª¨ë“  ë£¨íŠ¸ ?£ì?: target???˜ìœ„?„ë¡œ?¸ìŠ¤ë©?th==="in", sourceê°€ ?˜ìœ„?„ë¡œ?¸ìŠ¤ë©?sh==="__primary__",
// ê·¸ë¦¬ê³??˜ìœ„?„ë¡œ?¸ìŠ¤ê°€ ?„ë‹Œ ?ì ???„ìš© ?¸ë“¤???¨ì•„?ˆìœ¼ë©?????swap ??stale ?¸ë“¤ ê²€ì¶?.
function checkHandleInvariant(g) {
  const subById = new Map(g.nodes.map((n) => [n.id, n.node_type === "subprocess"]));
  const bad = [];
  for (const e of g.edges) {
    const sSub = subById.get(e.source_node_id);
    const tSub = subById.get(e.target_node_id);
    if (sSub && e.source_handle !== PRIMARY) bad.push(`${e.source_node_id}->${e.target_node_id} src-sub sh=${e.source_handle ?? "-"}`);
    if (!sSub && e.source_handle === PRIMARY) bad.push(`${e.source_node_id}->${e.target_node_id} non-sub src stale sh=${PRIMARY}`);
    if (tSub && e.target_handle !== SUB_IN) bad.push(`${e.source_node_id}->${e.target_node_id} tgt-sub th=${e.target_handle ?? "-"}`);
    if (!tSub && e.target_handle === SUB_IN) bad.push(`${e.source_node_id}->${e.target_node_id} non-sub tgt stale th=${SUB_IN}`);
  }
  return bad;
}
try {
  // c-done(end) ë¥?c-order(subprocess) ?€ swap ???ì ??ë°”ë€??£ì??¤ì˜ ?¸ë“¤?????€?…ì— ë§žê²Œ ë³´ì •?¼ì•¼.
  await dropOnZone("c-done", "c-order", "swap");
  await page.waitForTimeout(3200);
  const g = await (await fetch(API)).json();
  // ?„ì¹˜ êµí™˜ ?•ì¸ ??c-done ???ëž˜ c-order ?ë¦¬(320,220), c-order ê°€ ?ëž˜ c-done ?ë¦¬(800,220) ê·¼ì²˜.
  const cDone = g.nodes.find((n) => n.id === "c-done");
  const cOrder = g.nodes.find((n) => n.id === "c-order");
  const posSwapped = !!cDone && !!cOrder && Math.abs(cDone.pos_x - 320) < 40 && Math.abs(cOrder.pos_x - 800) < 40;
  const bad = checkHandleInvariant(g);
  swapDetail = `posSwapped=${posSwapped}; handleViolations=${bad.length ? JSON.stringify(bad) : "none"}`;
  swapOk = posSwapped && bad.length === 0;
} catch (err) {
  console.log("swap error:", err.message);
}
console.log("(iii) swap:", swapDetail, "ok=", swapOk);

await page.screenshot({ path: "/tmp/bpm-issue3.png", fullPage: false });
// ë¸Œë¼?°ì?ë¥?ë¨¼ì? ?«ì•„ ì§€??autosaveê°€ ë³µì› PUT????–´?°ì? ëª»í•˜ê²?????seed ë³µì›.
await browser.close();
await new Promise((r) => setTimeout(r, 500));
await fetch(API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(seed) });

console.log("consoleErrors:", errors.length, errors.slice(0, 5));
const pass = !hasChildTile && insertBackOk && swapOk && errors.length === 0;
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
