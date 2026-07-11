// Issue 1 ?¤ëª¨?????¼ì¹¨ ?ì—­??ê°€ë¡œì§ˆ???°â†’ì¢? ë£¨íŠ¸ ?¸ë“œë¥??œë˜ê·¸í•´ ë¹?ê³µê°„???œë¡­?˜ë©´ ?œë¡­ ì§€?ì—
// ?•í™•???ˆì°©?˜ëŠ”ì§€(?œë˜ê·??œì‘ ?¤í”„?‹ì´ ?„ë‹Œ ?œë¡­ ?„ì¹˜ ?¤í”„?‹ìœ¼ë¡??˜ì‚°) ?¤ì¸¡.
// map 3?ì„œ c-order(ì£¼ë¬¸ ì²˜ë¦¬)ë¥??¼ì¹˜ë©?ê·??¤ë¥¸ìª½ì— ?„ë² ???ˆì¸???ê¸´?? ë£¨íŠ¸ c-done(?´í–‰ ?„ë£Œ, ?ˆì¸ ?°ì¸¡)??// ?ˆì¸ ?¼ìª½ ë¹?ê³µê°„?¼ë¡œ ?Œì–´ ?œë¡­ ???œì‹œì¤‘ì‹¬??ì»¤ì„œ ?œë¡­??~ë°˜ë…¸?œí­(?”ë©´) ?´ë‚´?¬ì•¼. ë²„ê·¸ë©??œë¡­ ì§í›„ ?¸ë“œê°€
// footprint(?˜ë°± flow)ë§Œí¼ ?¼ìª½?¼ë¡œ ?„ë‹¤(savedë¥??œì‘?¤í”„?‹ìœ¼ë¡??˜ì‚° ???¬íŒŒ???œì‹œê°€ ë¹—ë‚˜ê°?. ?ˆë¡œê³ ì¹¨ ?„ë„ ?ì† ?¼ì¹˜.
// ì½˜ì†” ?ëŸ¬ 0.  devUser: user.choi(ì²´í¬?„ì›ƒ ë³´ìœ ?? ??task7-drag?€ ?™ì¼.
// ?¤í–‰: node scripts/pw-smoke-issue1-crossdrag.mjs  (playwright-core, ?œë²„ 8000/3000 ê¸°ë™ ?„ì œ)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AUTOSAVE_WAIT = 2800;

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

const rdNode = (id) =>
  page.evaluate((nid) => {
    const el = document.querySelector(`.react-flow__node[data-id="${nid}"]`);
    if (!el) return null;
    const m = el.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px/);
    return { fx: +m[1], fy: +m[2] };
  }, id);

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

await expandAndZoom();
const lane = await rdLaneScreen();
if (!lane) {
  console.log("NO LANE FOUND ??expansion did not render embed region.");
  await browser.close();
  process.exit(1);
}
console.log("lane screen x-band:", JSON.stringify({ left: Math.round(lane.left), right: Math.round(lane.right) }));

// c-done(?ˆì¸ ?°ì¸¡) ???ˆì¸ ?¼ìª½ ë¹?ê³µê°„?¼ë¡œ ?œë˜ê·???ê²½ê³„ë¥??°â†’ì¢Œë¡œ ê°€ë¡œì?ë¥¸ë‹¤.
const boxD = await page.locator('.react-flow__node[data-id="c-done"]').boundingBox();
const startX = boxD.x + boxD.width / 2;
const startY = boxD.y + boxD.height / 2;
// ëª©í‘œ: ?ˆì¸ ?¼ìª½?¼ë¡œ ì¶©ë¶„???ˆì¸ left ë³´ë‹¤ 100px ???¼ìª½), ?¸ë¡œ???„ë¡œ ?´ì§(?¤ë¥¸ ?¸ë“œ/ì¡´ë§ ?Œí”¼).
const dropX = Math.max(lane.left - 120, 60);
const dropY = Math.max(startY - 140, lane.top + 20);
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.mouse.move((startX + dropX) / 2, (startY + dropY) / 2, { steps: 10 });
await page.mouse.move(dropX, dropY, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(900);

// ?œë¡­ ì§í›„ ?œì‹œì¤‘ì‹¬??ì»¤ì„œ ?œë¡­?ì— ?€?? (ë°˜ë…¸?œí­ ?”ë©´ ?´ë‚´) ??ë²„ê·¸ë©?footprint*zoom ë§Œí¼ ?¼ìª½?¼ë¡œ ??
const landedBox = await page.locator('.react-flow__node[data-id="c-done"]').boundingBox();
const landedCx = landedBox.x + landedBox.width / 2;
const landedCy = landedBox.y + landedBox.height / 2;
const screenMiss = Math.hypot(landedCx - dropX, landedCy - dropY);
const followOk = screenMiss <= 30; // ì¤Œâ‰ˆ0.2 ?????¸ë“œ??‰ˆ18px. footprint(~900flow)ë©?~180px ë¹—ë‚˜ê°?
console.log(
  "cross-boundary drop: landed screen center vs cursor ??miss(px)=",
  Math.round(screenMiss),
  "followOk=",
  followOk,
  "(landed cx=" + Math.round(landedCx) + " dropX=" + Math.round(dropX) + ")",
);

// ?ì† ???ˆë¡œê³ ì¹¨ ???¼ì¹¨ ? ì? ???? ?€?¥ì¢Œ???œì‹œ) c-done ?œì‹œ xê°€ ?ˆì¸ ?¼ìª½(?œë¡­??ìª??¸ì?: c-start(80)ë³´ë‹¤ ?‘ê±°??ë¹„ìŠ·.
await page.waitForTimeout(AUTOSAVE_WAIT);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector('.react-flow__node[data-id="c-done"]', { timeout: 30000 });
await page.waitForTimeout(2500);
const reloadDone = await rdNode("c-done");
const reloadStart = await rdNode("c-start");
// ?œë¡­???ˆì¸ ?¼ìª½(=c-start ë¶€ê·??ëŠ” ???¼ìª½)?¼ë¡œ ?ˆìœ¼???€??x??ê·?ê·¼ì²˜?¬ì•¼. ë²„ê·¸ë©?footprintë§Œí¼ ???¼ìª½(?Œìˆ˜ ??.
// ?ì† ?¼ì¹˜ = ?ˆë¡œê³ ì¹¨ ?œì‹œê°€ ?œë¡­ ì§í›„ ?œì‹œ(saved)?€ footprint ì°??†ì´ ?¼ê? ???¬ê¸°???œë¡­ ?„ì¹˜ê°€ c-start ë¶€ê·??´ë‚´?¸ì?ë¡?ê·¼ì‚¬.
const persistedNearDrop = reloadDone.fx < reloadStart.fx + 200 && reloadDone.fx > reloadStart.fx - 400;
console.log(
  "persisted near drop (reload c-done.fx within sane band of c-start):",
  persistedNearDrop,
  "(c-done.fx=" + Math.round(reloadDone.fx) + " c-start.fx=" + Math.round(reloadStart.fx) + ")",
);

await page.screenshot({ path: "/tmp/bpm-issue1.png", fullPage: false });
console.log("consoleErrors:", errors.length, errors.slice(0, 3));
await browser.close();

const pass = followOk && persistedNearDrop && errors.length === 0;
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
