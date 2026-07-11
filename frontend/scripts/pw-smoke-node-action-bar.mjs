// ?¸ë“œ ?¡ì…˜ ë°?+ ë§í¬ ë¯¸ë¦¬ë³´ê¸° ?¤ëª¨?????¨ì¼ ? íƒ ??ë°??¸ì¶œ, subprocess ?¼ì¹¨ ? ê?(?¼ì¹˜ê¸?ë²„íŠ¼ ?¨ë…),
// ?¼ë°˜ ?¸ë“œ URL ?…ë ¥?’ë§??ë²„íŠ¼(?¨ë…)?’íŒ¨???¤í”ˆÂ·ì£¼ì†Œ ?œê¸°Â·Esc ?«ê¸°, locked/undesignated subprocess
// ?¼ì¹˜ê¸?ë¯¸ë…¸ì¶? ì½˜ì†” ?ëŸ¬ 0 ê²€ì¦?
// ?¼ì¹˜ê¸°Â·ë§??ë²„íŠ¼?€ ?¸ë“œ ?€?…ìƒ ë°°í????¸ìŠ¤?™í„°ê°€ subprocess?ëŠ” url ?„ë“œë¥??¸ì¶œ?˜ì? ?ŠìŒ ??// hasBpmAttributes()ê°€ start/end/subprocess ?œì™¸)?´ë¼ ??ë²„íŠ¼?????¸ë“œ???™ì‹œ???¨ëŠ” ê²½ìš°ë¥?UIë¡?// ?¬í˜„?????†ë‹¤ ??ê°ê° ?¨ë… ?¸ì¶œÂ·?œì„œ(?¨ì¼ ?ì†Œ)ë¡?ê²€ì¦í•œ??
// ì»¤ë²„ë¦¬ì? ê°??„ì†Â·follow-up): "?¼ì¹˜ê¸°â†’ë§í¬" ê³ ì • ?œì„œê°€ ???¸ë“œ?ì„œ ?™ì‹œ ?¸ì¶œ?˜ëŠ” ì¡°í•©
// (node-action-expand,node-action-link) ?ì²´?????¤ëª¨?¬ê? ?¤ë£¨ì§€ ?ŠëŠ”????subprocess+url ?™ì‹œ
// ë³´ìœ  ?¸ë“œ???¸ìŠ¤?™í„° UIë¡œëŠ” ë§Œë“¤ ???†ê³  CSV ?„í¬?¸ë¡œ url??ì§ì ‘ ?¬ì–´?¼ë§Œ ?¬í˜„ ê°€??ë²”ìœ„ ë°?.
// ?œì„œ ?ì²´??node-action-bar.tsx JSX ë°°ì¹˜(showExpand ë¸”ë¡ ??showLink ë¸”ë¡)ë¡?êµ¬ì¡°?ìœ¼ë¡?ê³ ì •??// ?ˆì–´ ë¡œì§ ë³€ê²??†ì´???? „ ?Œê?ê°€ ?˜ì? ?ŠëŠ”????CSV ?œë‚˜ë¦¬ì˜¤ ?¤ëª¨?¬ëŠ” ?„ì† ê³¼ì œë¡??¨ê¸´??
// ê·¸ë£¹ ?˜ê?ê¸°ëŠ” ?°ëª¨ ?œë“œ??ê·¸ë£¹???†ì–´ ?˜ë™ ?œí˜„?¼ë¡œ ê²€ì¦??Œëœ Task 5 Step 4).
// ?¤í–‰: node scripts/pw-smoke-node-action-bar.mjs  (backend 8000 + frontend 3000 ê¸°ë™, ?°ëª¨ ?œë“œ map 2
// "Employee Onboarding" ?„ì œ ??ì§€??subprocess ?¸ë“œ "Order Fulfillment", ë¯¸ì???subprocess ?¸ë“œ
// "Procurement Flow", ?¼ë°˜ task ?¸ë“œ "Process Request")
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
// ê¸°ë³¸ ?¤ë“œë¦¬ìŠ¤ ë·°í¬??1280x720)??ì¢ì•„ bottom-left ê·¼ì²˜ ?¸ë“œ???¡ì…˜ ë°”ê? ë¯¸ë‹ˆë§??¨ë„ê³?// ê²¹ì³ ?´ë¦­??ê°€ë¡œì±„?¸ë‹¤ ???¼ë°˜ ?°ìŠ¤?¬í†± ì°??¬ê¸°ë¡??‰ë„‰???¡ì•„ ?Œí”¼.
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
// dev ë¡œê·¸???°íšŒ ??DevGateê°€ ?½ëŠ” localStorage ?¤ë? ? ì£¼?? map 2 draft ì²´í¬?„ì›ƒ ë³´ìœ ?ì? ë§ì¶° admin.sys ?¬ìš©.
await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin.sys");
});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
let failed = false;
const fail = (msg) => {
  console.error("FAIL:", msg);
  failed = true;
};

// urlWasSet ???¸ìŠ¤?™í„°ë¡?url???¤ì œë¡??¬ì? ?œì ë¶€??true. ì¤‘ê°„???ˆì™¸ê°€ ?˜ì ¸?¸ë„ finally?ì„œ
// ??ê°’ì„ ë³´ê³  ?ë³µ???œë„???°ëª¨ ?œë“œ ?¤ì—¼(url="https://example.com/" ?”ì¡´)??ë§‰ëŠ”??
let urlWasSet = false;
let urlInput = null;

try {
  await page.goto("http://localhost:7000/maps/2", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".react-flow__node", { timeout: 30000 });
  // ê²Œì‹œë³?ê¸°ë³¸ ?´ëŒ(?½ê¸° ?„ìš©) ??ì´ˆì•ˆ ë²„ì „?¼ë¡œ ?„í™˜ ???íƒœ ë°°ë„ˆ ê¸°ëŠ¥ ?´í›„ ?ë””?°ê? ê²Œì‹œë³¸ì„ ë¨¼ì? ?°ë‹¤ (2026-07-07 ë¨¸ì?)
  await page.getByRole("button", { name: /Select version|ë²„ì „ ? íƒ/ }).first().click();
  await page.waitForTimeout(300);
  const draftRow = page.locator('button:has-text("(Draft)")').last();
  if (await draftRow.count()) {
    await draftRow.click();
    await page.keyboard.press("Escape"); // ?™ì¼ ë²„ì „ ?´ë¦­ ???œë¡­?¤ìš´ ?”ë¥˜ ë°©ì–´
    await page.waitForSelector(".react-flow__node", { timeout: 30000 });
  } else {
    await page.keyboard.press("Escape");
  }

  await page.waitForTimeout(3000); // ì¸¡ì •/?ˆì´?„ì›ƒ + subprocess ë©”í? ë¡œë“œ ?ˆì •??
  const bar = page.locator('[data-id="node-action-bar"]');
  const expandBtn = page.locator('[data-id="node-action-expand"]');

  // (a) ì§€??subprocess ?¸ë“œ("Order Fulfillment") ? íƒ ???¡ì…˜ ë°?+ ?¼ì¹˜ê¸?ë²„íŠ¼(?¨ë…)
  const subNode = page.locator(".react-flow__node", { hasText: "Order Fulfillment" }).first();
  await subNode.click();
  await bar.waitFor({ timeout: 5000 }).catch(() => fail("action bar did not appear on subprocess node"));
  if (!(await expandBtn.isVisible().catch(() => false))) fail("expand button not visible on subprocess node");
  const subIds = await bar.locator("button").evaluateAll((els) => els.map((e) => e.getAttribute("data-id")));
  if (subIds.join(",") !== "node-action-expand") fail(`subprocess bar buttons wrong: ${subIds.join(",")}`);

  // (b) ?¼ì¹¨ ? ê? ??aria-label??collapseë¡??„í™˜
  await expandBtn.click();
  await page.waitForTimeout(1500);
  const label = await expandBtn.getAttribute("aria-label");
  if (!/collapse|?‘ê¸°/i.test(label ?? "")) fail(`expand did not toggle: ${label}`);
  await expandBtn.click(); // ?ë³µ
  await page.waitForTimeout(800);

  // (c) ?¼ë°˜ task ?¸ë“œ("Process Request")ë¡??„í™˜ ??URL ?¸íŒ…(?¸ìŠ¤?™í„°, ?ë™?€??ê²½ë¡œ) ??ë§í¬ ë²„íŠ¼(?¨ë…)
  const taskNode = page.locator(".react-flow__node", { hasText: "Process Request" }).first();
  await taskNode.click();
  await page.waitForTimeout(300);
  urlInput = page.locator('[data-id="url-field-input"]');
  if (await urlInput.isDisabled().catch(() => false)) {
    fail("url input disabled ??map 2 draft may be checked out by someone other than admin.sys");
  } else {
    await urlInput.fill("https://example.com/");
    await page.keyboard.press("Enter");
    urlWasSet = true;
  }
  await page.waitForTimeout(500); // ?íƒœ ë°˜ì˜
  const taskIds = await bar.locator("button").evaluateAll((els) => els.map((e) => e.getAttribute("data-id")));
  if (taskIds.join(",") !== "node-action-link") fail(`task node bar buttons wrong: ${taskIds.join(",")}`);

  // (d) ë§í¬ ?´ê¸° ???¨ë„ ?¤í”ˆ + ì£¼ì†Œ ?œê¸° + iframe ??Esc ?«ê¸°
  await page.locator('[data-id="node-action-link"]').click();
  const panel = page.locator('[data-id="link-preview-panel"]');
  await page.waitForTimeout(600); // ?¬ë¼?´ë“œ ??  if (!((await panel.getAttribute("class")) ?? "").includes("translate-x-0")) fail("panel did not open");
  if ((await panel.locator("iframe").count()) === 0) fail("iframe not rendered");
  if (!(await panel.getByText("https://example.com").first().isVisible().catch(() => false)))
    fail("address bar url missing");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  if (((await panel.getAttribute("class")) ?? "").includes("translate-x-0")) fail("panel did not close on Esc");

  // (d2) ?¼ë²¨ ?…ë ¥ ??ë²„íŠ¼ ?ìŠ¤???€ì²????¼ë²¨ ?? œ ???ë³µ
  await page.locator('[data-id="url-label-input"]').fill("WMS Doc");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const linkBtn2 = page.locator('[data-id="node-action-link"]');
  const btnText = ((await linkBtn2.textContent()) ?? "").trim();
  if (!btnText.includes("WMS Doc")) fail(`label did not replace button text: "${btnText}"`);
  if (/open link|ë§í¬ ?´ê¸°/i.test(btnText)) fail("default open-link text still present with label");
  await page.locator('[data-id="url-label-remove"]').click();
  await page.waitForTimeout(400);
  const btnText2 = ((await linkBtn2.textContent()) ?? "").trim();
  if (!/open link|ë§í¬ ?´ê¸°/i.test(btnText2)) fail(`label removal did not restore default text: "${btnText2}"`);

  // (e) ?¤ì¤‘ ? íƒ ??ë°??¨ê? ??RF ê¸°ë³¸ multiSelectionKeyCode??Mac?ì„œ Meta(?ë””???¤ë²„?¼ì´???†ìŒ)
  const otherNode = page.locator(".react-flow__node", { hasText: "Procurement Flow" }).first();
  await taskNode.click();
  await otherNode.click({ modifiers: ["Meta"] });
  await page.waitForTimeout(300);
  if (await bar.isVisible().catch(() => false)) fail("bar visible on multi-select");

  // (f) ë³´ë„ˆ????ë¯¸ì???subprocess("Procurement Flow") ?¨ë… ? íƒ ???¼ì¹˜ê¸?ë²„íŠ¼ ë¯¸ë…¸ì¶?locked/undesignated ê²Œì´??
  await otherNode.click();
  await page.waitForTimeout(300);
  if (await expandBtn.isVisible().catch(() => false)) fail("expand button visible on undesignated subprocess");

  // URL ?ë³µ ???°ëª¨ ?œë“œ ?¤ì—¼ ë°©ì?. AUTO_SAVE_DELAY_MS(2000, page.tsx) ?”ë°”?´ìŠ¤ ?„ì—??PUT??  // ?˜ê?ë¯€ë¡?browser.close() ?„ì— ê·¸ë§Œ??ê¸°ë‹¤?¤ì•¼ ?¤ì œë¡?ë°˜ì˜?œë‹¤(?¤ë¥¸ pw-smoke-*.mjs?€ ?™ì¼ ê´€ë¡€).
  await taskNode.click();
  const removeBtn = page.locator('[data-id="url-field-remove"]');
  if (await removeBtn.count()) await removeBtn.click();
  await page.waitForTimeout(2500); // AUTO_SAVE_DELAY_MS(2000) + PUT ?¬ìœ 
  urlWasSet = false; // ?•ìƒ ê²½ë¡œ?ì„œ ?ë³µ ?„ë£Œ ??finally??best-effort ?¬ì‹œ??ë¶ˆí•„??  if (!(await page.locator('[data-id="url-field-input"]').count())) fail("url input did not return after removal");

  if (errors.length) fail(`console errors: ${errors.join(" | ")}`);
} finally {
  if (urlWasSet) {
    // best-effort ???¬ê¸° ?„ë‹¬?ˆë‹¤??ê±??„ì—???ˆì™¸ê°€ ?˜ì ¸ì¡Œë‹¤????page/contextê°€ ì£½ì–´?ˆì„ ???ˆìŒ).
    // fill ?„ì—??AUTO_SAVE_DELAY_MS(2000)ë§Œí¼ ê¸°ë‹¤?¤ì•¼ PUT???˜ê°„??????ê¸°ë‹¤ë¦¬ë©´ close()ê°€
    // ?”ë°”?´ìŠ¤ ?€?´ë¨¸ë¥??µì§¸ë¡?? ë ¤ ?ë³µ??ë¡œì»¬ ?íƒœ?ë§Œ ?¨ê³  ?œë²„??ë°˜ì˜?˜ì? ?ŠëŠ”??
    try {
      const removeBtn = page.locator('[data-id="url-field-remove"]');
      if (await removeBtn.count()) await removeBtn.click();
      await page.waitForTimeout(2500); // AUTO_SAVE_DELAY_MS(2000) + PUT ?¬ìœ 
    } catch {
      // ?ë³µ ?¤íŒ¨??ë¬´ì‹œ ??browser.close()??ë°˜ë“œ???¤í–‰?´ì•¼ ?˜ë?ë¡??¬ê¸°???¬throw?˜ì? ?ŠëŠ”??    }
  }
  await browser.close();
}

if (failed) process.exit(1);
console.log("PASS: node action bar + link preview smoke");
