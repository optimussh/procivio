// ?¤ìš°??ë¶€??owning department) e2e ??8?œë‚˜ë¦¬ì˜¤ (brief 6ê°?+ ë¦¬ë·° ?”ì²­ 2ê°?ì¶”ê?):
//   ???ì„± ?¤ì´?¼ë¡œê·? ?´ë¦„+?¹ì¸?ë§Œ ì±„ìš°ë©?Create ë¹„í™œ?? requiredHint ?¸ì¶œ.
//   ???¤ìš°??ë¶€???¼ì»¤?ì„œ ë¶€??? íƒ ??ë¶€?œìž¥(manager) ?¹ì¸??pill ?ë™ ì¶”ê?.
//   ??? ê¸ˆ ?œì‹œ(? íƒ ë¸”ë¡Â·?‘ì—…??ëª©ë¡ ?? ?•ì¸ ???ë™ pill ?œê±° ???¹ì¸???¼ì»¤ ë¸Œë¼?°ì¦ˆ ??//     ?œê±°??ë¦¬ë”ê°€ ?¤ì‹œ ìµœìƒ??Dept Lead ë°°ì?)?¼ë¡œ ?¨ëŠ”ì§€ ?•ì¸.
//   ??Create ???ë””??ì§„ìž… ???¤ì • ?˜ì´ì§€???¤ìš°??ë¶€???œì‹œ.
//   ???? ?œë“œ???„ë½ ë§?idx%3==0)??ë°°ì? ??Missing ?„í„° ??ëª©ë¡???„ë½ ë§µë§Œ ?¨ëŠ”ì§€ ?•ì¸.
//   ??sysadmin(admin.sys)?¼ë¡œ ?„ë½ ë§??¤ì • ??Assign ??ë¶€??? íƒ ???œì‹œ ?„í™˜ + ?‘ì—…??? ê¸ˆ ??
//   ??ë¦¬ë”-?˜ë™ì¶”ê? ê²¹ì¹¨: ?¹ì¸???¼ì»¤?ì„œ ë¦¬ë”ë¥?ë¨¼ì? ?˜ë™ ì¶”ê? ??ê·?ë¦¬ë”ê°€ manager??ë¶€?œë?
//     ?¤ìš°??ë¶€?œë¡œ ? íƒ(?ë™ ì¶”ê???dedup?¼ë¡œ ?¤í‚µ) ???¤ìš°??ë¶€???´ì œ ???˜ë™ pill???¨ëŠ”ì§€ ?•ì¸.
//   ???‘ì—…???¨ë„ ë¹?ë¬¸êµ¬: ?¤ìš°??ë¶€?œê? ì§€?•ëœ ? ê·œ ë§µì˜ ?¤ì •>Collaborators?ì„œ
//     "No collaborators yet."??? ê¸ˆ ?‰ê³¼ ?™ì‹œ??ë³´ì´ì§€ ?Šì•„??PASS.
//
// ?¬ì „ ?¤ì •(SETUP): seed_org_demo.py??DeptInfo(ë¶€?œìž¥) ?Œì´ë¸”ì„ ?œë“œ?˜ì? ?ŠëŠ”???´ë“œë¯?JSON
// ?„í¬???„ìš©, tests/conftestë§?ì§ì ‘ seed) ???¡â‘¢?¥â‘¦(ë¦¬ë” ?ë™ì¶”ê?Â·?€ê³ ì •)???œì—°?˜ë ¤ë©?ìµœì†Œ
// ë¶€?œìž¥ 1ëª…ì´ ?„ìš”?? ???¤í¬ë¦½íŠ¸ê°€ ?¤í–‰ ?œì ??/api/admin/dept-info PUT?¼ë¡œ ë¶€?œìž¥ 1ëª…ì„
// ?¬ëŠ”???”ë ‰?°ë¦¬?ì„œ ?°í???? íƒ, ?˜ë“œì½”ë”© ?„ë‹˜). ? ï¸ ??PUT?€ dev.db???êµ¬ ë°˜ì˜?œë‹¤(?œë“œ
// ?¬ì‹¤???„ê¹Œì§€) ???„ì „ ë³µì›?€ docs/lessons/browser-verification.md?€ë¡?// git checkout backend/dev.db + ë°±ì—”???¬ì‹œ??
//
// ?¤í–‰ (frontend/ ?ì„œ):
//   bash:       node scripts/pw-verify-owning-dept.mjs
//   PowerShell: node scripts\pw-verify-owning-dept.mjs
// ?„ì œ:
//   backend :8000 ê¸°ë™ ??cd backend && .venv/bin/uvicorn app.main:app --port 8000
//   frontend :3000 ê¸°ë™ ??cd frontend && npm run dev
//   playwright-core ?¤ì¹˜ ??npm i --no-save playwright-core
//   Chrome ê²½ë¡œê°€ ê¸°ë³¸ê°’ê³¼ ?¤ë¥´ë©?CHROME_PATH ?˜ê²½ë³€?˜ë¡œ ì§€??// ? ï¸ ?¨ì • (docs/lessons/browser-verification.md):
//   - ì¢€ë¹?next devê°€ :3000???ìœ ?˜ë©´ ???œë²„ê°€ :3001ë¡?ë°€???¡ì? ë¹Œë“œ??ë¶™ëŠ”?????¤í–‰ ??//     pkill -f "next dev" ???¬ê¸°??
//   - dev.db ?¤ì—¼: ???¤í¬ë¦½íŠ¸???¥ì—???œë“œ ë§?1ê°œì˜ owning_departmentë¥??êµ¬ ì§€?•í•˜ê³??˜ëŒë¦¬ëŠ”
//     API ?†ìŒ), SETUP?ì„œ DeptInfo 1?‰ì„ ?¬ëŠ”?? ?„ì „ ë³µì›?€ git checkout backend/dev.db +
//     ë°±ì—”???¬ì‹œ?? ???£Â·â‘§?ì„œ ë§Œë“  ë§?1ê°œëŠ” ?¤í¬ë¦½íŠ¸ ì¢…ë£Œ ???Œí”„?¸ì‚­?œë¡œ ?•ë¦¬?œë‹¤.
import { chromium } from "playwright-core";

const CHROME =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const BASE = process.env.BASE_URL ?? "http://localhost:7000";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` ??${detail}` : ""}`);
};
const section = (title) => console.log(`\n=== ${title} ===`);

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

// ?€?€ ?¬í¼ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// ?¸íŽ˜?´ì? fetch ??AUTH_ENABLED=false ë°±ì—”?œëŠ” X-Dev-User ?¤ë”ë¡??¬ìš©?ë? ?ë³„?œë‹¤
const api = (path, { method = "GET", body, user = "admin.sys" } = {}) =>
  page.evaluate(
    async ({ path, method, body, user }) => {
      const res = await fetch(`/api${path}`, {
        method,
        headers: { "Content-Type": "application/json", "X-Dev-User": user },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`${method} ${path} ??${res.status} ${text.slice(0, 200)}`);
      return text ? JSON.parse(text) : null;
    },
    { path, method, body, user },
  );

// principal-picker ê²€???…ë ¥ ???????¤ìš°??ë¶€?œÂ·í˜‘?…ìžÂ·?¹ì¸?????™ì‹œ???Œë”?????ˆì–´
// placeholderë§Œìœ¼ë¡œëŠ” êµ¬ë¶„ ???? ?¸ì¶œë¶€ê°€ DOM ?œì„œ?ì˜ ?¸ë±?¤ë? ?˜ê¸´???¤ìš°??ë¯¸ì„ ????// ?¤ìš°??0)Â·?‘ì—…??1)Â·?¹ì¸??2), ? íƒ ?„ì—” ?¤ìš°???…ë ¥???¸ë§ˆ?´íŠ¸?˜ì–´ ?‘ì—…??0)Â·?¹ì¸??1)).
const pickerInputs = () => page.locator('input[placeholder^="Search by name"]');
const selectViaPicker = async (inputIndex, query) => {
  const input = pickerInputs().nth(inputIndex);
  await input.click();
  await input.fill(query);
  await page.waitForSelector('[data-id="principal-picker-dropdown"]');
  await page.waitForTimeout(200); // ?„í„°ë§?ë¦¬ë Œ???€ê¸?  await page.locator('[data-id="principal-picker-dropdown"] button').first().click();
  await page.waitForTimeout(150);
};

// ?€?€ ?œë²„ ?„ë¡œë¸???ë¯¸ê¸°?™ì´ë©??¬ê²Œ, ëª…í™•?˜ê²Œ ?¤íŒ¨ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
try {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 15000 });
} catch {
  console.error(`FATAL frontend not reachable at ${BASE}`);
  console.error('  start it: cd frontend && npm run dev   (kill zombies first: pkill -f "next dev")');
  await browser.close();
  process.exit(1);
}
const backendStatus = await page.evaluate(async () => {
  try {
    const res = await fetch("/api/maps", { headers: { "X-Dev-User": "admin.sys" } });
    return res.status;
  } catch {
    return 0;
  }
});
if (backendStatus !== 200) {
  console.error(`FATAL backend not reachable through ${BASE}/api (GET /api/maps ??${backendStatus})`);
  console.error("  start it: cd backend && .venv/bin/uvicorn app.main:app --port 8000");
  await browser.close();
  process.exit(1);
}

let mapAId = null; // ?œë‚˜ë¦¬ì˜¤???£Â·â‘§?ì„œ ë§Œë“œ????ë§????ì— ?Œí”„?¸ì‚­?œë¡œ ?•ë¦¬

try {
  // ?€?€ SETUP ??ë¶€?œìž¥ ?½ìŠ¤ì²? ?œë“œê°€ DeptInfoë¥?ì±„ìš°ì§€ ?Šì•„ ?°í??„ì— 1ê±??¬ëŠ”???€?€
  section("SETUP ??seed a department manager via /api/admin/dept-info (DeptInfo not covered by seed_org_demo)");
  const me = await api("/me");
  const dirBefore = await api("/directory");
  const fixtureDept = dirBefore.departments.find((d) => d.name.length > 0);
  const fixtureManager = dirBefore.users.find((u) => u.id !== me.username);
  if (!fixtureDept || !fixtureManager) {
    throw new Error("directory has no usable department/user to seed a manager fixture");
  }
  await api("/admin/dept-info", {
    method: "PUT",
    body: { entries: { [fixtureDept.name]: { manager: fixtureManager.id } } },
  });
  const dirAfter = await api("/directory");
  const dept = dirAfter.departments.find((d) => d.id === fixtureDept.id);
  check(
    "fixture department now has a non-empty manager",
    dept?.manager === fixtureManager.id,
    `dept=${dept?.id} manager=${dept?.manager}`,
  );

  // ?€?€ ??New map ?¤ì´?¼ë¡œê·????´ë¦„+?¹ì¸?ë§Œ ì±„ìš°ë©?Create ë¹„í™œ?? requiredHint ?¸ì¶œ ?€?€
  section("??create dialog: owning department required before Create enables");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New map" }).first().click();
  await page.waitForSelector('[data-id="create-map-description"]');
  const mapName = `T8 owning-dept pw-${Date.now()}`;
  await page.locator('input[placeholder="Map name"]').fill(mapName);
  // ?¹ì¸?ë¡œ ë³¸ì¸(admin.sys) ì¶”ê? ???¤ìš°??ë¯¸ì„ ???íƒœ???…ë ¥ ?¸ë±?¤ëŠ” ?¤ìš°??0)Â·?‘ì—…??1)Â·?¹ì¸??2)
  await selectViaPicker(2, me.username);
  check(
    "approver pill added for self",
    (await page.locator(`[data-id="create-approver-pill-${me.username}"]`).count()) === 1,
  );
  const createBtn = page.getByRole("button", { name: "Create", exact: true });
  check("Create disabled without an owning department", await createBtn.isDisabled());
  check(
    "requiredHint shown",
    (await page.locator("text=Select the owning department.").count()) > 0,
  );

  // ?€?€ ???¤ìš°??ë¶€???¼ì»¤?ì„œ ë¶€??? íƒ ??ë¶€?œìž¥ ?¹ì¸??pill ?ë™ ì¶”ê? ?€?€
  section("??picking the owning department auto-adds its leader as an approver");
  // manager ë¡œê·¸?¸idë¡?ê²€????ë¶€?œëª… ?€??ë¦¬ë” ?¤ì›Œ?œë¡œ ë§¤ì¹˜?˜ë©´ ì¡°ì§ ?¸ë¦¬ leafëª?ì¤‘ë³µê³?ë¬´ê??´ì§„??  await selectViaPicker(0, fixtureManager.id);
  check("owning-dept-selected block visible", await page.locator('[data-id="owning-dept-selected"]').isVisible());
  const selectedText = await page.locator('[data-id="owning-dept-selected"]').innerText();
  check("selected block shows the picked department", selectedText.includes(dept.id), selectedText.slice(0, 80));
  check(
    "department leader auto-added as an approver pill",
    (await page.locator(`[data-id="create-approver-pill-${fixtureManager.id}"]`).count()) === 1,
  );

  // ?€?€ ??? ê¸ˆ ?œì‹œ ?•ì¸ ???ë™ pill ?œê±° ???¹ì¸???¼ì»¤ ë¸Œë¼?°ì¦ˆ ??ë¦¬ë”ê°€ ?¤ì‹œ ìµœìƒ??Dept Lead) ?€?€
  section("??locked row + removed leader re-surfaces pinned at top of the approver picker");
  check(
    "owning-dept-locked-row visible in the collaborators list",
    await page.locator('[data-id="owning-dept-locked-row"]').isVisible(),
  );
  await page.locator(`[data-id="create-approver-pill-${fixtureManager.id}"] button`).click();
  check(
    "auto-added leader pill removed",
    (await page.locator(`[data-id="create-approver-pill-${fixtureManager.id}"]`).count()) === 0,
  );
  // ?¤ìš°??ë¶€?œê? ?´ë? ? íƒ???íƒœ???…ë ¥ ?¸ë±?¤ëŠ” ?‘ì—…??0)Â·?¹ì¸??1)
  const approverInputAfterOwning = pickerInputs().nth(1);
  await approverInputAfterOwning.click();
  await page.waitForSelector('[data-id="principal-picker-dropdown"]');
  await page.waitForTimeout(200);
  const firstItemText = await page.locator('[data-id="principal-picker-dropdown"] button').first().innerText();
  check(
    "removed leader reappears pinned at top with the Dept Lead badge",
    firstItemText.includes(fixtureManager.id) && firstItemText.includes("Dept Lead"),
    firstItemText.replace(/\n/g, " | ").slice(0, 100),
  );
  await page.keyboard.press("Escape");

  // ?€?€ ??Create ???ë””??ì§„ìž… ???¤ì • ?˜ì´ì§€???¤ìš°??ë¶€???œì‹œ ?€?€
  section("??create ??editor ??settings shows the owning department");
  check("Create enabled (self approver remains, owning dept set)", await createBtn.isEnabled());
  await createBtn.click();
  await page.waitForURL(/\/maps\/\d+/, { timeout: 20000 });
  mapAId = Number(page.url().match(/\/maps\/(\d+)/)[1]);
  check("map created and opened in the editor", true, `mapId=${mapAId}`);
  await page.goto(`${BASE}/maps/${mapAId}/settings`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-id="settings-owning-dept"]');
  const settingsText = await page.locator('[data-id="settings-owning-dept"]').innerText();
  check("settings page shows the owning department", settingsText.includes(dept.id), settingsText.slice(0, 100));

  // ?€?€ ???‘ì—…???¨ë„ ë¹?ë¬¸êµ¬ ??? ê¸ˆ ?‰ê³¼ ?™ì‹œ???¨ë©´ ????(ê°™ì? ?¤ì • ?˜ì´ì§€, ?´ì–´???•ì¸) ?€?€
  section("??collaborators panel: empty-list note must not coexist with the locked row");
  await page.waitForSelector("#sec-collaborators");
  check(
    "owning-dept locked row visible in collaborators section",
    await page.locator('#sec-collaborators [data-id="owning-dept-locked-row"]').isVisible(),
  );
  const collabText = await page.locator("#sec-collaborators").innerText();
  check('"No collaborators yet." not shown alongside the locked row', !collabText.includes("No collaborators yet."));

  // ?€?€ ???????„ë½ ë§?ë°°ì? + Missing ?„í„° ?€?€
  section("??home: missing-owning badge + Missing filter");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const maps = await api("/maps");
  const missingMaps = maps.filter((m) => !m.owning_department);
  check(
    "seed produced missing-owning maps (idx%3==0)",
    missingMaps.length >= 4,
    `count=${missingMaps.length}`,
  );
  const missingSample = missingMaps[0];
  const assignedSample = maps.find((m) => m.owning_department && m.id !== mapAId);
  const missingCard = page.locator('[data-id="map-card"]').filter({ hasText: missingSample.name });
  check(
    "missing map shows the owning-missing badge",
    await missingCard.locator('[data-id="map-card-owning-missing"]').isVisible(),
  );
  await page.locator('[data-id="home-owning-filter"]').click();
  await page.getByRole("button", { name: "Missing owning dept" }).click();
  await page.waitForTimeout(300);
  check(
    "Missing filter keeps the missing map",
    (await page.locator('[data-id="map-card"]').filter({ hasText: missingSample.name }).count()) > 0,
  );
  check(
    "Missing filter hides an assigned map",
    (await page.locator('[data-id="map-card"]').filter({ hasText: assignedSample.name }).count()) === 0,
  );
  const cardCount = await page.locator('[data-id="map-card"]').count();
  const badgeCount = await page.locator('[data-id="map-card-owning-missing"]').count();
  check(
    "every card visible under the filter carries the missing badge",
    cardCount === badgeCount && cardCount > 0,
    `cards=${cardCount} badges=${badgeCount}`,
  );
  await page.locator('[data-id="home-filter-clear"]').click();

  // ?€?€ ??sysadmin?¼ë¡œ ?„ë½ ë§??¤ì • ??Assign ???‘ì—…??? ê¸ˆ ??ë°˜ì˜ ?€?€
  section("??sysadmin assigns the owning department from settings");
  await page.goto(`${BASE}/maps/${missingSample.id}/settings`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-id="settings-owning-dept"]');
  check("missing map shows the Assign prompt", await page.locator('[data-id="owning-dept-assign"]').isVisible());
  await page.locator('[data-id="owning-dept-assign"]').click();
  // ?¤ì • ?”ë©´???¤ìš°???¼ì»¤(0)ê°€ ?‘ì—…???¹ì…˜???ì‹œ ?¼ì»¤(1)ë³´ë‹¤ DOM??ë¨¼ì? ?¨ë‹¤
  await selectViaPicker(0, fixtureManager.id);
  check("Assign switched to the Change control", await page.locator('[data-id="owning-dept-change"]').isVisible());
  const settingsText2 = await page.locator('[data-id="settings-owning-dept"]').innerText();
  check("assigned department shown", settingsText2.includes(dept.id), settingsText2.slice(0, 100));
  await page.waitForSelector("#sec-collaborators");
  check(
    "collaborators locked row appears reactively (no reload)",
    await page.locator('#sec-collaborators [data-id="owning-dept-locked-row"]').isVisible(),
  );

  // ?€?€ ??ë¦¬ë”-?˜ë™ì¶”ê? ê²¹ì¹¨ ???˜ë™ pill???ë™ì¶”ê? dedupÂ·clearë¥?ëª¨ë‘ ?´ì•„?¨ëŠ”ì§€ ?€?€
  section("??manually-added leader survives owning-dept auto-add dedup and clear");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New map" }).first().click();
  await page.waitForSelector('[data-id="create-map-description"]');
  await page.locator('input[placeholder="Map name"]').fill(`T8 leader-overlap pw-${Date.now()}`);
  // Public ???¹ì¸???„ë³´êµ°ì„ ??ì§ì›?¼ë¡œ ?“í? ë¶€??ë¬´ê? ?†ì´??ë¦¬ë”ë¥??˜ë™ ì¶”ê??????ˆê²Œ ?œë‹¤.
  // ?¹ì¸?ê? ?„ì§ 0ëª…ì´???•ì¸ ëª¨ë‹¬ ?†ì´ ì¦‰ì‹œ ?ìš©?œë‹¤.
  // ?¤ì´?¼ë¡œê·??¤ì½”???„ìˆ˜ ?????”ë©´ ?ì²´??ê°€?œì„± ?„í„°?ë„ ?™ëª… "Public" ë²„íŠ¼???ˆì–´
  // ?˜ì´ì§€ ?„ì—­ getByRole?€ strict-mode ?„ë°˜(2ê°?ë§¤ì¹˜)?¼ë¡œ ?°ì§„??
  await page.locator("div.max-w-lg").getByRole("button", { name: "Public", exact: true }).click();
  await selectViaPicker(2, fixtureManager.id); // ?¤ìš°??ë¯¸ì„ ???íƒœ ???¹ì¸???…ë ¥?€ ?¸ë±??2
  check(
    "leader manually added as an approver first",
    (await page.locator(`[data-id="create-approver-pill-${fixtureManager.id}"]`).count()) === 1,
  );
  await selectViaPicker(0, fixtureManager.id); // ê·?ë¦¬ë”ê°€ manager??ë¶€?œë? ?¤ìš°??ë¶€?œë¡œ ? íƒ
  check("owning dept selected", await page.locator('[data-id="owning-dept-selected"]').isVisible());
  check(
    "dedup ??no duplicate approver pill after auto-add would-be leader",
    (await page.locator(`[data-id="create-approver-pill-${fixtureManager.id}"]`).count()) === 1,
  );
  await page.locator('[data-id="owning-dept-selected"] button').click(); // ?¤ìš°??ë¶€??Xë¡??´ì œ
  check("owning dept cleared", (await page.locator('[data-id="owning-dept-selected"]').count()) === 0);
  check(
    "manually-added leader pill survives the clear",
    (await page.locator(`[data-id="create-approver-pill-${fixtureManager.id}"]`).count()) === 1,
  );
  await page.keyboard.press("Escape");
  await page.locator('div.max-w-lg button[aria-label="Cancel"]').click();
} catch (err) {
  results.push({ name: "fatal", ok: false });
  console.error(`FATAL ${err instanceof Error ? err.message : String(err)}`);
} finally {
  // ???£Â·â‘§?ì„œ ë§Œë“  ??ë§µë§Œ ?•ë¦¬(?Œí”„?¸ì‚­??. ?¥ì˜ ?œë“œ ë§?owning_departmentÂ·SETUP??DeptInfo??  // ?˜ëŒë¦¬ëŠ” APIê°€ ?†ë‹¤ ???„ì „ ë³µì›?€ git checkout backend/dev.db + ë°±ì—”???¬ì‹œ??
  if (mapAId !== null) await api(`/maps/${mapAId}`, { method: "DELETE" }).catch(() => {});
}

console.log(`\nconsole errors: ${consoleErrors.length}`);
consoleErrors.slice(0, 5).forEach((e) => console.log("  " + e.slice(0, 160)));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
process.exit(failed.length === 0 && consoleErrors.length === 0 ? 0 : 1);
