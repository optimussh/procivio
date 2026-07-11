// ë¶€???œê?ëª?ë§¤í•‘ ?¤ëª¨????ë¶€???? korean dept ??+ ëª…ë‹¨ ?´íŒ(?´ë¦„ ?? 1?? e2e.
// ?¤í–‰: frontend/ ?ì„œ node scripts/pw-smoke-korean-dept.mjs
// ?„ì œ: ?Œí¬?¸ë¦¬ backend(:8001)+frontend(:3000, BACKEND_URL=8001) ê¸°ë™.
// ?¬ì‹¤???„ì œ: sqlite3 backend/dev.db "UPDATE employees SET korean_name='', korean_dept='';" ë¡?ë¦¬ì…‹.
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:7000";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` ??${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin.sys");
  window.localStorage.setItem("bpm.lang", "en");
});
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});

// ì¤€ë¹? 2???´ìƒ ë¶€???˜ë‚˜ ê³¨ë¼ ??? ì????œë¡œ ?¤ë¥¸ korean_dept ?œë“œ(?„í¬??API ê²½ìœ )
await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
const dir = await page.evaluate(async () => {
  const res = await fetch("/api/admin/users", { headers: { "X-Dev-User": "admin.sys" } });
  return res.json();
});
const byPath = new Map();
for (const u of dir.users) {
  const key = u.org_levels.join("/");
  if (!byPath.has(key)) byPath.set(key, []);
  byPath.get(key).push(u);
}
const target = [...byPath.entries()].find(([key, list]) => key && list.length >= 2);
if (!target) {
  console.log("FATAL: no department with 2+ members");
  process.exit(1);
}
const [targetPath, members] = target;
const deptLeaf = targetPath.split("/").at(-1);
await page.evaluate(
  async ({ a, b }) => {
    await fetch("/api/employees/korean-names", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Dev-User": "admin.sys" },
      body: JSON.stringify({
        mode: "overwrite",
        entries: {
          [a]: { name: "ê¹€?˜ë‚˜", dept: "ê·¸ë£¹?œì•ˆ" },
          [b]: { name: "ë°•ë‘˜", dept: "ê·¸ë£¹êµ¬ì•ˆ" },
        },
      }),
    });
  },
  { a: members[0].login_id, b: members[1].login_id },
);
check("seeded divergent korean_dept", true, `dept=${deptLeaf}`);

// ??ë¶€????ì§„ì… ??korean dept ??+ ?€??ë¶€????2???•ì¸.
// ë§¤í•‘ ?„í„°ê°€ ?†ì–´ì¡Œìœ¼ë¯€ë¡??€???‰ì? 25??ì²?‚¹ ?¤ì— ?ˆì„ ???ˆìŒ ????ë³´ì´ë©??¤í¬ë¡¤ë¡œ ?¼í‹°?ì„ ë°€??ì¶”ê? ë¡œë“œ.
await page.getByRole("button", { name: "Departments", exact: true }).click();
await page.waitForSelector('[data-id="dept-row"]');
check("dept tab entered", true);
const targetRow = page.locator('[data-id="dept-row"]', { hasText: deptLeaf }).first();
for (let i = 0; i < 20 && (await targetRow.count()) === 0; i++) {
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(150);
}
await targetRow.waitFor({ timeout: 10000 });
const cellText = await targetRow.locator('[data-id="dept-kr-cell"]').innerText();
check("two korean-dept pills", cellText.includes("ê·¸ë£¹?œì•ˆ") && cellText.includes("ê·¸ë£¹êµ¬ì•ˆ"));

// ???¸ì›???¸ë²„ ??ëª…ë‹¨ ?´íŒ(?´ë¦„ ?? 1??
await targetRow.locator(".cursor-help").hover();
await page.waitForSelector('[data-id="dept-roster-tooltip"]');
const roster = await page.locator('[data-id="dept-roster-tooltip"]').innerText();
check("roster tooltip shows names", roster.includes("ê¹€?˜ë‚˜") || roster.includes(members[0].name));

check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
