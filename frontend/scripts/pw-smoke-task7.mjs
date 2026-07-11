// Task 7 ?§Î™®?????òÏúÑ?ÑÎ°ú?∏Ïä§ ?ΩÍ∏∞?ÑÏö© ?•Î∑∞ ?úÎ¶¥??Í≤ÄÏ¶?
// map 3?êÏÑú ?òÏúÑ?ÑÎ°ú?∏Ïä§ c-order(Ï£ºÎ¨∏ Ï≤òÎ¶¨)Î•??îÎ∏î?¥Î¶≠ ??ÎßÅÌÅ¨Îß?Ï£ºÎ¨∏ Ï≤òÎ¶¨) ?∏Îìú?§Ïù¥ ?ΩÍ∏∞?ÑÏö© ?úÏÑ± ?ÅÏó≠?ºÎ°ú ?¥Î¶∞??
// Í≤ÄÏ¶? ?úÎ¶¥ ?∏Îìú(Í≤Ä?? ?úÏãú¬∑ÎπÑÎìú?òÍ∑∏, Ï°∞ÏÉÅ(Î£®Ìä∏) Ïª®ÌÖç?§Ìä∏ dim, Î∏åÎ†à?úÌÅ¨??2?®Í≥Ñ, Î£®Ìä∏ Î≥µÍ? ???∏Ïßë ?¨Í∞ú¬∑?ºÏπ® ?†Ï?, ÏΩòÏÜî ?êÎü¨ 0.
// ?§Ìñâ: node scripts/pw-smoke-task7.mjs  (playwright-core, ?úÎ≤Ñ 8000/3000 Í∏∞Îèô ?ÑÏ†ú)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin");
});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto("http://localhost:7000/maps/3", { waitUntil: "domcontentloaded" });
await page.waitForSelector('.react-flow__node[data-id="c-order"]', { timeout: 30000 });
await page.waitForTimeout(2000);

const breadcrumbTitles = () =>
  page.$$eval("header nav button", (bs) => bs.map((b) => b.textContent?.trim() ?? ""));

const crumbsBefore = await breadcrumbTitles();

// ?îÎ∏î?¥Î¶≠ ÏßÅÏ†Ñ Ïπ¥Î©î??Î∑∞Ìè¨?? Í∏∞Î°ù ???úÎ¶¥?∏Ïù¥ Ïπ¥Î©î?ºÎ? ?¨Í≤å ?êÌîÑ?úÌÇ§ÏßÄ ?äÏïÑ????
const vpBefore = await page.evaluate(
  () => document.querySelector(".react-flow__viewport")?.style.transform ?? "",
);

// 1. ?òÏúÑ?ÑÎ°ú?∏Ïä§ c-order(Ï£ºÎ¨∏ Ï≤òÎ¶¨) ?îÎ∏î?¥Î¶≠ ???ΩÍ∏∞?ÑÏö© ?•Î∑∞ ?úÎ¶¥??const orderNode = page.locator('.react-flow__node[data-id="c-order"]').first();
const orderBox = await orderNode.boundingBox();
await page.mouse.dblclick(orderBox.x + orderBox.width / 2, orderBox.y + orderBox.height / 2);
await page.waitForTimeout(2000);

const crumbsAfter = await breadcrumbTitles();
const vpAfter = await page.evaluate(
  () => document.querySelector(".react-flow__viewport")?.style.transform ?? "",
);

// ?úÎ¶¥?∏ÌïòÎ©?ÎßÅÌÅ¨Îß?Ï£ºÎ¨∏ Ï≤òÎ¶¨)???∏Îìú(Í≤Ä??Í∞Ä ?úÏÑ± ?ÅÏó≠?ºÎ°ú ?±Ïû•. ?§ÏûÑ?§Ìéò?¥Ïä§ id = c-order/a-review.
const drilledNode = await page.evaluate(() => {
  const el = document.querySelector('.react-flow__node[data-id="c-order/a-review"]');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return {
    present: true,
    text: el.textContent?.trim() ?? "",
    opacity: cs.opacity,
    draggable: el.classList.contains("draggable") && !el.classList.contains("nodrag"),
    hasNodrag: el.classList.contains("nodrag"),
  };
});

// Ï°∞ÏÉÅ(Î£®Ìä∏) Ïª®ÌÖç?§Ìä∏ ??Î£®Ìä∏ ?ÑÎ†à???∏Îìú(?¥Ìñâ ?ÑÎ£å=c-done)??dim(opacity<1)?ºÎ°ú Í∞êÏã∏ Î≥¥ÏûÑ.
const ancestorDim = await page.evaluate(() => {
  const el = document.querySelector('.react-flow__node[data-id="c-done"]');
  if (!el) return null;
  return { present: true, opacity: getComputedStyle(el).opacity };
});

// Ïπ¥Î©î???êÌîÑ ?ÜÏùå ??Î∑∞Ìè¨??scale???ôÏùº(?úÎ¶¥?∏Ï? offsetÎß?Î≥¥Ï†ï, Ï§?Î∂àÎ?).
const scaleOf = (t) => {
  const m = t.match(/scale\(([^)]+)\)/);
  return m ? parseFloat(m[1]) : 1;
};
const noCameraJump = Math.abs(scaleOf(vpBefore) - scaleOf(vpAfter)) < 0.05;

// 2. ?úÎ¶¥ ?∏Îìú???ΩÍ∏∞?ÑÏö© ???úÎûòÍ∑??úÎèÑ ???ÑÏπò Î∂àÎ?
let drillNotDraggable = true;
const dn = page.locator('.react-flow__node[data-id="c-order/a-review"]').first();
const dnBox = await dn.boundingBox();
if (dnBox) {
  const t0 = await page.evaluate(
    () => document.querySelector('.react-flow__node[data-id="c-order/a-review"]')?.style.transform,
  );
  await page.mouse.move(dnBox.x + dnBox.width / 2, dnBox.y + dnBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dnBox.x + dnBox.width / 2 + 60, dnBox.y + dnBox.height / 2 + 40, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const t1 = await page.evaluate(
    () => document.querySelector('.react-flow__node[data-id="c-order/a-review"]')?.style.transform,
  );
  drillNotDraggable = t0 === t1; // ?ΩÍ∏∞?ÑÏö©?¥Î©¥ ?úÎûòÍ∑∏Ìï¥???ÑÏπò Í∑∏Î?Î°?}

// 3. Î∏åÎ†à?úÌÅ¨??Î£®Ìä∏ ?¨Îüº ?¥Î¶≠ ??Î£®Ìä∏ ?∏Ïßë ?¨Í∞ú, ?ºÏπ®(c-order ?êÏãù) ?†Ï?
await page.locator("header nav button").first().click();
await page.waitForTimeout(1500);
const crumbsBack = await breadcrumbTitles();
// Î£®Ìä∏Î°?Î≥µÍ??òÎ©¥ Î£®Ìä∏ ?∏Îìú(c-order)Í∞Ä ?§Ïãú ?ÑÎ†à???∏ÎìúÎ°??°Ì? ?úÎûòÍ∑?Í∞Ä??draggable, not nodrag).
const rootEditableAgain = await page.evaluate(() => {
  const el = document.querySelector('.react-flow__node[data-id="c-order"]');
  if (!el) return false;
  return el.classList.contains("draggable") && !el.classList.contains("nodrag");
});
// ?ºÏπ® ?†Ï? ??c-order???êÏãù(Í≤Ä??c-order/a-review)???¨Ï†Ñ???∏Îùº?∏ÏúºÎ°?Î≥¥ÏûÑ.
const expansionPreserved = await page.evaluate(
  () => document.querySelector('.react-flow__node[data-id="c-order/a-review"]') !== null,
);

await page.screenshot({ path: "/tmp/bpm-task7-smoke.png", fullPage: false });
await browser.close();

console.log("breadcrumb before drill:", JSON.stringify(crumbsBefore));
console.log("breadcrumb after drill:", JSON.stringify(crumbsAfter));
console.log("drilled node (c-order/a-review):", JSON.stringify(drilledNode));
console.log("ancestor context (c-done) dim:", JSON.stringify(ancestorDim));
console.log("no camera jump:", noCameraJump, "(vp scale", scaleOf(vpBefore), "->", scaleOf(vpAfter), ")");
console.log("drill node not draggable:", drillNotDraggable);
console.log("breadcrumb after back:", JSON.stringify(crumbsBack));
console.log("root editable again:", rootEditableAgain);
console.log("expansion preserved after back:", expansionPreserved);
console.log("consoleErrors:", errors.length, errors.slice(0, 5));

const drillOpened = crumbsAfter.length === 2 && !!drilledNode?.present;
const drillReadOnly = !!drilledNode && !drilledNode.draggable && drillNotDraggable;
const ancestorOk = !!ancestorDim && parseFloat(ancestorDim.opacity) < 1;
const backOk = crumbsBack.length >= 1 && rootEditableAgain && expansionPreserved;
const ok =
  drillOpened && drillReadOnly && ancestorOk && noCameraJump && backOk && errors.length === 0;

console.log(
  "drillOpened:", drillOpened,
  "drillReadOnly:", drillReadOnly,
  "ancestorOk:", ancestorOk,
  "noCameraJump:", noCameraJump,
  "backOk:", backOk,
  "errorsOk:", errors.length === 0,
);
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
