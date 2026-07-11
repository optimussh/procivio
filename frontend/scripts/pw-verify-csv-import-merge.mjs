// CSV ë¨¸ì? ?„í¬??e2e ??? ë‹› ?ŒìŠ¤?¸ê? ëª??¿ëŠ” 7?œë‚˜ë¦¬ì˜¤:
//   ??AI/CSV ?„ë¦¬ë·?ì¶©ëŒ(?„ë‹¬ ê°€?¥í•œ ?ˆë°˜: ?„ë¦¬ë·?ì¤??´ë°” Import ë²„íŠ¼ ?Œë©¸)
//   ??ë¨¸ì? ??ë¹„êµ ?”ë©´ ë¬´ì˜¤???£ì? added/removed 0) + ì½”ë©˜???ì¡´
//   ??ë¹??€?€ ê¸°ì¡´ ê°?ë³´ì¡´, Next???ë¦„ ?„ì²´ë¥???–´?€
//   ??CSV???†ëŠ” ?¸ë“œ ë¹¨ê°„ ?ì„  ??Delete/Keep ? íƒ
//   ???´ë‹¹??login_id ???´ë¦„ ?´ì„, ë¯¸í•´??? í°?€ ?ë¬¸ ?€??+ ë¹„ì°¨??ê²½ê³ 
//   ???´ë¦„ ë§¤ì¹­???œë¸Œ?„ë¡œ?¸ìŠ¤ ?¸ë“œ???€?…Â·ë§??ë³´ì¡´
//   ???„ë¦¬ë·?ì¤??¸ìŠ¤?™í„° ? ê¸ˆ(??·ì ‘ê¸?ë¹„í™œ?? + Cancel ë³µì›
//
// ?¤í–‰ (frontend/ ?ì„œ):
//   bash:       node scripts/pw-verify-csv-import-merge.mjs
//   PowerShell: node scripts\pw-verify-csv-import-merge.mjs
// ?„ì œ:
//   backend :8000 ê¸°ë™ ?? cd backend && AUTH_ENABLED=false .venv/bin/uvicorn app.main:app --port 8000
//   frontend :3000 ê¸°ë™ ??cd frontend && npm run dev
//   playwright-core ?¤ì¹˜ ??npm i --no-save playwright-core
// ? ï¸ ?¨ì • (docs/lessons/browser-verification.md):
//   - ì¢€ë¹?next devê°€ :3000???ìœ ?˜ë©´ ???œë²„ê°€ :3001ë¡?ë°€???¡ì? ë¹Œë“œ??ë¶™ëŠ”?????¤í–‰ ??pkill -f "next dev" ???¬ê¸°??
//   - dev.db ?¤ì—¼: ???¤í¬ë¦½íŠ¸??ë§?2ê°œë? ë§Œë“¤ê³??ì— ?Œí”„?¸ì‚­?œí•œ?? ?„ì „ ë³µì›?€ git checkout backend/dev.db + ë°±ì—”???¬ì‹œ??
//   - ?œë‚˜ë¦¬ì˜¤ ?¡ì˜ ë¹„êµ ?”ë©´?€ v1 ê²Œì‹œ(?¹ì¸ ?Œí¬?Œë¡œ)ê°€ ?„ìš” ??dev.db??ì§ì›(employees) ?‰ì´ ?†ìœ¼ë©?SKIP ì²˜ë¦¬?œë‹¤.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:7000";
const SHOTS = "/tmp/csv-import-merge";
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

// 32??hex id ???œë²„ê°€ ?€?¥í•˜???¸ë“œ/?£ì? id ?•ì‹ê³??™ì¼ (insecure context??crypto.randomUUID ê¸ˆì?)
const rid = () =>
  Array.from({ length: 32 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

// CSV ì¡°ë¦½ ??ì½¤ë§ˆ/?°ì˜´???¬í•¨ ?€?€ RFC4180 ?¸ìš©
const q = (cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);
const HEADER = "Name,Description,Assignee,Department,System,Duration,URL,URL_Label,Next";
const csvOf = (rows) => [HEADER, ...rows.map((r) => r.map(q).join(","))].join("\n");

// ?£ì?ë¥?"ì¶œë°œ?œëª©?’ë„ì°©ì œëª? ?•ë ¬ ë°°ì—´ë¡???id???„í¬?¸ë§ˆ???¬ìƒ?±ë˜ë¯€ë¡??œëª© ?ìœ¼ë¡?ë¹„êµ
const edgeTitles = (g) => {
  const titles = new Map(g.nodes.map((n) => [n.id, n.title]));
  return g.edges.map((e) => `${titles.get(e.source_node_id)}??{titles.get(e.target_node_id)}`).sort();
};

// ?´ë°” ??ëª¨ë‹¬ ??ë¶™ì—¬?£ê¸° ??Continue ???„ë¦¬ë·?ì§„ìž…
async function stageCsv(csv) {
  await page.locator('[data-id="toolbar-import-csv"]').click();
  await page.waitForSelector('[data-id="csv-import-section"]');
  await page.locator('[data-id="csv-paste-toggle"]').click();
  await page.locator('[data-id="csv-paste-input"]').fill(csv);
  await page.waitForTimeout(300);
  await page.locator('[data-id="csv-import-continue"]').click();
  await page.waitForSelector('[data-id="csv-import-tab"]');
}

async function applyPreview() {
  await page.locator('[data-id="csv-import-apply"]').click();
  // Import ???Œë©¸ = ?€???„ë£Œ ? í˜¸ (?¤íŒ¨ ???„ë¦¬ë·?? ì? ???€?„ì•„?ƒìœ¼ë¡?FAIL)
  await page.waitForSelector('[data-id="csv-import-tab"]', { state: "detached", timeout: 10000 });
  await page.waitForTimeout(400);
}

const openEditor = async (mapId, versionId) => {
  await page.goto(`${BASE}/maps/${mapId}?version=${versionId}`, { waitUntil: "networkidle" });
  await page
    .waitForSelector('[data-id="toolbar-import-csv"]', { timeout: 20000 })
    .catch(() => {
      throw new Error(
        "Import CSV toolbar button never appeared ??checkout/eligible not ready, or a stale build is serving :3000 (zombie next dev?)",
      );
    });
  // ìº”ë²„???¸ë“œ 6ê°?start/end ?¬í•¨)ê°€ ??ê·¸ë ¤ì§??¤ì—??ëª¨ë‹¬ base ê·¸ëž˜?„ê? ?„ì „?˜ë‹¤
  await page.waitForFunction(() => document.querySelectorAll(".react-flow__node").length >= 6, null, {
    timeout: 15000,
  });
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

let mapAId = null;
let mapBId = null;

try {
  // ?€?€ ?œë“œ ???œë¸Œ?„ë¡œ?¸ìŠ¤ ë§í¬ ?€??ë§?+ ë³?ë§?start?’Alpha?’Beta?’Gamma?’SubStep?’end) ?€?€
  const stamp = Date.now();
  // ?¤ìš°??ë¶€?œëŠ” ?„ìˆ˜ ?„ë“œ ???œë²„ê°€ known org_path ì¡´ìž¬ë¥?ê²€ì¦í•˜ë¯€ë¡??”ë ‰?°ë¦¬?ì„œ ?¤ì œ ë¶€??idë¥??»ëŠ”??  const dir0 = await api("/directory");
  const owningDept = dir0.departments[0]?.id;
  if (!owningDept) {
    console.error("FATAL directory has no departments ??cannot supply the required owning_department");
    await browser.close();
    process.exit(1);
  }
  const mapB = await api("/maps", {
    method: "POST",
    body: { name: `CSV-PW Sub ${stamp}`, description: "", visibility: "public", owning_department: owningDept },
  });
  mapBId = mapB.id;
  const mapA = await api("/maps", {
    method: "POST",
    body: { name: `CSV-PW Main ${stamp}`, description: "", visibility: "public", owning_department: owningDept },
  });
  mapAId = mapA.id;
  const v1 = mapA.versions[0].id;

  const NODE = {
    description: "", color: "", assignee: "", department: "", system: "", duration: "",
    url: "", url_label: "", pos_y: 0, group_ids: [],
    linked_map_id: null, follow_latest: false, linked_version_id: null, is_primary_end: false,
  };
  const ids = { Start: rid(), Alpha: rid(), Beta: rid(), Gamma: rid(), SubStep: rid(), End: rid() };
  // sort_orderÂ·?£ì? ë°©í–¥(right?’left)Â·?¼ë²¨("")??CSV ?¬êµ¬??ê²°ê³¼?€ ?¼ì¹˜?œì¼œ identity ë¨¸ì?ê°€ ë¬´ë?ê²½ì´ ?˜ê²Œ ?œë‹¤
  const seedGraph = {
    nodes: [
      { ...NODE, id: ids.Start, title: "Start", node_type: "start", pos_x: 0, sort_order: 0 },
      { ...NODE, id: ids.Alpha, title: "Alpha", node_type: "process", pos_x: 220, sort_order: 1, system: "ERP", description: "keep me" },
      { ...NODE, id: ids.Beta, title: "Beta", node_type: "process", pos_x: 440, sort_order: 2 },
      { ...NODE, id: ids.Gamma, title: "Gamma", node_type: "process", pos_x: 660, sort_order: 3 },
      { ...NODE, id: ids.SubStep, title: "SubStep", node_type: "subprocess", pos_x: 880, sort_order: 4, linked_map_id: mapBId },
      { ...NODE, id: ids.End, title: "End", node_type: "end", pos_x: 1100, sort_order: 5, is_primary_end: true },
    ],
    edges: [
      [ids.Start, ids.Alpha], [ids.Alpha, ids.Beta], [ids.Beta, ids.Gamma],
      [ids.Gamma, ids.SubStep], [ids.SubStep, ids.End],
    ].map(([s, t]) => ({
      id: rid(), source_node_id: s, target_node_id: t, label: "",
      source_side: "right", target_side: "left", source_handle: null, target_handle: null,
    })),
    groups: [],
  };
  await api(`/versions/${v1}/checkout`, { method: "POST", body: { force: false } });
  await api(`/versions/${v1}/graph`, { method: "PUT", body: seedGraph });

  // ?€?€ v1 ê²Œì‹œ + v2(To-Be) ?´ë¡  ??ë¹„êµ ?”ë©´(?œë‚˜ë¦¬ì˜¤ ???? ?¤íŒ¨?˜ë©´ v1?ì„œ ê³„ì† + ë¹„êµë§?SKIP ?€?€
  let workV = v1;
  let compareReady = false;
  let submitted = false;
  try {
    const dir = await api("/directory");
    const approver = (dir.users.find((u) => u.id === "admin.sys") ?? dir.users[0])?.id;
    if (!approver) throw new Error("directory has no employees ??approval quorum impossible");
    await api(`/maps/${mapAId}/approvers`, { method: "PUT", body: { user_ids: [approver] } });
    await api(`/versions/${v1}/submit`, { method: "POST" });
    submitted = true;
    await api(`/versions/${v1}/approve`, { method: "POST", user: approver });
    await api(`/versions/${v1}/publish`, { method: "POST" });
    const v2 = await api(`/maps/${mapAId}/versions`, {
      method: "POST",
      body: { label: "To-Be", source_version_id: v1 },
    });
    workV = v2.id;
    compareReady = true;
  } catch (err) {
    // ê²Œì‹œ ?¤íŒ¨ ??pending??ê°‡ížˆì§€ ?Šê²Œ ?Œìˆ˜ ?œë„ ???¤íŒ¨?´ë„ ì§„í–‰(?„ëž˜???´ì°¨??FAILë¡??œëŸ¬??
    if (submitted && !compareReady) {
      await api(`/versions/${v1}/withdraw`, { method: "POST" }).catch(() => {});
    }
    skip("compare screen scenario (publish workflow)", err instanceof Error ? err.message : String(err));
  }

  // ?‘ì—… ë²„ì „???¤ì œ ?¸ë“œ id(?´ë¡ ?´ë©´ ??id) + Beta??ì½”ë©˜????ë¨¸ì? ???ì¡´ ê²€ì¦ìš©
  const g0 = await api(`/versions/${workV}/graph`);
  const idOf0 = new Map(g0.nodes.map((n) => [n.title, n.id]));
  await api(`/versions/${workV}/comments`, {
    method: "POST",
    body: { node_id: idOf0.get("Beta"), body: "pw-verify keep me" },
  });

  await openEditor(mapAId, workV);
  check("toolbar Import CSV button present before preview", (await page.locator('[data-id="toolbar-import-csv"]').count()) === 1);

  // ?€?€ CSV A: identity ë¨¸ì? ???„ë¦¬ë·?ì§„ìž… ??? íˆ´ë°??Œë©¸ ??¸?¤íŽ™??? ê¸ˆÂ·Cancel ë³µì› ?€?€
  const rowsA = [
    ["Alpha", "", "", "", "", "", "", "", "Beta"],
    ["Beta", "", "", "", "", "", "", "", "Gamma"],
    ["Gamma", "", "", "", "", "", "", "", "SubStep"],
    ["SubStep", "", "", "", "", "", "", "", ""],
  ];
  await page.locator('[data-id="toolbar-import-csv"]').click();
  await page.waitForSelector('[data-id="csv-import-section"]');
  await page.locator('[data-id="csv-paste-toggle"]').click();
  await page.locator('[data-id="csv-paste-input"]').fill(csvOf(rowsA));
  await page.waitForTimeout(300);
  const summary = await page.locator('[data-id="csv-import-section"]').innerText();
  check("identity CSV parses as 0 added / 6 matched / 0 removed", summary.includes("0 added Â· 6 matched Â· 0 removed"), summary.split("\n").find((l) => l.includes("matched")) ?? summary.slice(0, 80));
  await page.locator('[data-id="csv-import-continue"]').click();
  await page.waitForSelector('[data-id="csv-import-tab"]');
  await page.screenshot({ path: `${SHOTS}/01-preview-staged.png` });

  // ???„ë¦¬ë·??¬ë¡¯ ?ìœ  ì¤??´ë°” Import ë²„íŠ¼ ?Œë©¸ (previewSource !== null ê²Œì´??
  check("toolbar Import CSV gone while a CSV preview is staged", (await page.locator('[data-id="toolbar-import-csv"]').count()) === 0);
  console.log("NOT COVERED: staging an AI proposal preview then checking the Import button ??requires driving the AI chat");
  console.log('NOT COVERED: applying an AI proposal during a CSV preview ??"preview.busy" toast ??requires driving the AI chat');

  // ???¸ìŠ¤?™í„° ? ê¸ˆ ???¤ë¥¸ ??·ì ‘ê¸?ë¹„í™œ?? Apply/Cancel ì¡´ìž¬
  check("other inspector tabs disabled during preview", await page.locator('button[aria-label="Properties"]').first().isDisabled());
  // ?¸ìŠ¤?™í„° ? ê¸ˆ ??"Toggle inspector" ?¼ë²¨ ë²„íŠ¼?€ ?˜ì´?? ?´ë°” ? ê?(?„ë¦¬ë·?ì¤?no-op?´ë‚˜ enabled)ê³?  // ?¨ë„ ?‘ê¸° ë²„íŠ¼(disabled={lockTabs}). ?‘ê¸° ê²½ë¡œê°€ ????ë§‰í˜”?Œì„ ê°ê° ?•ì¸?œë‹¤.
  check(
    "inspector panel collapse button disabled during preview",
    (await page.locator('button[aria-label="Toggle inspector"][disabled]').count()) >= 1,
  );
  // ?´ë°” ? ê??€ ?„ë¦¬ë·?ì¤??´ë¦­?´ë„ no-op?´ë¼ Import ??´ ê·¸ë?ë¡??¨ì•„???œë‹¤
  await page
    .locator('button[aria-label="Toggle inspector"]:not([disabled])')
    .first()
    .click()
    .catch(() => {});
  await page.waitForTimeout(150);
  check(
    "toolbar inspector toggle is a no-op during preview (Import tab stays)",
    await page.locator('[data-id="csv-import-tab"]').isVisible(),
  );
  check(
    "Apply and Cancel present in Import tab",
    (await page.locator('[data-id="csv-import-apply"]').isVisible()) && (await page.locator('[data-id="csv-import-cancel"]').isVisible()),
  );
  const tabText = await page.locator('[data-id="csv-import-tab"]').innerText();
  check("identity preview reports nothing missing from the CSV", tabText.includes("Nothing in this map is missing from the CSV."));

  // ??Cancel ??ìº”ë²„??ë³µì› + ?´ë°” ë²„íŠ¼ ë³µê?
  await page.locator('[data-id="csv-import-cancel"]').click();
  await page.waitForSelector('[data-id="csv-import-tab"]', { state: "detached" });
  await page.waitForTimeout(400);
  check("cancel restores toolbar Import button", (await page.locator('[data-id="toolbar-import-csv"]').count()) === 1);
  check("cancel keeps the canvas intact (Gamma still present)", (await page.locator(".react-flow__node", { hasText: "Gamma" }).count()) >= 1);

  // ?€?€ ??identity ë¨¸ì? Apply ??id ê³„ë³´Â·ì½”ë©˜?¸Â·ì—£ì§€ ë³´ì¡´, ë¹„êµ ?”ë©´ ë¬´ì˜¤???€?€
  await stageCsv(csvOf(rowsA));
  await applyPreview();
  const toastSeen = await page
    .waitForSelector("text=CSV imported", { timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  check("apply shows the applied toast", toastSeen);

  const g1 = await api(`/versions/${workV}/graph`);
  const idOf1 = new Map(g1.nodes.map((n) => [n.title, n.id]));
  const preserved = ["Start", "Alpha", "Beta", "Gamma", "SubStep", "End"].every((t) => idOf1.get(t) === idOf0.get(t));
  check("identity merge reuses every node id (title match)", preserved);
  check("identity merge keeps the same edge set", edgeTitles(g1).join("|") === edgeTitles(g0).join("|"), edgeTitles(g1).join(", "));
  const comments = await api(`/versions/${workV}/comments`);
  const kept = comments.find((c) => c.body === "pw-verify keep me");
  check(
    "comment still attached to a live node after merge",
    kept !== undefined && g1.nodes.some((n) => n.id === kept.node_id) && kept.node_id === idOf0.get("Beta"),
    kept ? `node_id=${kept.node_id.slice(0, 8)}?? : "comment missing",
  );

  if (compareReady) {
    await page.goto(`${BASE}/maps/${mapAId}/compare`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-id="compare-legend"]', { timeout: 20000 });
    const legend = (await page.locator('[data-id="compare-legend"]').innerText()).replace(/\n/g, " ");
    const nums = legend.match(/\d+/g) ?? [];
    check("compare flags nothing added/removed after identity merge", nums[0] === "0" && nums[1] === "0", legend);
    const changes = await page.locator('[data-id="compare-changes"]').innerText().catch(() => "");
    check("compare lists no edge added/removed items", !changes.includes("Edge added") && !changes.includes("Edge removed"));
    await page.screenshot({ path: `${SHOTS}/02-compare-clean.png` });
    await openEditor(mapAId, workV);
  } else {
    skip("compare shows 0 added / 0 removed edges", "v1 was not published ??single-version compare would be vacuous");
  }

  // ?€?€ ?¢â‘¤??CSV B: ë¹??€ ë³´ì¡´ + Next ?¬ë°°??+ ?´ë‹¹??ë¶€???´ì„ + ?œë¸Œ?„ë¡œ?¸ìŠ¤ ë³´ì¡´ ?€?€
  const eligible = await api(`/versions/${workV}/eligible-assignees`);
  const realUser = eligible.users[0] ?? null;
  const dept = realUser?.department ?? "";
  const koreanDept = dept ? eligible.dept_infos?.[dept]?.korean_name : undefined;
  const assigneeCell = realUser ? `${realUser.id}, bogus.nobody` : "bogus.nobody";
  const rowsB = [
    ["Alpha", "", assigneeCell, koreanDept ?? dept, "", "", "", "", "Gamma"],
    ["Gamma", "", "", "", "", "", "", "", "Beta"],
    ["Beta", "", "", "", "", "", "", "", "SubStep"],
    ["SubStep", "", "", "", "", "", "", "", ""],
  ];
  await stageCsv(csvOf(rowsB));
  const tabB = await page.locator('[data-id="csv-import-tab"]').innerText();
  check("unknown assignee raises a non-blocking row warning", tabB.includes('Unknown assignee "bogus.nobody"'), tabB.split("\n").find((l) => l.includes("bogus")) ?? "(no warning line)");
  await applyPreview();

  const g2 = await api(`/versions/${workV}/graph`);
  const alpha = g2.nodes.find((n) => n.title === "Alpha");
  check("blank cells preserve existing attributes", alpha?.system === "ERP" && alpha?.description === "keep me", `system=${alpha?.system} description=${alpha?.description}`);
  const expectB = ["Start?’Alpha", "Alpha?’Gamma", "Gamma?’Beta", "Beta?’SubStep", "SubStep?’End"].sort();
  check("Next rewires the flow exactly", edgeTitles(g2).join("|") === expectB.join("|"), edgeTitles(g2).join(", "));
  check("unresolvable assignee token stored verbatim", (alpha?.assignee ?? "").includes("bogus.nobody"), alpha?.assignee);
  if (realUser && realUser.name !== realUser.id) {
    check(
      "login_id resolved to display name",
      (alpha?.assignee ?? "").includes(realUser.name) && !(alpha?.assignee ?? "").includes(realUser.id),
      `assignee=${alpha?.assignee}`,
    );
  } else {
    skip("login_id resolved to display name", realUser ? `user ${realUser.id} has no distinct display name` : "eligible directory is empty");
  }
  if (dept) {
    check(
      `department cell (${koreanDept ? "korean name" : "canonical"}) stored as canonical`,
      alpha?.department === dept,
      `department=${alpha?.department}`,
    );
  } else {
    skip("department resolution", "eligible user has no department to test with");
  }
  const subStep = g2.nodes.find((n) => n.title === "SubStep");
  check("subprocess matched by title keeps type and link", subStep?.node_type === "subprocess" && subStep?.linked_map_id === mapBId, `type=${subStep?.node_type} linked_map_id=${subStep?.linked_map_id}`);

  // ?€?€ ??CSV C: Gamma ?„ë½ ??ë¹¨ê°„ ?ì„  ?„ë¦¬ë·???Keep(?¸ë“œ ? ì?Â·?£ì? ?Œë©¸) ?€?€
  const rowsC = [
    ["Alpha", "", "", "", "", "", "", "", "Beta"],
    ["Beta", "", "", "", "", "", "", "", "SubStep"],
    ["SubStep", "", "", "", "", "", "", "", ""],
  ];
  await stageCsv(csvOf(rowsC));
  check("missing node listed in the Import tab", (await page.locator('[data-id="csv-import-tab"] button[title="Gamma"]').count()) === 1);
  const gammaDashed = await page
    .locator(".react-flow__node", { hasText: "Gamma" })
    .first()
    .evaluate((el) => [el, ...el.querySelectorAll("*")].some((n) => getComputedStyle(n).borderTopStyle === "dashed"));
  check("missing node rendered dashed on the canvas", gammaDashed);
  check("Delete is the default mode", (await page.locator('[data-id="csv-import-mode-delete"]').getAttribute("aria-pressed")) === "true");
  await page.screenshot({ path: `${SHOTS}/03-preview-removed.png` });
  await page.locator('[data-id="csv-import-mode-keep"]').click();
  check("Keep becomes active on click", (await page.locator('[data-id="csv-import-mode-keep"]').getAttribute("aria-pressed")) === "true");
  await applyPreview();

  const g3 = await api(`/versions/${workV}/graph`);
  const gammaKept = g3.nodes.find((n) => n.title === "Gamma");
  const gammaEdges = gammaKept
    ? g3.edges.filter((e) => e.source_node_id === gammaKept.id || e.target_node_id === gammaKept.id)
    : [];
  check("Keep leaves the node in the graph with no edges", gammaKept !== undefined && gammaEdges.length === 0, `edges touching Gamma: ${gammaEdges.length}`);
  check("kept node still visible on the canvas", (await page.locator(".react-flow__node", { hasText: "Gamma" }).count()) >= 1);

  // ?€?€ ??CSV D: ê°™ì? CSV, ?´ë²ˆ??ê¸°ë³¸ê°?Delete ??Gamma ?? œ ?€?€
  await stageCsv(csvOf(rowsC));
  check("Delete is the default again on a fresh preview", (await page.locator('[data-id="csv-import-mode-delete"]').getAttribute("aria-pressed")) === "true");
  await applyPreview();
  const g4 = await api(`/versions/${workV}/graph`);
  check("Delete removes the node from the graph", !g4.nodes.some((n) => n.title === "Gamma"), `nodes=${g4.nodes.map((n) => n.title).join(",")}`);
} catch (err) {
  results.push({ name: "fatal", ok: false });
  console.error(`FATAL ${err instanceof Error ? err.message : String(err)}`);
} finally {
  // ?œë“œ ?•ë¦¬ ???Œí”„?¸ì‚­???´ì???. ?„ì „ ë³µì›?€ git checkout backend/dev.db + ë°±ì—”???¬ì‹œ??  if (mapAId !== null) await api(`/maps/${mapAId}`, { method: "DELETE" }).catch(() => {});
  if (mapBId !== null) await api(`/maps/${mapBId}`, { method: "DELETE" }).catch(() => {});
}

console.log(`\nconsole errors: ${consoleErrors.length}`);
consoleErrors.slice(0, 5).forEach((e) => console.log("  " + e.slice(0, 160)));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
process.exit(failed.length === 0 && consoleErrors.length === 0 ? 0 : 1);
