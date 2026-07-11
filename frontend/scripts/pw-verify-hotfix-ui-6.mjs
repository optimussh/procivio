// ?«í”½??UI 6 ?œê° ê²€ì¦?????ë°????ë””??ë²„íŠ¼ ???¼ì»¤ ?œë¡­?¤ìš´(ë°€ë¦¼Â·í´ë¦¬í•‘) ??980px ë¶„ê¸°??3??
// ?¤í–‰: frontend/ ?ì„œ node scripts/pw-verify-hotfix-ui-6.mjs
// ?„ì œ: backend :8000 + frontend :3000 ê¸°ë™, dev.db??ë§µÂ·ê³µì§€Â·?Œë¦¼ ?œë“œ.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:7000";
const SHOTS = "/tmp/hotfix-ui-6";
mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` ??${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 580 } });
await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin.sys");
  window.localStorage.setItem("bpm.lang", "en");
});
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});

// ?€?€ ???ì„± ëª¨ë‹¬ ?¼ì»¤ ??1280Ã—580 ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "New map" }).click();
await page.waitForSelector("text=Required approvers");

// ?‘ì—…???¼ì»¤: ?„ë³´ê°€ 400+ëª…ì´??ëª©ë¡???¤ì œë¡?160pxë¥?ì±„ìš´?????´ë¦¬???¬ë?ë¥?ì§„ì§œë¡?ê²€ì¦í•œ??
const PICKER = 'input[placeholder^="Search by name"]'; // ??ê²€?‰ì°½("Search maps")ê³?êµ¬ë¶„
const collabInput = page.locator(PICKER).first();
await collabInput.click();
await page.waitForSelector('[data-id="principal-picker-dropdown"]');
await page.waitForTimeout(200);
const collabDd = page.locator('[data-id="principal-picker-dropdown"]');
const collabBox = await collabDd.boundingBox();
const vh0 = await page.evaluate(() => window.innerHeight);
check(
  "?‘ì—…???œë¡­?¤ìš´(ê¸?ëª©ë¡)???˜ë¦¬ì§€ ?ŠìŒ",
  collabBox !== null && collabBox.height > 100 && collabBox.y >= 0 && collabBox.y + collabBox.height <= vh0,
  collabBox ? `y=${Math.round(collabBox.y)} h=${Math.round(collabBox.height)} vh=${vh0}` : "no box",
);
await page.screenshot({ path: `${SHOTS}/02a-collab-picker-1280x580.png` });
await page.keyboard.press("Escape");
await page.waitForTimeout(150);

// ëª¨ë‹¬?€ ?ë‹¨ ?•ë ¬(pt-4)?´ê³  ë¹??¨ë”©?¼ë¡œ ?¤í¬ë¡¤ì„ ë§Œë“¤ì§€ ?ŠëŠ”?????´ìš©?????¤ì–´ê°€ë©??¤í¬ë¡??†ìŒ.
const bodySel = ".scrollbar-hidden";
const modal = page.locator(".max-w-lg").first();
const createBtn = modal.getByRole("button", { name: "Create" });
const createBox = await createBtn.boundingBox();
check(
  "?¡ì…˜ ë²„íŠ¼??ë·°í¬????(1280Ã—580)",
  createBox !== null && createBox.y >= 0 && createBox.y + createBox.height <= 580,
  createBox ? `create y=${Math.round(createBox.y)}..${Math.round(createBox.y + createBox.height)}` : "no box",
);

// ê²°ì¬???¼ì»¤ = ??ë²ˆì§¸ PrincipalPicker(?‘ì—…???¤ìŒ).
// (Playwright??click?€ ?€?ì„ ë¨¼ì? ?¤í¬ë¡¤í•˜ë¯€ë¡? ?´ë¦­ ?„ì— ?¤í¬ë¡¤ì„ ?ë‚´ ?¬ì•¼ ë°€ë¦¼ë§Œ ì¸¡ì •?œë‹¤.)
const approverInput = page.locator(PICKER).last();
await approverInput.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const scrollBefore = await page.locator(bodySel).evaluate((el) => el.scrollTop);
await approverInput.click();
await page.waitForSelector('[data-id="principal-picker-dropdown"]');
await page.waitForTimeout(300);
const scrollAfter = await page.locator(bodySel).evaluate((el) => el.scrollTop);
check("ëª¨ë‹¬ ë³¸ë¬¸??ë°€ë¦¬ì? ?ŠìŒ (scrollTop ë¶ˆë?)", scrollBefore === scrollAfter, `${scrollBefore} ??${scrollAfter}`);

const dd = page.locator('[data-id="principal-picker-dropdown"]');
const side = await dd.getAttribute("data-side");
// 580px?ì„  ?¼ì´ ê¸¸ì–´ ?¼ì»¤ ?„ë˜ ?¬ìœ ê°€ ?†ë‹¤ ???†ìœ¼ë¡? ?„ë¡œ flip?€ ?´ëŠ ê²½ìš°?ë„ ???œë‹¤.
check("ê²°ì¬???œë¡­?¤ìš´???†ìœ¼ë¡??´ë¦¼ (1280Ã—580, ??flip ?†ìŒ)", side === "right" || side === "left", `data-side=${side}`);

const box = await dd.boundingBox();
const vh = await page.evaluate(() => window.innerHeight);
check(
  "?œë¡­?¤ìš´??ë·°í¬???ˆì— ?¨ì „???¤ì–´ê°?,
  box !== null && box.y >= 0 && box.y + box.height <= vh,
  box ? `y=${Math.round(box.y)} h=${Math.round(box.height)} vh=${vh}` : "no box",
);
// portal ?•ì¸ ??ëª¨ë‹¬ ?œë¸Œ?¸ë¦¬ ë°?body ì§ê³„)??ë¶™ì–´???´ë¦¬?‘ì„ ë²—ì–´?œë‹¤
const portaled = await dd.evaluate((el) => el.parentElement === document.body);
check("?œë¡­?¤ìš´??bodyë¡?portal ??, portaled);
await page.screenshot({ path: `${SHOTS}/02-approver-picker-1280x580.png` });

// ?¸ë¡œê°€ ?‰ë„‰?˜ë©´(??000px) ???„ì²´ê°€ ?¤í¬ë¡??†ì´ ?¤ì–´ê°€ê³??œë¡­?¤ìš´?€ ?„ë˜ë¡?5ì¤??´ë¦°??
await page.setViewportSize({ width: 1280, height: 1000 });
await page.waitForTimeout(300);
const scrollable = await page.locator(bodySel).evaluate((el) => el.scrollHeight - el.clientHeight);
check("ê¸??”ë©´?ì„  ë³¸ë¬¸ ?¤í¬ë¡??†ìŒ (ë¹??¨ë”©?¼ë¡œ ?¤í¬ë¡?ë§Œë“¤ì§€ ?ŠìŒ)", scrollable === 0, `scrollHeight-clientHeight=${scrollable}`);
const sideTall = await dd.getAttribute("data-side");
const maxHTall = await dd.evaluate((el) => getComputedStyle(el).maxHeight);
check("ê¸??”ë©´?ì„  ?„ë˜ë¡?5ì¤?160px)", sideTall === "below" && maxHTall === "160px", `data-side=${sideTall} max-height=${maxHTall}`);
await page.screenshot({ path: `${SHOTS}/02c-approver-picker-1280x1000.png` });
await page.setViewportSize({ width: 1280, height: 580 });
await page.waitForTimeout(200);

// ?„ì£¼ ??? ë·°í¬?????„ë˜ ê³µê°„???†ìœ¼ë©??†ìœ¼ë¡??´ë ¤???œë‹¤(?„ë¡œ flip ê¸ˆì?)
await page.setViewportSize({ width: 1280, height: 420 });
await page.waitForTimeout(250);
const sideNarrow = await dd.getAttribute("data-side");
const boxNarrow = await dd.boundingBox();
const anchorBox = await approverInput.boundingBox();
check(
  "?„ë˜ ê³µê°„ ë¶€ì¡????†ìœ¼ë¡?(?„ë¡œ flip ????",
  sideNarrow === "right" || sideNarrow === "left",
  `data-side=${sideNarrow}`,
);
check(
  "?†ìœ¼ë¡??´ë ¤??ë·°í¬????,
  boxNarrow !== null && boxNarrow.y >= 0 && boxNarrow.y + boxNarrow.height <= 420,
  boxNarrow ? `y=${Math.round(boxNarrow.y)} h=${Math.round(boxNarrow.height)}` : "no box",
);
check(
  "???œë¡­?¤ìš´???µì»¤ë¥?ê°€ë¦¬ì? ?ŠìŒ",
  boxNarrow !== null && anchorBox !== null && boxNarrow.x >= anchorBox.x + anchorBox.width - 1,
  boxNarrow && anchorBox ? `dd.x=${Math.round(boxNarrow.x)} anchor.right=${Math.round(anchorBox.x + anchorBox.width)}` : "",
);
await page.screenshot({ path: `${SHOTS}/02b-approver-picker-side-1280x420.png` });
await page.keyboard.press("Escape");

// ?€?€ ??980px ë¶„ê¸°?????ˆÂ·ê³µì§€Â·?¸ë°•???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
const asideVisible = async (dataId) =>
  page.locator(`[data-id="${dataId}"]`).evaluate((el) => getComputedStyle(el).display !== "none");

for (const [w, expectAside] of [[940, false], [1100, true]]) {
  await page.setViewportSize({ width: w, height: 900 });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  // ì¹´ë“œ ?¨ë”©???´ë¦­ = ? íƒ. ì¤‘ì•™?€ ?´ë¦„ Link???ë””?°ë¡œ ?´ë™??ë²„ë¦°??  await page.locator('[data-id="map-card"]').first().click({ position: { x: 6, y: 6 } });
  await page.waitForTimeout(400);
  check(`??${w}px ???°ì¸¡ ?ì„¸ ${expectAside ? "?œì‹œ" : "?¨ê?"}`, (await asideVisible("map-detail-aside")) === expectAside);
  await page.screenshot({ path: `${SHOTS}/03-home-${w}.png` });

  await page.goto(`${BASE}/notices`, { waitUntil: "networkidle" });
  await page.locator("ul li button").first().click();
  await page.waitForTimeout(400);
  check(`ê³µì? ${w}px ???°ì¸¡ ?ì„¸ ${expectAside ? "?œì‹œ" : "?¨ê?"}`, (await asideVisible("notice-detail-aside")) === expectAside);
  await page.screenshot({ path: `${SHOTS}/03-notices-${w}.png` });

  await page.goto(`${BASE}/inbox`, { waitUntil: "networkidle" });
  await page.locator("ul li button").first().click();
  await page.waitForTimeout(400);
  check(`?¸ë°•??${w}px ???°ì¸¡ ?ì„¸ ${expectAside ? "?œì‹œ" : "?¨ê?"}`, (await asideVisible("inbox-detail-aside")) === expectAside);
  await page.screenshot({ path: `${SHOTS}/03-inbox-${w}.png` });
}

// 940px?ì„œ ?„ì½”?”ì–¸???¤ì œë¡??¼ì³ì¡ŒëŠ”ì§€ (grid-rows 1fr)
await page.setViewportSize({ width: 940, height: 900 });
await page.goto(`${BASE}/notices`, { waitUntil: "networkidle" });
await page.locator("ul li button").first().click();
await page.waitForTimeout(500);
const accordionOpen = await page
  .locator('[data-id="notice-detail-accordion"]')
  .first()
  .evaluate((el) => el.getBoundingClientRect().height > 40);
check("ê³µì? 940px ??ì¹´ë“œ ?„ë˜ ?„ì½”?”ì–¸ ?¼ì¹¨", accordionOpen);
await page.screenshot({ path: `${SHOTS}/03b-notices-940-accordion.png`, fullPage: false });

// ?€?€ ??ë§??¤ì • ì¢Œì¸¡ ?ˆì¼ ë²„íŠ¼ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
await page.setViewportSize({ width: 1280, height: 800 });
const firstMapId = await page.evaluate(async () => {
  const res = await fetch("/api/maps");
  const maps = await res.json();
  return maps[0].id;
});
await page.goto(`${BASE}/maps/${firstMapId}/settings`, { waitUntil: "networkidle" });
const backBtn = page.locator('[data-id="settings-back-to-editor"]');
await backBtn.waitFor();
// ?ˆì¼ = ë²„íŠ¼??ë¶€ëª??¤ì • ?˜ì´ì§€ ì¢Œì¸¡ aside). ?˜ì´ì§€??asideê°€ ?¬ëŸ¿?´ë¼ ?„ì¹˜ë¡?ê³ ë¥´ì§€ ?ŠëŠ”??
const { btnWidth, railWidth, hasBorder } = await backBtn.evaluate((el) => {
  const rail = el.parentElement;
  return {
    btnWidth: el.getBoundingClientRect().width,
    railWidth: rail.getBoundingClientRect().width,
    hasBorder: getComputedStyle(el).borderTopWidth !== "0px",
  };
});
check(
  "Back to editor ë²„íŠ¼???ˆì¼ ??„ ì±„ìš°ì§€ ?ŠìŒ (self-start)",
  btnWidth < railWidth - 30,
  `btn=${Math.round(btnWidth)} rail=${Math.round(railWidth)}`,
);
check("Back to editor ë²„íŠ¼???Œë‘ë¦?, hasBorder);
check("Back to editor ë²„íŠ¼??ArrowLeft ?„ì´ì½?, (await backBtn.locator("svg").count()) === 1);
await backBtn.evaluate((el) => el.parentElement.setAttribute("data-pw-rail", "1"));
await page.locator("[data-pw-rail]").screenshot({ path: `${SHOTS}/01-settings-rail.png` });

// ?€?€ ê²°ê³¼ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
console.log(`\nconsole errors: ${consoleErrors.length}`);
consoleErrors.slice(0, 5).forEach((e) => console.log("  " + e.slice(0, 160)));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
process.exit(failed.length === 0 ? 0 : 1);
