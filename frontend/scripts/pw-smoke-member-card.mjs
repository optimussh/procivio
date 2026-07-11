// ë©¤ë²„ ì¹´ë“œ ?¤ëª¨???????ì„¸ ?¨ë„: Me ë±ƒì?Â·?´ë¦„ ????? ê?(?¼ì¹¨ alt ??Â·ê·¸ë£¹ ?´ë¦„ ?´ì„ e2e.
// ?¤í–‰: frontend/ ?ì„œ BASE_URL=http://localhost:3002 node scripts/pw-smoke-member-card.mjs
// ?„ì œ: ?Œí¬?¸ë¦¬ backend(:8001)+frontend(BASE_URL, BACKEND_URL=8001) ê¸°ë™, dev.db??ë©”ì¸ ?¬ë³¸(ë§µÂ·ë©¤ë²?ì¡´ìž¬).
// ?€??? ì?/ë§µì? ?¤í¬ë¦½íŠ¸ê°€ ë§¤ë²ˆ ?ˆë¡œ ?ì„±(admin.sys ?Œìœ  ?ŒìŠ¤?¸ë§µ + ?‘ì—…?Â·ê·¸ë£?ë¶€???˜ë?ë¡?// ê¸°ì¡´ ?¤ëª¨??korean-names/korean-dept)ì²˜ëŸ¼ ?¬ì‹¤????ë¦¬ì…‹???„ìˆ˜???„ë‹ˆ?? ?œê??´ë¦„ ?”ì¡´???¼í•˜?¤ë©´
// sqlite3 backend/dev.db "UPDATE employees SET korean_name='', korean_dept='';" ???¤í–‰ ê¶Œìž¥.
// ?•ë¦¬: ?ŒìŠ¤?¸ë§µ?€ ?¤í–‰ ë§ë? DELETE /api/maps/{id}ë¡??? œ(?Œí”„?¸ì‚­?œâ†’?´ì??? 7?????ë™ ?¼ì?) ??// ë§?ëª©ë¡???¨ì? ?Šê³  dev.db ?‰ë§Œ deleted_at ê¸°ë¡ ?íƒœë¡??¼ì?ê¹Œì? ?”ë¥˜.
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:7000";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` ??${detail}` : ""}`);
};
const skip = (name, detail = "") => {
  results.push({ name, ok: true });
  console.log(`SKIP ${name}${detail ? ` ??${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
// bpm.lang?€ addInitScript???£ì? ?ŠìŒ ??addInitScript??ë§?navigation(reload ?¬í•¨)ë§ˆë‹¤ ?¬ì‹¤?‰ë˜??// ko ?„í™˜ ??reload ??ê°’ì„ en?¼ë¡œ ?˜ëŒ?¤ë²„ë¦?i18n?€ ë§ˆìš´????1?Œë§Œ localStorageë¥??½ìŒ, i18n.tsx:24-30).
await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin.sys");
});
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});

// ì¤€ë¹? admin.sys ?Œìœ  ?ŒìŠ¤?¸ë§µ ?ì„±(Me ë±ƒì? ?„ì œ) + ?‘ì—…??1ëª…Â·ê·¸ë£?1ê°?ë¶€??+ ?‘ì—…?ì— ?œê??´ë¦„ ?„í¬??await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => window.localStorage.setItem("bpm.lang", "en"));
const setup = await page.evaluate(async () => {
  const headers = { "Content-Type": "application/json", "X-Dev-User": "admin.sys" };
  const mapRes = await fetch("/api/maps", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `PW Smoke Member Card ${Date.now()}`,
      description: "",
      visibility: "private",
    }),
  });
  const map = await mapRes.json();

  const dir = await (await fetch("/api/directory", { headers })).json();
  const collaborator = dir.users.find((u) => u.id !== "admin.sys" && !u.korean_name);
  await fetch(`/api/maps/${map.id}/permissions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ principal_type: "user", principal_id: collaborator.id, role: "editor" }),
  });

  const groups = await (await fetch("/api/groups", { headers })).json();
  const group = groups.find((g) => g.status === "active") ?? null;
  if (group) {
    await fetch(`/api/maps/${map.id}/permissions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ principal_type: "group", principal_id: String(group.id), role: "editor" }),
    });
  }

  await fetch("/api/employees/korean-names", {
    method: "PUT",
    headers,
    body: JSON.stringify({ mode: "overwrite", entries: { [collaborator.id]: { name: "?ê¸¸?? } } }),
  });

  return { mapId: map.id, mapName: map.name, enName: collaborator.name, group };
});
check(
  "setup: test map + collaborator + korean name seeded",
  Boolean(setup.mapId && setup.enName),
  JSON.stringify(setup),
);

// ????ì§„ìž… ???ŒìŠ¤?¸ë§µ ì¹´ë“œ ?´ë¦­(?¨ë”© ?„ì¹˜ ??ì¤‘ì•™?€ ?´ë¦„ Link???´ë¹„ê²Œì´?˜ë¨) ???ì„¸ ?¨ë„
await page.reload({ waitUntil: "domcontentloaded" });
await page
  .locator('[data-id="map-card"]', { hasText: setup.mapName })
  .click({ position: { x: 8, y: 8 } });
const aside = page.locator('[data-id="map-detail-aside"]');
await aside.locator('[role="button"]').first().waitFor({ timeout: 10000 });
check("home ??map card click ??detail aside opened", true);

// Me ë±ƒì? ??admin.sysê°€ ?ŒìŠ¤?¸ë§µ ?ì„±?ë¼ ëª…ì‹œ owner ê¶Œí•œ??ë³´ìœ .
// waitFor(?„ìž¬ ë¡œê·¸??? ì???AuthGate ë¹„ë™ê¸?ë¡œë“œ??ìµœì´ˆ ?Œë”???„ì§ null ??isMe ?ì •???¤ëŠ¦ê²?ê°±ì‹ ??.
const meBadge = aside.locator('[data-id="member-me-badge"]');
await meBadge.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
check("me badge visible", await meBadge.isVisible());

// ??en ëª¨ë“œ ???´ë¦„ì¤??ë¬¸(?‘ì—…??enName, ?ê¸¸??ë¯¸ë…¸ì¶? ???´ë¦­ ?¼ì¹¨ ??alt ??"?ê¸¸??
const rowEn = aside.locator('[role="button"]', { hasText: setup.enName });
await rowEn.waitFor({ timeout: 10000 });
const nameLineEn = (await rowEn.locator("span.truncate").first().innerText()).trim();
check("en: name line shows english name (no ?ê¸¸??", nameLineEn === setup.enName, nameLineEn);
await rowEn.click();
await page.waitForTimeout(400);
const altEn = (await rowEn.locator('[data-id="member-alt-name"]').innerText()).trim();
check("en: expanded alt-name field shows ?ê¸¸??, altEn === "?ê¸¸??, altEn);

// ??ko ëª¨ë“œë¡??¬ë¡œ?????´ë¦„ì¤?"?ê¸¸?? ???´ë¦­ ?¼ì¹¨ ??alt ?„ì— ?ë¬¸ ?´ë¦„
await page.evaluate(() => window.localStorage.setItem("bpm.lang", "ko"));
await page.reload({ waitUntil: "domcontentloaded" });
await page
  .locator('[data-id="map-card"]', { hasText: setup.mapName })
  .click({ position: { x: 8, y: 8 } });
await aside.locator('[role="button"]').first().waitFor({ timeout: 10000 });
const rowKo = aside.locator('[role="button"]', { hasText: "?ê¸¸?? });
await rowKo.waitFor({ timeout: 10000 });
const nameLineKo = (await rowKo.locator("span.truncate").first().innerText()).trim();
check("ko: name line shows ?ê¸¸??, nameLineKo === "?ê¸¸??, nameLineKo);
await rowKo.click();
await page.waitForTimeout(400);
const altKo = (await rowKo.locator('[data-id="member-alt-name"]').innerText()).trim();
check("ko: expanded alt-name field shows english name", altKo === setup.enName, altKo);

// ??Me ë±ƒì? ?¬í™•??ko ëª¨ë“œ, ?¸ì–´ ë¬´ê? ?„ì´ì½?
const meBadgeKo = aside.locator('[data-id="member-me-badge"]');
await meBadgeKo.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
check("me badge still visible (ko)", await meBadgeKo.isVisible());

// ??ê·¸ë£¹ ì¹´ë“œ ???œë“œ??ê·¸ë£¹???ˆìœ¼ë©??´ë¦„???´ì„?˜ì–´ ë³´ìž„???•ì¸(?«ìž id ê·¸ë?ë¡??„ë‹˜). ?†ìœ¼ë©?SKIP ëª…ì‹œ.
if (setup.group) {
  const asideText = await aside.innerText();
  check(
    "group card shows resolved name (not raw numeric id)",
    asideText.includes(setup.group.name) && setup.group.name !== String(setup.group.id),
    setup.group.name,
  );
} else {
  skip("group card check", "no active group available in seeded data");
}

check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

// ?•ë¦¬ ??setup?ì„œ ë§Œë“  ?ŒìŠ¤?¸ë§µ ?? œ(?Œí”„?¸ì‚­?œâ†’?´ì???. ?¤íŒ¨???•ì§?˜ê²Œ exit ì½”ë“œ??ë°˜ì˜.
const cleanup = await page.evaluate(async (mapId) => {
  const res = await fetch(`/api/maps/${mapId}`, {
    method: "DELETE",
    headers: { "X-Dev-User": "admin.sys" },
  });
  return { ok: res.ok, status: res.status };
}, setup.mapId);
check("cleanup: test map deleted", cleanup.ok, `status=${cleanup.status}`);

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
