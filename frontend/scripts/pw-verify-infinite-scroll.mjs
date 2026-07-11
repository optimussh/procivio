// ë¬´í•œ?¤í¬ë¡?25ì²?¬) ê²€ì¦???A: principal-picker(New map ?‘ì—…???¼ì»¤) ì´ˆê¸° 25 ??ë°”ë‹¥ ?„ë‹¬ ??+25,
// ê²€?‰ë„ ìº??†ì´ 25ì²?¬ + ë¶€??ê·¸ë£¹ 1ê°?ìµœìƒ???€.
// B: ?¤ì • ??Employees ?Œì´ë¸?ì§ì› 401?? 25???¼í‹°?????¤í¬ë¡¤ë§ˆ??+25.
// ?¤í–‰: node scripts/pw-verify-infinite-scroll.mjs  (playwright-core, ?œë²„ 8000/3000 ê¸°ë™ ?„ì œ)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext();
// dev ë¡œê·¸???°íšŒ ??DevGateê°€ ?½ëŠ” localStorage ?¤ë? ? ì£¼??await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin.sys"); // sysadmin ???¤ì • ê´€ë¦¬ì ???‘ê·¼??  window.localStorage.setItem("bpm.lang", "en"); // ?¼ë²¨ ë§¤ì¹­??EN?¼ë¡œ ê³ ì •

});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://localhost:7000/", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Process Maps", { timeout: 30000 });

// New map ?¤ì´?¼ë¡œê·????‘ì—…???¼ì»¤ ?¬ì»¤??await page.getByRole("button", { name: "New map" }).click();
const input = page.locator('input[placeholder="Search by name or initial consonant??]').first();
await input.click();
await page.waitForTimeout(400);

const result = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const input = document.querySelector('input[placeholder="Search by name or initial consonant??]');
  const list = input.closest(".relative").querySelector(".overflow-y-auto");
  const count = () => list.querySelectorAll("button").length;
  const out = { count1: count(), sentinel1: !!list.querySelector("div.h-px") };
  list.scrollTop = list.scrollHeight;
  await wait(500);
  out.count2 = count();
  list.scrollTop = list.scrollHeight;
  await wait(500);
  out.count3 = count();
  // ê²€?‰ë„ ìº??†ì´ 25ì²?¬ ??'a'??264ëª?ë§¤ì¹˜: 25ê°??¼í‹°?? ?¤í¬ë¡???+25 (React ?œì–´ ?…ë ¥?€ ?¤ì´?°ë¸Œ setterë¡?ì£¼ì…)
  const setVal = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setVal.call(input, "a");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(400);
  out.searchCount1 = count();
  out.searchSentinel = !!list.querySelector("div.h-px");
  list.scrollTop = list.scrollHeight;
  await wait(500);
  out.searchCount2 = count();
  // ë¶€??ê·¸ë£¹ ìµœìƒ???€ ??'s'??ë¶€??System Team ??+? ì? ?™ì‹œ ë§¤ì¹˜: ì²????°ì¸¡ ?¼ë²¨??Department/Group
  setVal.call(input, "s");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(400);
  out.firstRowLabel =
    list.querySelector("button")?.querySelector("span.ml-auto")?.textContent ?? "";
  // ê²€?‰ì–´ ì§€?°ë©´ ?¤ì‹œ 25ë¶€??ë¦¬ì…‹ ?•ì¸)
  setVal.call(input, "");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(400);
  out.countReset = count();
  return out;
});

// ?€?€ B: ?¤ì • ??Employees ?Œì´ë¸??€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
await page.goto("http://localhost:7000/settings", { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Employees" }).first().click();
await page.waitForSelector("tbody tr", { timeout: 15000 });

const table = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tbody = document.querySelector("tbody");
  const rows = () => tbody.querySelectorAll("tr").length;
  // ?¤ì œ ?¤í¬ë¡¤ë˜??ì¡°ìƒ ?ìƒ‰(?¤ì • main ?? ???†ìœ¼ë©?ë¬¸ì„œ ?¤í¬ë¡??´ë°±
  let sc = tbody.parentElement;
  while (sc && sc.scrollHeight <= sc.clientHeight + 4) sc = sc.parentElement;
  const target = sc ?? document.scrollingElement;
  const out = { rows1: rows() };
  target.scrollTop = target.scrollHeight;
  await wait(500);
  out.rows2 = rows();
  target.scrollTop = target.scrollHeight;
  await wait(500);
  out.rows3 = rows();
  return out;
});

// ?€?€ C: ?˜ì´ì§€ ?¤ëª¨????ëª©ë¡ ?ìš© ?˜ì´ì§€?¤ì´ ì½˜ì†” ?ëŸ¬ ?†ì´ ?Œë”?˜ëŠ”ì§€ ?€?€?€?€?€?€?€?€?€?€
const beforeC = errors.length;
for (const path of ["/", "/notices", "/inbox"]) {
  await page.goto(`http://localhost:7000${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
}
const cConsoleErrors = errors.length - beforeC;

// ?Œì´ë¸????˜ëŠ” ?°ì´??25 + ?¼í‹°??1
const pass =
  result.count1 === 25 &&
  result.sentinel1 &&
  result.count2 === 50 &&
  result.count3 === 75 &&
  result.searchCount1 === 25 &&
  result.searchSentinel &&
  result.searchCount2 === 50 &&
  ["Department", "Group"].includes(result.firstRowLabel) &&
  result.countReset === 25 &&
  table.rows1 === 26 &&
  table.rows2 === 51 &&
  table.rows3 === 76 &&
  cConsoleErrors === 0;

console.log(JSON.stringify({ picker: result, table, cConsoleErrors, consoleErrors: errors.length, pass }, null, 2));
await browser.close();
process.exit(pass ? 0 : 1);
