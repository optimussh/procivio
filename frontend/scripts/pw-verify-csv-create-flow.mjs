// CSV ?ì„± ?Œë¡œ??e2e ????ë¶„í•  ë²„íŠ¼ ??CSV ëª¨ë‹¬ ???ì„± ?¤ì´?¼ë¡œê·? 7?œë‚˜ë¦¬ì˜¤:
//   ???´ë¦½ë³´ë“œ ?´ë°± ???‰ë¬¸ HTTP ë¹?localhost ?¤ë¦¬ì§„ì—?œë§Œ ? íš¨. secure context(https/localhost)ë©?//     ??ë²„ê·¸(navigator.clipboard?.writeTextê°€ ì¡°ìš©???±ê³µ ?œì‹œ)???µê³¼?˜ë?ë¡?SKIP?¼ë¡œ ?¬ê²Œ ë³´ê³ ?œë‹¤.
//   ??ë¶„í•  ë²„íŠ¼: ?ë¸Œë¡???1??ª© ë©”ë‰´ ??CSV ëª¨ë‹¬. ë©”ë‰´ ?´ë¦° ì±??¼ìª½ [New map] ?´ë¦­ ??ë©”ë‰´ê°€ ?«íŒ????ë¸Œëœì¹˜ì˜ ?˜ì •).
//   ???Œì‹± ?ëŸ¬(ì¡´ì¬?˜ì? ?ŠëŠ” Next ?€??ê°€ ?ëŸ¬ ëª©ë¡???„ìš°ê³?[Confirm]??ë§‰ëŠ”??
//   ???”ì•½ ??[Continue] ???ì„± ?¤ì´?¼ë¡œê·??´ë¦„Â·?¤ëª…???•ì¥???€ ?Œì¼ëª…ìœ¼ë¡??„ë¦¬??
//   ???ì„± ?¤ì´?¼ë¡œê·??Œì¼ ?„ì½”?”ì–¸ ?¼ì¹¨/?‘í˜.
//   ???´ë‹¹??login_id ???´ë¦„ ?´ì„(?”ë ‰?°ë¦¬ ?°í???ì¡°íšŒ), ë¯¸í•´??? í°?€ ?ë¬¸ ?€??+ ë¹„ì°¨??ê²½ê³  ?•í™•??1ê±?
//   ??csv_manual_url??ë¹„ë©´ ë§¤ë‰´??ë²„íŠ¼???†ì–´???œë‹¤(ê°’ì´ ?ˆëŠ” ?˜ê²½?€ SKIP).
//
// ?¤í–‰ (frontend/ ?ì„œ):
//   bash:       node scripts/pw-verify-csv-create-flow.mjs
//   PowerShell: node scripts\pw-verify-csv-create-flow.mjs
//   ?œë²„(?‰ë¬¸ HTTP) ?€????? ì´ ?¤ê?ì¦ë˜??? ì¼???¤ë¦¬ì§?
//     bash:       BASE_URL=http://<?œë²„IP>:3333 node scripts/pw-verify-csv-create-flow.mjs
//     PowerShell: $env:BASE_URL="http://<?œë²„IP>:3333"; node scripts\pw-verify-csv-create-flow.mjs
// ?„ì œ:
//   backend :8000 ê¸°ë™
//     bash:       cd backend && AUTH_ENABLED=false .venv/bin/uvicorn app.main:app --port 8000
//     PowerShell: cd backend; $env:AUTH_ENABLED="false"; .venv\Scripts\uvicorn app.main:app --port 8000
//   frontend :3000 ê¸°ë™ ??cd frontend && npm run dev
//   playwright-core ?¤ì¹˜ ??npm i --no-save playwright-core
//   Chrome ê²½ë¡œê°€ ê¸°ë³¸ê°’ê³¼ ?¤ë¥´ë©?CHROME_PATH ?˜ê²½ë³€?˜ë¡œ ì§€??// ? ï¸ ?¨ì • (docs/lessons/browser-verification.md):
//   - ì¢€ë¹?next devê°€ :3000???ìœ ?˜ë©´ ???œë²„ê°€ :3001ë¡?ë°€???¡ì? ë¹Œë“œ??ë¶™ëŠ”?????¤í–‰ ??//     pkill -f "next dev" ???¬ê¸°?? ???¤í¬ë¦½íŠ¸????ë¸Œëœì¹˜ì˜ ë¶„í•  ë²„íŠ¼ ?ë¸Œë¡ ì´ ??ë³´ì´ë©?//     stale buildë¡??ë‹¨?˜ê³  ?¬ê²Œ ?¤íŒ¨?œë‹¤.
//   - dev.db ?¤ì—¼: ë§?1ê°œë? ë§Œë“¤ê³??ì— ?Œí”„?¸ì‚­?œí•œ?? ?„ì „ ë³µì›?€ git checkout backend/dev.db + ë°±ì—”???¬ì‹œ??
import { Buffer } from "node:buffer";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

const CHROME =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const BASE = process.env.BASE_URL ?? "http://localhost:7000";
const SHOTS = join(tmpdir(), "csv-create-flow");
mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` ??${detail}` : ""}`);
};
const skip = (name, reason) => console.log(`SKIP ${name} ??${reason}`);

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
// ?¸í˜?´ì? fetch ??AUTH_ENABLED=false ë°±ì—”?œëŠ” X-Dev-User ?¤ë”ë¡??¬ìš©?ë? ?ë³„?œë‹¤
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

// CSV ì¡°ë¦½ ??ì½¤ë§ˆ/?°ì˜´???¬í•¨ ?€?€ RFC4180 ?¸ìš©. ?¤ë” 9?´ì? ?œì„œ ë¬´ê??´ì?ë§??œí”Œë¦??œì„œë¥??´ë‹¤.
const q = (cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);
const HEADER = "Name,Description,Assignee,Department,System,Duration,URL,URL_Label,Next";
const csvOf = (rows) => [HEADER, ...rows.map((r) => r.map(q).join(","))].join("\n");

// ëª¨ë‹¬???¨ì? ?Œì¼ ?…ë ¥??CSVë¥?in-memory ?Œì¼ë¡?ì£¼ì… (?œë˜ê·??œë¡­ ê²½ë¡œ???€ì²?
const feedCsv = async (name, csv) => {
  await page.locator('input[accept=".csv,text/csv"]').setInputFiles({
    name,
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf-8"),
  });
  await page.waitForTimeout(400);
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
  console.error("  start it: cd backend && AUTH_ENABLED=false .venv/bin/uvicorn app.main:app --port 8000");
  await browser.close();
  process.exit(1);
}

// ?ì„± ë§??•ë¦¬????Create ??URL?ì„œ ì±„ìš´?? ?¤íŒ¨ ê²½ë¡œ ?€ë¹?? ì¼???´ë¦„?¼ë¡œ??ì°¾ëŠ”??
let mapId = null;
const stamp = Date.now();
const uniqueName = `sales-process pw-${stamp}`;
const bogusToken = `pw.bogus.${stamp}`;

try {
  // ?€?€ ?œë“œ ë°œê²¬ ???¤ì œ login_idÂ·ë¶€?œëŠ” ?°í???/api/directory?ì„œ ?»ëŠ”???€?€
  const me = await api("/me");
  const dir = await api("/directory");
  const deptNames = new Set(dir.departments.map((d) => d.name));
  // ë¶€???œë¦¬?„íŠ¸ ê²½ê³ ë¥??¼í•˜?¤ë©´ Department ?€??ê·??¬ëŒ???¤ì œ ë¶€?œë? ê·¸ë?ë¡??¤ì–´???œë‹¤
  // ??ë¶€?œê? ë¹„ì—ˆê±°ë‚˜ ?”ë ‰?°ë¦¬ ë¶€??ëª©ë¡???ˆëŠ” ?¬ìš©?ë§Œ ?„ë³´ë¡??¼ëŠ”??
  const usable = dir.users.filter((u) => u.department === "" || deptNames.has(u.department));
  const realUser = usable.find((u) => u.name && u.name !== u.id) ?? usable[0] ?? null;
  if (realUser === null) {
    skip("assignee resolution seed", "directory has no usable employee rows ??resolution checks will be skipped");
  }

  // ?€?€ ??ë¶„í•  ë²„íŠ¼ ???ë¸Œë¡?ë©”ë‰´ ??CSV ëª¨ë‹¬, ?¼ìª½ ?ˆë°˜??ë©”ë‰´ë¥??«ëŠ”???€?€
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-id="home-create-menu-toggle"]', { timeout: 15000 }).catch(() => {
    throw new Error(
      "split-button chevron missing on home ??a stale build is serving this port (zombie next dev on :3000?)",
    );
  });
  await page.locator('[data-id="home-create-menu-toggle"]').click();
  check("chevron opens the create menu", await page.locator('[data-id="home-create-from-csv"]').isVisible());
  // ë©”ë‰´ ?´ë¦° ì±??¼ìª½ [New map] ?´ë¦­ ??ë©”ë‰´ê°€ ?«í????œë‹¤ (??ë¸Œëœì¹˜ê? ê³ ì¹œ ë²„ê·¸)
  await page.getByRole("button", { name: "New map" }).first().click();
  await page.waitForTimeout(300);
  check(
    "left [New map] half closes the menu",
    (await page.locator('[data-id="home-create-from-csv"]').count()) === 0,
  );
  // ?¼ìª½ ?ˆë°˜?€ ë¹??ì„± ?¤ì´?¼ë¡œê·¸ë? ?°ë‹¤ ???«ê³ (?¤ì´?¼ë¡œê·??¤ì½”?„ì˜ X) CSV ê²½ë¡œë¡?ì§„í–‰
  await page.waitForSelector('[data-id="create-map-description"]');
  await page.locator('div.max-w-lg button[aria-label="Cancel"]').click();
  await page.waitForSelector('[data-id="create-map-description"]', { state: "detached" });

  await page.locator('[data-id="home-create-menu-toggle"]').click();
  await page.locator('[data-id="home-create-from-csv"]').click();
  await page.waitForSelector('[data-id="csv-dropzone"]');
  check("menu item opens the CSV modal", await page.locator('[data-id="csv-dropzone"]').isVisible());
  // ?”ë ‰?°ë¦¬ ë¡œë“œ ?„ë£Œê¹Œì? ?€ê¸???ë¡œë“œ ?„ì—” ?œë¡­ì¡´ì´ ë¹„í™œ?±ì´ê³??Œì¼??ì¡°ìš©??ë¬´ì‹œ?œë‹¤
  await page.waitForSelector('[data-id="csv-dropzone"]:not([disabled])', { timeout: 15000 });
  check(
    "template download and AI prompt buttons present",
    (await page.locator('[data-id="csv-template-download"]').isVisible()) &&
      (await page.locator('[data-id="csv-copy-ai-prompt"]').isVisible()),
  );
  await page.screenshot({ path: `${SHOTS}/01-csv-modal.png` });

  // ?€?€ ??ë§¤ë‰´??ë²„íŠ¼ ??csv_manual_url ë¹„ë©´ ?†ì–´???œë‹¤ ?€?€
  if ((me.csv_manual_url ?? "") === "") {
    check(
      "manual button absent while csv_manual_url is empty",
      (await page.locator('[data-id="csv-manual-link"]').count()) === 0,
    );
  } else {
    skip(
      "manual button absent while csv_manual_url is empty",
      `csv_manual_url is set on this server (${me.csv_manual_url}) ??asserting presence instead is meaningless for the default`,
    );
  }

  // ?€?€ ???´ë¦½ë³´ë“œ ???‰ë¬¸ HTTP ë¹?localhost ?¤ë¦¬ì§„ì—?œë§Œ ?˜ë?ê°€ ?ˆë‹¤ ?€?€
  const origin = await page.evaluate(() => ({ protocol: location.protocol, hostname: location.hostname }));
  const secureContext =
    origin.protocol === "https:" || origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
  if (secureContext) {
    skip(
      "clipboard fallback (execCommand) works without navigator.clipboard",
      `SECURE CONTEXT ${origin.protocol}//${origin.hostname} ??navigator.clipboard exists here, so the old bug` +
        " cannot reproduce and a pass proves nothing. Rerun with BASE_URL=http://<server-ip>:3333",
    );
  } else {
    check(
      "navigator.clipboard is undefined on this plain-HTTP origin",
      await page.evaluate(() => navigator.clipboard === undefined),
    );
    await page.locator('[data-id="csv-copy-ai-prompt"]').click();
    await page.waitForTimeout(150); // ?¼ë²¨ ê°±ì‹  ?€ê¸???copied??1200ms ???ë³µ?˜ë?ë¡?ê·??ˆì— ?½ëŠ”??    const copyLabel = await page.locator('[data-id="csv-copy-ai-prompt"]').innerText();
    check('copy button does not report "Copy failed"', !copyLabel.includes("Copy failed"), copyLabel);
    // ?¤ì œ ?´ë¦½ë³´ë“œ ?•ë³µ ???¤í¬?˜ì¹˜ textarea??ë¶™ì—¬?£ì–´ ?´ìš© ?•ì¸
    await page.evaluate(() => {
      const area = document.createElement("textarea");
      area.setAttribute("data-pw-paste", "1");
      area.style.position = "fixed";
      area.style.top = "0";
      area.style.left = "0";
      area.style.zIndex = "99999";
      document.body.appendChild(area);
    });
    await page.locator("[data-pw-paste]").click();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");
    await page.waitForTimeout(300);
    const pasted = await page.locator("[data-pw-paste]").inputValue();
    check(
      "pasted text starts with the AI prompt's first line",
      pasted.startsWith("?¹ì‹ ?€ ?…ë¬´ ?ˆì°¨ ë¶„ì„ê°€?…ë‹ˆ??),
      pasted === "" ? "(textarea stayed empty)" : pasted.slice(0, 40),
    );
    await page.evaluate(() => document.querySelector("[data-pw-paste]")?.remove());
  }

  // ?€?€ ???Œì‹± ?ëŸ¬ê°€ [Confirm]??ë§‰ëŠ”?????œë¡­ì¡??´ë¦­???Œì¼ ? íƒê¸°ë? ?°ë‹¤ ?€?€
  const badCsv = csvOf([["Step A", "", "", "", "", "", "", "", "Ghost step"]]);
  const chooserPromise = page.waitForEvent("filechooser", { timeout: 5000 });
  await page.locator('[data-id="csv-dropzone"]').click();
  const chooser = await chooserPromise.catch(() => null);
  check("dropzone click opens the file picker", chooser !== null);
  if (chooser !== null) {
    await chooser.setFiles({ name: "bad-flow.csv", mimeType: "text/csv", buffer: Buffer.from(badCsv, "utf-8") });
    await page.waitForTimeout(400);
  } else {
    await feedCsv("bad-flow.csv", badCsv); // ? íƒê¸°ê? ???´ë ¤???ëŸ¬ ì°¨ë‹¨ ê²€ì¦ì? ê³„ì†?œë‹¤
  }
  console.log("NOT COVERED: real drag-and-drop onto the dropzone ??synthetic DataTransfer drops are unreliable; the file-input path above covers parsing");
  await page.waitForSelector('[data-id="csv-create-errors"]');
  const errText = await page.locator('[data-id="csv-create-errors"]').innerText();
  check(
    "parse error names the missing Next target",
    errText.includes('Next target "Ghost step" not found'),
    errText.split("\n")[0] ?? "",
  );
  check("Confirm disabled while errors present", await page.locator('[data-id="csv-create-confirm"]').isDisabled());
  await page.screenshot({ path: `${SHOTS}/02-parse-errors.png` });

  // ?€?€ ?£â‘¥ ?•ìƒ CSV ???¤ì œ login_id 1ëª?+ ê°€ì§?? í° 1ê°? ê²½ê³ ???•í™•??1ê±??€?€
  const goodRows = [
    ["Draft proposal", "Write the draft", realUser ? realUser.id : "", realUser ? realUser.department : "", "", "", "", "", "Review proposal"],
    ["Review proposal", "", bogusToken, "", "", "", "", "", ""],
  ];
  await feedCsv("sales-process.csv", csvOf(goodRows));
  check("valid CSV clears the error list", (await page.locator('[data-id="csv-create-errors"]').count()) === 0);
  check("Confirm enabled for a valid CSV", await page.locator('[data-id="csv-create-confirm"]').isEnabled());
  await page.locator('[data-id="csv-create-confirm"]').click();
  await page.waitForSelector('[data-id="csv-create-summary"]');
  const summaryText = await page.locator('[data-id="csv-create-summary"]').innerText();
  // 2??+ ?ë™ Start/End = 4?¸ë“œ, Start?’Draft?’Review?’End = 3?£ì?
  check("summary reports 4 nodes and 3 connections", summaryText.includes("Creates 4 nodes Â· 3 connections"), summaryText.replace(/\n/g, " | ").slice(0, 120));
  const warnRows = await page
    .locator('[data-id="csv-create-summary"] p')
    .filter({ hasText: /^Row \d+:/ })
    .count();
  check(
    "exactly one non-blocking row warning (unknown assignee)",
    warnRows === 1 && summaryText.includes(`Unknown assignee "${bogusToken}"`),
    `warning rows=${warnRows}`,
  );
  await page.screenshot({ path: `${SHOTS}/03-summary.png` });

  // ?€?€ ??Continue ???ì„± ?¤ì´?¼ë¡œê·??„ë¦¬??(?•ì¥???€ ?Œì¼ëª? ?€?€
  await page.locator('[data-id="csv-create-continue"]').click();
  await page.waitForSelector('[data-id="create-map-description"]');
  const nameVal = await page.locator('input[placeholder="Map name"]').inputValue();
  check("map name prefilled from the file name", nameVal === "sales-process", `name=${nameVal}`);
  const descVal = await page.locator('[data-id="create-map-description"]').inputValue();
  check("description prefilled the same", descVal === "sales-process", `description=${descVal}`);

  // ?€?€ ???Œì¼ ?„ì½”?”ì–¸ ???”ì•½Â·ê²½ê³  ?¼ì¹¨/?‘í˜ ?€?€
  check("file summary hidden before expanding", (await page.locator('[data-id="csv-file-summary"]').count()) === 0);
  await page.locator('[data-id="csv-file-accordion"]').click();
  await page.waitForSelector('[data-id="csv-file-summary"]');
  const accText = await page.locator('[data-id="csv-file-summary"]').innerText();
  check(
    "accordion shows counts and the row warning",
    accText.includes("Creates 4 nodes Â· 3 connections") && accText.includes(`Unknown assignee "${bogusToken}"`),
    accText.replace(/\n/g, " | ").slice(0, 120),
  );
  await page.screenshot({ path: `${SHOTS}/04-accordion.png` });
  await page.locator('[data-id="csv-file-accordion"]').click();
  await page.waitForTimeout(200);
  check("accordion collapses again", (await page.locator('[data-id="csv-file-summary"]').count()) === 0);

  // ?€?€ ???ì„± ???¤ìš°??ë¶€???„ìˆ˜) + ê²°ì¬??ì¶”ê? ??Create ???ë””???´ë™ ?€?€
  // ?´ë¦„??? ì¼?˜ê²Œ ë°”ê¿” ?¤ë°?´í„° ì¶©ëŒÂ·?•ë¦¬ ?¤ì‚­?œë? ë§‰ëŠ”??(?„ë¦¬???¨ì–¸?€ ?„ì—???ë‚¬??
  await page.locator('input[placeholder="Map name"]').fill(uniqueName);

  // ?¤ìš°??ë¶€??? ê·œ ?„ìˆ˜ ?„ë“œ) ??ì²??¼ì»¤?ì„œ ? íƒ?´ì•¼ Createê°€ ?œì„±?”ëœ??
  // ?†ìœ¼ë©?ë§??ì²´ë¥?ëª?ë§Œë“œë¯€ë¡??¨ì? ??ê²€???„ì²´ë¥??¤í‚µ?œë‹¤(FATAL ë°©ì?).
  const owningDept = dir.departments[0] ?? null;
  if (owningDept === null) {
    for (const nm of [
      "created map opens in the editor with 4 nodes",
      "saved graph has the CSV rows plus auto start/end",
      "unresolvable token imported verbatim",
      "assignee login_id resolved to the display name",
    ]) {
      skip(nm, "directory has no departments ??required owning_department cannot be set");
    }
  } else {
    const owningInput = page.locator('input[placeholder^="Search by name"]').first();
    await owningInput.scrollIntoViewIfNeeded();
    await owningInput.click();
    await owningInput.fill(owningDept.name);
    await page.waitForSelector('[data-id="principal-picker-dropdown"]');
    await page.locator('[data-id="principal-picker-dropdown"] button').first().click();
    await page.waitForSelector('[data-id="owning-dept-selected"]');

    const approverInput = page.locator('input[placeholder^="Search by name"]').last();
    await approverInput.scrollIntoViewIfNeeded();
    await approverInput.click();
    await page.waitForSelector('[data-id="principal-picker-dropdown"]');
    await page.locator('[data-id="principal-picker-dropdown"] button').first().click();
    await page.waitForSelector('[data-id^="create-approver-pill-"]');
    await page.getByRole("button", { name: "Create", exact: true }).click();
    // ?±ê³µ = ?ë””?°ë¡œ ?´ë™. ?„í¬???¤íŒ¨ë©??¤ì´?¼ë¡œê·¸ê? ?¨ì•„ ?¬ê¸°???€?„ì•„????FAILë¡??œëŸ¬?œë‹¤.
    await page.waitForURL(/\/maps\/\d+/, { timeout: 20000 });
    mapId = Number(page.url().match(/\/maps\/(\d+)/)[1]);
    await page.waitForFunction(() => document.querySelectorAll(".react-flow__node").length >= 4, null, {
      timeout: 20000,
    });
    check("created map opens in the editor with 4 nodes", true, `mapId=${mapId}`);
    await page.screenshot({ path: `${SHOTS}/05-created-editor.png` });

    // ?€?¥ëœ ê·¸ë˜??ê²€ì¦????´ë‹¹???´ì„?€ ?¸ë“œ ?°ì´?°ë¡œ ê´€ì°°í•œ??    const detail = await api(`/maps/${mapId}`);
    const graph = await api(`/versions/${detail.versions[0].id}/graph`);
    const draft = graph.nodes.find((n) => n.title === "Draft proposal");
    const review = graph.nodes.find((n) => n.title === "Review proposal");
    check(
      "saved graph has the CSV rows plus auto start/end",
      graph.nodes.length === 4 && draft !== undefined && review !== undefined,
      `nodes=${graph.nodes.map((n) => n.title).join(",")}`,
    );
    check(
      "unresolvable token imported verbatim",
      review?.assignee === bogusToken,
      `assignee=${review?.assignee}`,
    );
    if (realUser && realUser.name !== realUser.id) {
      check(
        "assignee login_id resolved to the display name",
        draft?.assignee === realUser.name && draft?.assignee !== realUser.id,
        `assignee=${draft?.assignee} (id=${realUser.id})`,
      );
    } else {
      skip(
        "assignee login_id resolved to the display name",
        realUser ? `directory user ${realUser.id} has no distinct display name` : "no usable directory user",
      );
    }
  }

  console.log(
    "NOT COVERED: createdRef retry (Create re-click after a failed graph save must not duplicate the map) ??cannot force a deterministic save failure from the browser",
  );
} catch (err) {
  results.push({ name: "fatal", ok: false });
  console.error(`FATAL ${err instanceof Error ? err.message : String(err)}`);
} finally {
  // ?œë“œ ?•ë¦¬ ???Œí”„?¸ì‚­???´ì???. ?„ì „ ë³µì›?€ git checkout backend/dev.db + ë°±ì—”???¬ì‹œ??  if (mapId === null) {
    // ?ì„±?€ ?ëŠ”???´ë™ ?„ì— ì£½ì? ê²½ìš° ??? ì¼???´ë¦„?¼ë¡œ ì°¾ì•„??ì§€?´ë‹¤
    const leftovers = await api("/maps").catch(() => []);
    const leftover = leftovers.find((m) => m.name === uniqueName);
    if (leftover) mapId = leftover.id;
  }
  if (mapId !== null) await api(`/maps/${mapId}`, { method: "DELETE" }).catch(() => {});
}

console.log(`\nconsole errors: ${consoleErrors.length}`);
consoleErrors.slice(0, 5).forEach((e) => console.log("  " + e.slice(0, 160)));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
process.exit(failed.length === 0 && consoleErrors.length === 0 ? 0 : 1);
