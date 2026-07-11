// ?¼ì»¤ ?œê? ê²€???¤ëª¨????ë§??¤ì • ?‘ì—…???¼ì»¤: ?œê??´ë¦„ ê²€?‰Â·ì´ˆ?±Â·í•œê¸€ê·¸ë£¹(ë¶€??top-pin)Â·ko ? ê? primary e2e.
// ?¤í–‰: frontend/ ?ì„œ BASE_URL=http://localhost:3002 node scripts/pw-smoke-picker-korean.mjs
// ?„ì œ: ?Œí¬?¸ë¦¬ backend(:8001)+frontend(BASE_URL, BACKEND_URL=8001) ê¸°ë™, dev.db??ë©”ì¸ ?¬ë³¸(ë§µÂ·ë©¤ë²?ì¡´ìž¬).
// ?¬ì‹¤???„ì œ: sqlite3 backend/dev.db "UPDATE employees SET korean_name='', korean_dept='';" ë¡?ë¦¬ì…‹
//   (?€??? ì???ë§¤ë²ˆ ?ˆë¡œ ë½‘ë˜, korean_name???¨ì•„?ˆìœ¼ë©??„ë³´ ? ì • ë¡œì§???¬ë¼ì§?ë¿??œë‚˜ë¦¬ì˜¤ ?ì²´????ê¹¨ì§).
// ?•ë¦¬: ?ŒìŠ¤?¸ë§µ?€ ?¤í–‰ ë§ë? DELETE /api/maps/{id}ë¡??? œ(?Œí”„?¸ì‚­?œâ†’?´ì??? 7?????ë™ ?¼ì?).
// ?œì™¸: ?ìœ ê¶??´ì „(transfer-checkout-dialog)??filterByQuery ?„í™˜?€ ì²´í¬?„ì›ƒ ?íƒœ ?„ì œê°€ ë¬´ê±°??//   ???¤ëª¨?¬ì—???œì™¸ ??vitest(korean-dept.test.ts ?? + ?˜ë™ ?•ì¸ ?€??(task-5 ë¸Œë¦¬??ëª…ì‹œ).
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:7000";
const PLACEHOLDER = "Search by name or initial consonant??;
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` ??${detail}` : ""}`);
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

// ì¤€ë¹? admin.sys ?Œìœ  ?ŒìŠ¤?¸ë§µ ?ì„± + ?”ë ‰?°ë¦¬?ì„œ org_path ?ˆëŠ” ? ì? 1ëª?ê³¨ë¼
// ?œê??´ë¦„Â·?œê?ê·¸ë£¹ ?„í¬???¥í˜„ì§?/ AI Operationsê·¸ë£¹) ë¶€??
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => window.localStorage.setItem("bpm.lang", "en"));
const setup = await page.evaluate(async () => {
  const headers = { "Content-Type": "application/json", "X-Dev-User": "admin.sys" };
  const mapRes = await fetch("/api/maps", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `PW Smoke Picker Korean ${Date.now()}`,
      description: "",
      visibility: "private",
    }),
  });
  const map = await mapRes.json();

  const dir = await (await fetch("/api/directory", { headers })).json();
  const target = dir.users.find((u) => u.id !== "admin.sys" && u.org_path);
  if (!target) return { mapId: map.id, mapName: map.name, error: "no eligible directory user with org_path" };

  await fetch("/api/employees/korean-names", {
    method: "PUT",
    headers,
    body: JSON.stringify({
      mode: "overwrite",
      entries: { [target.id]: { name: "?¥í˜„ì§?, dept: "AI Operationsê·¸ë£¹" } },
    }),
  });

  return { mapId: map.id, mapName: map.name, targetId: target.id, targetName: target.name };
});
check(
  "setup: test map + korean employee (?¥í˜„ì§?AI Operationsê·¸ë£¹) seeded",
  Boolean(setup.mapId && setup.targetId),
  JSON.stringify(setup),
);

try {
  // ??ë§??¤ì • ì§„ìž… ???¨ì¼ ?¤í¬ë¡??˜ì´ì§€???‘ì—…???¹ì…˜?€ ??ƒ DOM???ˆìŒ(admin.sys=sysadmin?’owner?’canEdit).
  await page.goto(`${BASE}/maps/${setup.mapId}/settings`, { waitUntil: "domcontentloaded" });
  const collab = page.locator("#sec-collaborators");
  const searchInput = collab.locator(`input[placeholder="${PLACEHOLDER}"]`);
  await searchInput.waitFor({ timeout: 10000 });
  check("settings ??collaborators picker rendered", true);

  // ??en ëª¨ë“œ ??"?¥í˜„ì§? ê²€????? ì? ???¸ì¶œ, ?ë¬¸ ?´ë¦„??ë¨¼ì?Â·?œê???ê´„í˜¸ë¡?ë³´ì¡° ?œê¸°.
  await searchInput.fill("?¥í˜„ì§?);
  await page.waitForTimeout(200);
  const rowKr = collab.locator("button", { hasText: "?¥í˜„ì§? }).first();
  await rowKr.waitFor({ timeout: 5000 }).catch(() => {});
  const rowKrText = (await rowKr.innerText().catch(() => "")).replace(/\n/g, " ");
  const idxEn = rowKrText.indexOf(setup.targetName ?? "\0");
  const idxKr = rowKrText.indexOf("?¥í˜„ì§?);
  check(
    "en mode: korean name search hits user row, english name primary + ?¥í˜„ì§?secondary",
    idxEn !== -1 && idxKr !== -1 && idxEn < idxKr,
    rowKrText,
  );
  const rowKrType = (await rowKr.locator("span").last().innerText().catch(() => "")).trim();
  check("en mode: matched row type label is User", rowKrType === "User", rowKrType);

  // ??ì´ˆì„± "?ˆã…Ž?? ê²€?????™ì¼ ? ì? ë§¤ì¹˜ (?¥í˜„ì§?chosung = ?ˆã…Ž??
  await searchInput.fill("?ˆã…Ž??);
  await page.waitForTimeout(200);
  const rowChosung = collab.locator("button", { hasText: setup.targetName ?? "\0" }).first();
  await rowChosung.waitFor({ timeout: 5000 }).catch(() => {});
  check("chosung search ?ˆã…Ž??matches same user", await rowChosung.isVisible().catch(() => false));

  // ??"AI Operationsê·? (?œê?ê·¸ë£¹ ?¼ë?) ê²€????ë¶€????ª©??top-pin(ì²????€???¼ë²¨ë¡??ì •), ? ì? ë¬´ë”ê¸°ì— ??ë¬»íž˜.
  await searchInput.fill("AI Operationsê·?);
  await page.waitForTimeout(200);
  const firstRow = collab.locator("button").first();
  await firstRow.waitFor({ timeout: 5000 }).catch(() => {});
  const firstRowType = (await firstRow.locator("span").last().innerText().catch(() => "")).trim();
  check("korean dept keyword search: top row type is Department", firstRowType === "Department", firstRowType);

  // ??bpm.lang=ko ?¬ë¡œ?????™ì¼ ? ì? ê²€??????primaryê°€ "?¥í˜„ì§?
  await page.evaluate(() => window.localStorage.setItem("bpm.lang", "ko"));
  await page.reload({ waitUntil: "domcontentloaded" });
  const collabKo = page.locator("#sec-collaborators");
  const searchInputKo = collabKo.locator('input[placeholder="?´ë¦„ ?ëŠ” ì´ˆì„±?¼ë¡œ ê²€?‰â€?]');
  await searchInputKo.waitFor({ timeout: 10000 });
  await searchInputKo.fill("?¥í˜„ì§?);
  await page.waitForTimeout(200);
  const rowKo = collabKo.locator("button", { hasText: "?¥í˜„ì§? }).first();
  await rowKo.waitFor({ timeout: 5000 }).catch(() => {});
  const rowKoText = (await rowKo.innerText().catch(() => "")).replace(/\n/g, " ").trim();
  check("ko mode: row primary is ?¥í˜„ì§?, rowKoText.startsWith("?¥í˜„ì§?), rowKoText);

  check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
} finally {
  // ?•ë¦¬ ??setup?ì„œ ë§Œë“  ?ŒìŠ¤?¸ë§µ ?? œ(?Œí”„?¸ì‚­?œâ†’?´ì???. try ë¸”ë¡ ?¤íŒ¨?€ ë¬´ê??˜ê²Œ ??ƒ ?¤í–‰.
  if (setup.mapId) {
    const cleanup = await page.evaluate(async (mapId) => {
      const res = await fetch(`/api/maps/${mapId}`, {
        method: "DELETE",
        headers: { "X-Dev-User": "admin.sys" },
      });
      return { ok: res.ok, status: res.status };
    }, setup.mapId);
    check("cleanup: test map deleted", cleanup.ok, `status=${cleanup.status}`);
  }
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
