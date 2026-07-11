// Task 7 ?„ì† ?¤ëª¨?????¼ì¹¨ ì¤?ë£¨íŠ¸ ?œë˜ê·¸ê? ì»¤ì„œë¥?1:1ë¡?ì¶”ì¢…(???†ìŒ)?˜ê³ , ?¼ì¹œ ?„ë² ???ˆì¸ ??// ë¬´íš¨ ?œë¡­?€ ?ìœ„ì¹˜ë¡œ ì·¨ì†Œ?˜ëŠ”ì§€ ?¤ì¸¡. map 3?ì„œ c-order(ì£¼ë¬¸ ì²˜ë¦¬)ë¥??¼ì¹œ ??ë£¨íŠ¸ c-done(?´í–‰ ?„ë£Œ)??
//   (a) ?¼ì¹œ ?ˆì¸ xë°´ë“œ ?ˆìœ¼ë¡??œë˜ê·?ë¬´íš¨) ???œë˜ê·????œì‹œ transform?¼ë¡œ ë³µê? + ë¯¸ì˜??
//   (b) ?ˆì¸ ë°?ë¹??ì—­(?„ë˜)?¼ë¡œ ?œë˜ê·?? íš¨) ???œì‹œì¤‘ì‹¬??ì»¤ì„œ ?œë¡­??~?œë…¸?œí­ ?´ë‚´(?´ì¤‘?¬í”„???˜ë°±px ë¹—ë‚˜ê°?//       ë°©ì?) + ?ˆë¡œê³ ì¹¨ ???ì†.
// ì½˜ì†” ?ëŸ¬ 0.
//
// devUser: ?œì„± ì²´í¬?„ì›ƒ ë³´ìœ ??user.choi)ë¡??¤í–‰?œë‹¤. dev.db ?œë“œ??ì²´í¬?„ì›ƒ???†ì?ë§? ê°œë°œ PC?ì„œ ?¤ì œ
// ë¸Œë¼?°ì? ?¸ì…˜??user.choië¡?ì²´í¬?„ì›ƒ???¡ê³  ?ˆìœ¼ë©?admin?€ ?½ê¸°?„ìš©(?œë˜ê·?ë¶ˆê?)???œë‹¤. ì²´í¬?„ì›ƒ??ê°•íƒˆ?˜ë©´
// ?€ ?¸ì…˜???Šìœ¼ë¯€ë¡?ë¸Œë¼?°ì? ê²€ì¦?lesson: DB/???¤ì—¼ê³??¸ìš°ì§€ ë§?ê²?, ë³´ìœ ?ì? ?™ì¼ ?¬ìš©?ë¡œ ë¶™ì–´ ì¶©ëŒ ?†ì´
// ?¸ì§‘ ê°€???íƒœë¥??»ëŠ”?? ?œë“œë§??ˆëŠ” ê¹¨ë—???˜ê²½?ì„  ?„êµ¬ë¡?ë¶™ì–´??ì¦‰ì‹œ ì²´í¬?„ì›ƒ???ë“?˜ë?ë¡??™ì¼?˜ê²Œ ?™ì‘.
//
// ?¤í–‰: node scripts/pw-smoke-task7-drag.mjs  (playwright-core, ?œë²„ 8000/3000 ê¸°ë™ ?„ì œ)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const NODE_W_FLOW = 90; // process ?¸ë“œ ê·¼ì‚¬ ??flow) ??ë°????¸ë“œ???ì •??
const AUTOSAVE_WAIT = 2800; // AUTO_SAVE_DELAY_MS(2000) + PUT ?¬ìœ 

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.addInitScript(() => window.localStorage.setItem("bpm.devUser", "user.choi"));
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => {
  // RFê°€ ?œë“œ ?°ì´?°ì˜ "ì·¨ì†Œ" ë¶„ê¸° ?¸ë“¤??ëª?ë§Œë“ ?¤ëŠ” ?¬ì „ ì¡´ì¬ ê²½ê³ ??ë³?ë³€ê²½ê³¼ ë¬´ê? ??ì§‘ê³„ ?œì™¸.
  if (m.type() === "error" && !m.text().includes("Couldn't create edge for source handle")) {
    errors.push(m.text());
  }
});

const rdNode = (id) =>
  page.evaluate((nid) => {
    const el = document.querySelector(`.react-flow__node[data-id="${nid}"]`);
    if (!el) return null;
    const m = el.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px/);
    return { transform: el.style.transform, fx: +m[1], fy: +m[2] };
  }, id);

// ?¼ì¹œ ?„ë² ???ˆì¸???”ë©´ ?¬ê°????InlineRegionBandsê°€ ê·¸ë¦¬??accent ë³´ë” div.
const rdLaneScreen = () =>
  page.evaluate(() => {
    const portal =
      document.querySelector(".react-flow__viewport-portal") ||
      document.querySelector(".react-flow__viewport");
    const div = [...portal.querySelectorAll("div")].find(
      (d) => d.style.borderLeft && d.style.borderLeft.includes("accent"),
    );
    if (!div) return null;
    const r = div.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  });

async function expandAndZoom() {
  await page.evaluate(() =>
    document
      .querySelector('.react-flow__node[data-id="c-order"]')
      ?.querySelector("button[title]")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })),
  );
  await page.waitForTimeout(1800);
  const pane = await page.locator(".react-flow__pane").boundingBox();
  await page.mouse.move(pane.x + pane.width / 2, pane.y + pane.height / 2);
  await page.keyboard.down("Control");
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(70);
  }
  await page.keyboard.up("Control");
  await page.waitForTimeout(700);
}

await page.goto("http://localhost:7000/maps/3", { waitUntil: "domcontentloaded" });
await page.waitForSelector('.react-flow__node[data-id="c-done"]', { timeout: 30000 });
await page.waitForTimeout(2500);

const editable = await page.evaluate(() =>
  document.querySelector('.react-flow__node[data-id="c-start"]').classList.contains("draggable"),
);
if (!editable) {
  console.log("NOT EDITABLE (read-only) ??checkout held by another user; cannot exercise drag.");
  await browser.close();
  process.exit(1);
}

// ?¼ì¹¨ ???€?¥ì¢Œ???œì‹œì¢Œí‘œ) c-done ?„ì¹˜ë¥?ë¬´íš¨-?œë¡­ ë¯¸ì˜??ë¹„êµ??ê¸°ì??¼ë¡œ ìº¡ì²˜ ??DB ?œë“œ/?´ì „ ?¤í–‰??ë¬´ê??˜ê²Œ ë©±ë“±.
const savedBaseline = await rdNode("c-done");
console.log("c-done saved baseline (pre-expand):", JSON.stringify({ fx: savedBaseline.fx, fy: savedBaseline.fy }));

await expandAndZoom();
const lane = await rdLaneScreen();
if (!lane) {
  console.log("NO LANE FOUND ??expansion did not render embed region.");
  await browser.close();
  process.exit(1);
}
console.log("lane screen x-band:", JSON.stringify({ left: Math.round(lane.left), right: Math.round(lane.right) }));

// ===== (a) ë¬´íš¨ ?œë¡­ ???ˆì¸ xë°´ë“œ ?ˆìœ¼ë¡? ?œë˜ê·???transform ê¸°ë¡ ??ë³µê? ?•ì¸ =====
const preInvalid = await rdNode("c-done");
const boxI = await page.locator('.react-flow__node[data-id="c-done"]').boundingBox();
const startIx = boxI.x + boxI.width / 2;
const startIy = boxI.y + boxI.height / 2;
// ëª©í‘œ ?”ë©´?? ?ˆì¸ ê°€ë¡?ì¤‘ì•™, ?¸ë¡œ???ˆì¸ ?„ìª½ ë¹?ê³µê°„(?¤ë¥¸ ?¸ë“œ?€ ê²¹ì³ zone-drop ë§ì´ ?¨ì? ?Šê²Œ ì¶©ë¶„???„ë¡œ).
const invX = (lane.left + lane.right) / 2;
const invY = Math.max(lane.top + 30, startIy - 160);
await page.mouse.move(startIx, startIy);
await page.mouse.down();
await page.mouse.move((startIx + invX) / 2, (startIy + invY) / 2, { steps: 8 });
await page.mouse.move(invX, invY, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(800);
const afterInvalid = await rdNode("c-done");
const reverted = afterInvalid.transform === preInvalid.transform;
console.log(
  "invalid drop: pre=",
  preInvalid.transform,
  "after=",
  afterInvalid.transform,
  "reverted=",
  reverted,
);

// ë¬´íš¨ ë¯¸ì˜?????”ë°”?´ìŠ¤ ê²½ê³¼ ?„ì—???€??ì¢Œí‘œê°€ ??ë°”ë€Œì—ˆ?”ì?: ?ˆë¡œê³ ì¹¨ ???¼ì¹¨ ??ê¸°ì?ì¢Œí‘œë¡?ë³µê?.
await page.waitForTimeout(AUTOSAVE_WAIT);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector('.react-flow__node[data-id="c-done"]', { timeout: 30000 });
await page.waitForTimeout(2500);
const reloadAfterInvalid = await rdNode("c-done"); // ?¼ì¹¨ ?„ì´???€?¥ì¢Œ??ê·¸ë?ë¡??œì‹œ
const invalidNotPersisted =
  Math.abs(reloadAfterInvalid.fx - savedBaseline.fx) < NODE_W_FLOW &&
  Math.abs(reloadAfterInvalid.fy - savedBaseline.fy) < NODE_W_FLOW;
console.log(
  "invalid drop NOT persisted (back at pre-drag saved baseline):",
  invalidNotPersisted,
  "(reload fx=" +
    Math.round(reloadAfterInvalid.fx) +
    " fy=" +
    Math.round(reloadAfterInvalid.fy) +
    " baseline fx=" +
    Math.round(savedBaseline.fx) +
    " fy=" +
    Math.round(savedBaseline.fy) +
    ")",
);

// ===== (b) ? íš¨ ?œë¡­ ???ˆì¸ ë°??„ë˜) ë¹??ì—­. ì»¤ì„œ ì¶”ì¢… + ?ì† =====
await expandAndZoom();
const boxV = await page.locator('.react-flow__node[data-id="c-done"]').boundingBox();
const startVx = boxV.x + boxV.width / 2;
const startVy = boxV.y + boxV.height / 2;
// ?”ë©´?ì„œ ?„ë˜ë¡?100px ?´ë™(x ? ì? ???ˆì¸ ?°ì¸¡ ? ì?). ì¤?0.2?´ë¼ 100px??00flow.
const dropVx = startVx;
const dropVy = startVy + 100;
await page.mouse.move(startVx, startVy);
await page.mouse.down();
await page.mouse.move(startVx, (startVy + dropVy) / 2, { steps: 8 });
await page.mouse.move(dropVx, dropVy, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(800);
const afterValid = await rdNode("c-done");
// ?œì‹œì¤‘ì‹¬??ì»¤ì„œ ?œë¡­ ?”ë©´?ì— ?€?‘í•˜?”ì? ???œë¡­???¸ë“œ???”ë©´ ë°•ìŠ¤ ì¤‘ì‹¬ê³?ë§ˆìš°??up ì§€??ë¹„êµ(ë°˜ë…¸?œí­ ?”ë©´).
const landedBox = await page.locator('.react-flow__node[data-id="c-done"]').boundingBox();
const landedCx = landedBox.x + landedBox.width / 2;
const landedCy = landedBox.y + landedBox.height / 2;
const screenMiss = Math.hypot(landedCx - dropVx, landedCy - dropVy);
const followOk = screenMiss <= 30; // ì¤?.2?ì„œ ???¸ë“œ??‰ˆ18px ?”ë©´ ??30px ?¬ìœ . ?´ì¤‘?¬í”„?¸ë©´ ~180px(908flow*0.2) ë¹—ë‚˜ê°?
console.log(
  "valid drop: display flow",
  JSON.stringify({ fx: afterValid.fx, fy: afterValid.fy }),
  "screen-miss(px)=",
  Math.round(screenMiss),
  "followOk=",
  followOk,
);

// ?ì† ???ˆë¡œê³ ì¹¨ ??y ?´ë™ë¶?ë°˜ì˜(?€?¥ì¢Œ??= ?œì‹œ ??offset, x??800?€ ? ì?, y??+500flow ê·¼ì²˜).
await page.waitForTimeout(AUTOSAVE_WAIT);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector('.react-flow__node[data-id="c-done"]', { timeout: 30000 });
await page.waitForTimeout(2500);
const reloadAfterValid = await rdNode("c-done");
// ?¼ì¹¨ ???œì‹œ=?€?¥ì¢Œ?? ? íš¨ ?œë¡­?€ ?„ë˜ë¡??´ë™?ˆìœ¼?? ?ˆë¡œê³ ì¹¨ ???€??yê°€ ?œë¡­ ??ê¸°ì?? ë³´???•ì‹¤??ì»¤ì¡Œ?¼ë©´ ?ì†.
const persisted = reloadAfterValid.fy > savedBaseline.fy + NODE_W_FLOW;
console.log(
  "valid drop persisted after reload:",
  persisted,
  "(reload fy=" +
    Math.round(reloadAfterValid.fy) +
    " > baseline fy=" +
    Math.round(savedBaseline.fy) +
    " + node-width)",
);

await page.screenshot({ path: "/tmp/bpm-task7-drag.png", fullPage: false });
console.log("consoleErrors:", errors.length, errors.slice(0, 3));
await browser.close();

const pass = reverted && invalidNotPersisted && followOk && persisted && errors.length === 0;
console.log(pass ? "PASS" : "FAIL");
if (!pass) process.exit(1);
