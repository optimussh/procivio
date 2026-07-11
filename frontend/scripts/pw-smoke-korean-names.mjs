// ?œê??´ë¦„Â·?œê?ê·¸ë£¹ ?¼ê´„ ?±ë¡ ?¤ëª¨????Employees ??†’ëª¨ë‹¬?’ë‹¤?´ë¡œ?œâ†’?„í¬??ë°°ì—´/ë§??¬ë§·, ? ê·œ/ì¶©ëŒ skip/overwrite)?’í…Œ?´ë¸” ë°˜ì˜.
// ?¤í–‰: frontend/ ?ì„œ node scripts/pw-smoke-korean-names.mjs
// ?„ì œ: ?Œí¬?¸ë¦¬ backend(:8001)+frontend(:3000, BACKEND_URL=8001) ê¸°ë™. playwright-core+?œìŠ¤??Chrome.
// ?¬ì‹¤???„ì œ: ?€??? ì? korean_name??ë¹„ì–´ ?ˆì–´????ë¬´ì¶©??1ì°??„í¬?? ?„ì œê°€ ?±ë¦½ ??//   sqlite3 backend/dev.db "UPDATE employees SET korean_name='', korean_dept='';" ë¡?ë¦¬ì…‹ ???¤í–‰.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:7000";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` ??${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
});
await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin.sys");
  window.localStorage.setItem("bpm.lang", "en"); // ê¸°ë³¸ ko ?????¼ë²¨ "Employees" ê³ ì •??});
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});

// ??Employees ??ì§„ìž… + ë²„íŠ¼/???¸ì¶œ
await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Employees", exact: true }).click();
await page.waitForSelector('[data-id="kr-add-btn"]', { timeout: 15000 });
check("employees tab + kr-add button", true);
check("korean name column", await page.locator("th", { hasText: "korean name" }).count() === 1);
check("korean dept column", await page.locator("th", { hasText: "korean dept" }).count() === 1);

// ?€??? ì? 2ëª??•ë³´ ??korean_name??ë¹???2ëª??¬ì‹¤?????´ë? ì±„ì›Œì§?? ì?ë¥??¤ì‹œ ê³ ë¥´ì§€ ?Šë„ë¡?
const rows = await page.evaluate(async () => {
  const res = await fetch("/api/employees", { headers: { "X-Dev-User": "admin.sys" } });
  return res.json();
});
const [u1, u2] = rows.filter((r) => !r.korean_name).map((r) => r.login_id);
check("employees seeded", Boolean(u1 && u2), `u1=${u1} u2=${u2}`);

// ??ëª¨ë‹¬ + ë¯¸ë³´??ëª©ë¡ ?¤ìš´ë¡œë“œ
await page.click('[data-id="kr-add-btn"]');
await page.waitForSelector('[data-id="korean-name-modal"]');
const dlPromise = page.waitForEvent("download");
await page.click('[data-id="kr-download-btn"]');
const download = await dlPromise;
const ids = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
check("download is id array incl. targets", Array.isArray(ids) && ids.includes(u1) && ids.includes(u2));

// ??b ì¶”ì¶œ ?µì…˜ ë©”ë‰´ ??4?µì…˜ ?¸ì¶œ + ?„ì²´ ëª©ë¡ ?¤ìš´ë¡œë“œ
await page.click('[data-id="kr-export-menu-btn"]');
await page.waitForSelector('[data-id="kr-export-menu"]');
check(
  "export menu shows 4 options",
  (await page.locator('[data-id="kr-export-menu"] button').count()) === 4,
);
const dlAllPromise = page.waitForEvent("download");
await page.click('[data-id="kr-export-opt-all"]');
const dlAll = await dlAllPromise;
const allIds = JSON.parse(fs.readFileSync(await dlAll.path(), "utf8"));
check("all-users export covers directory", Array.isArray(allIds) && allIds.length === rows.length);

// ??1ì°??„í¬????ì¡°íšŒ ?‘ë‹µ ë°°ì—´ ?¬ë§·(status ?„í„°Â·dept ?¬í•¨), ì¶©ëŒ ?†ìŒ ??ì¦‰ì‹œ ê²°ê³¼(updated 2, unknown 1)
const tmp1 = path.join(os.tmpdir(), "kr-import-1.json");
fs.writeFileSync(
  tmp1,
  JSON.stringify([
    { userId: u1, status: "found", name: "?ê¸¸??, enName: "GD Hong", dept: "AI Operationsê·¸ë£¹", email: "x@y.z" },
    { userId: u2, status: "found", name: "ê¹€ì² ìˆ˜" },
    { userId: "no.such.user", status: "found", name: "? ë ¹" },
    { userId: "ignored.one", status: "not_found" },
    { userId: "ignored.two", status: "error", name: "ë¬´ì‹œ" },
  ]),
);
await page.setInputFiles('[data-id="kr-file-input"]', tmp1);
await page.waitForSelector('[data-id="kr-result"]');
const result1 = await page.locator('[data-id="kr-result"]').innerText();
check(
  "first import applied (array format, not_found/error ignored)",
  result1.includes("2") && result1.includes("no.such.user") && !result1.includes("ignored."),
  result1.replace(/\n/g, " "),
);
await page.click('[data-id="kr-close-btn"]');
check("table shows imported name", await page.locator("td", { hasText: "?ê¸¸?? }).count() >= 1);
check("table shows imported dept", await page.locator("td", { hasText: "AI Operationsê·¸ë£¹" }).count() >= 1);

// ??2ì°??„í¬????ì¶©ëŒ ???´íŒ ?•ì¸ ??Skip all(ê°?? ì?)
const tmp2 = path.join(os.tmpdir(), "kr-import-2.json");
fs.writeFileSync(tmp2, JSON.stringify({ [u1]: "?ˆì´ë¦? }));
await page.click('[data-id="kr-add-btn"]');
await page.setInputFiles('[data-id="kr-file-input"]', tmp2);
await page.waitForSelector('[data-id="kr-conflict-step"]');
check("conflict step shows 1 users", (await page.locator('[data-id="kr-conflict-step"]').innerText()).includes("1"));
await page.hover('[data-id="kr-conflict-step"] .cursor-help');
await page.waitForSelector('[data-id="kr-conflict-tooltip"]');
const tip = await page.locator('[data-id="kr-conflict-tooltip"]').innerText();
check("tooltip lists current ??next", tip.includes(u1) && tip.includes("?ê¸¸??) && tip.includes("?ˆì´ë¦?));
await page.hover('[data-id="kr-conflict-tooltip"]');
await page.waitForTimeout(150);
check("tooltip persists while hovered", await page.locator('[data-id="kr-conflict-tooltip"]').isVisible());
await page.click('[data-id="kr-skip-all"]');
await page.waitForSelector('[data-id="kr-result"]');
check("skip keeps value", (await page.locator('[data-id="kr-result"]').innerText()).includes("0"));
await page.click('[data-id="kr-close-btn"]');
check("table keeps old name", await page.locator("td", { hasText: "?ê¸¸?? }).count() >= 1);

// ??3ì°??„í¬????Overwrite all(ê°?êµì²´)
await page.click('[data-id="kr-add-btn"]');
await page.setInputFiles('[data-id="kr-file-input"]', tmp2);
await page.waitForSelector('[data-id="kr-conflict-step"]');
await page.click('[data-id="kr-overwrite-all"]');
await page.waitForSelector('[data-id="kr-result"]');
await page.click('[data-id="kr-close-btn"]');
await page.waitForTimeout(500);
check("overwrite replaces value", await page.locator("td", { hasText: "?ˆì´ë¦? }).count() >= 1);

check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
