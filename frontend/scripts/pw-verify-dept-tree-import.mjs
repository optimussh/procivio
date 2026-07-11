// ë¶€??tree JSON ?„í¬??e2e ???´ë“œë¯?ëª¨ë‹¬ë¡??Œì¼ ?…ë¡œ?????ìœ„ ë¶€?œê¹Œì§€ ?€?????¼ì»¤ ?œê? ê²€??
// ?¤í–‰: frontend/ ?ì„œ node scripts/pw-verify-dept-tree-import.mjs
// ?„ì œ: backend :8000 + frontend :3000 ê¸°ë™ (dev.db ì¢…í•© ?œë“œ, sysadmin=admin.sys).
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:7000";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` ??${detail}` : ""}`);
};

// ?œë“œ ì¡°ì§ ?¼ë?ë¥?treeë¡???ë³¸ë?(l1) ????l2) ???€(l3) ???ŒíŠ¸(l4). ?ìœ„ 3?ˆë²¨?€ employees.departmentê°€ ?„ë‹ˆ??
const tree = {
  flat: [{ enDeptNm: "Growth Center", deptNm: "ë¬´ì‹œ?˜ì–´?¼í•¨" }],
  tree: [
    {
      deptCd: 100,
      enDeptNm: "Growth Center",
      deptNm: "?±ìž¥?¼í„°",
      dheadUserId: "admin.sys",
      dheadFnm: "System Admin",
      children: [
        {
          deptCd: 110,
          enDeptNm: "Marketing Office",
          deptNm: "ë§ˆì??…ì‹¤",
          dheadUserId: "admin.sys",
          children: [
            {
              deptCd: 111,
              enDeptNm: "Brand Team",
              deptNm: "ë¸Œëžœ?œí?",
              dheadUserId: "admin.sys",
              children: [
                { deptCd: 1111, enDeptNm: "Brand Part 1", deptNm: "ë¸Œëžœ???ŒíŠ¸", dheadUserId: "admin.sys" },
              ],
            },
          ],
        },
      ],
    },
    { enDeptNm: "No Such Dept", deptNm: "?†ëŠ”ë¶€??, dheadUserId: "" },
  ],
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

// ?€?€ ?´ë“œë¯?ë¶€???????„í¬??ëª¨ë‹¬ ???Œì¼ ?…ë¡œ???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Departments/i }).click();
await page.locator('[data-id="dept-info-add-btn"]').click();
await page.waitForSelector('[data-id="dept-info-modal"]');
await page.setInputFiles('[data-id="dept-info-file-input"]', {
  name: "org.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(tree), "utf8"),
});
await page.waitForSelector('[data-id="dept-info-result"]');
const summary = await page.locator('[data-id="dept-info-result"]').innerText();
// 4ê°?ë°˜ì˜(ë³¸ë?Â·?¤Â·í?Â·?ŒíŠ¸), "No Such Dept"ë§?unknown. flat????ª©?€ ?½ì? ?ŠëŠ”??
check("?„í¬??ê²°ê³¼ updated=4", /Updated:\s*4/i.test(summary), summary.split("\n")[0]);
check("unknown?€ ë¯¸ì¡´??ë¶€??1ê±´ë¿", summary.includes("No Such Dept") && !summary.includes("Growth Center"), summary.replace(/\n/g, " | "));
await page.locator('[data-id="dept-info-close-btn"]').click();

// ?€?€ ë°±ì—”??ì§„ì‹¤ ?•ì¸ ???ìœ„ ?ˆë²¨?ë„ dept_info ???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
const dirDepts = await page.evaluate(async () => {
  const res = await fetch("/api/directory");
  return (await res.json()).departments;
});
const byId = Object.fromEntries(dirDepts.map((d) => [d.id, d]));
check("ë³¸ë?(org_l1)???œê?ëª??€??, byId["Growth Center"]?.korean_name === "?±ìž¥?¼í„°", byId["Growth Center"]?.korean_name);
check("??org_l2)???œê?ëª??€??, byId["Growth Center/Marketing Office"]?.korean_name === "ë§ˆì??…ì‹¤", byId["Growth Center/Marketing Office"]?.korean_name);
check("?€(org_l3)???œê?ëª??€??, byId["Growth Center/Marketing Office/Brand Team"]?.korean_name === "ë¸Œëžœ?œí?");
check("?ŒíŠ¸(org_l4, ê¸°ì¡´?ë„ ?˜ë˜ ?ˆë²¨)???œê?ëª??€??, byId["Growth Center/Marketing Office/Brand Team/Brand Part 1"]?.korean_name === "ë¸Œëžœ???ŒíŠ¸");
check("ë¶€?œìž¥ login_id ?€??, byId["Growth Center"]?.manager === "admin.sys", byId["Growth Center"]?.manager);

// ?€?€ ?¼ì»¤ ?œê? ê²€?????ìœ„ ë¶€?œê? ?œê?ë¡??¡ížˆ?”ê? ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "New map" }).click();
await page.waitForSelector("text=Required approvers");
const picker = page.locator('input[placeholder^="Search by name"]').first();

await picker.click();
await picker.fill("?±ìž¥?¼í„°"); // ë³¸ë? ??ë³€ê²??„ì—???ˆë? ?¡ížˆì§€ ?Šë˜ ?ˆë²¨
await page.waitForTimeout(400);
const hitsDivision = await page.locator('[data-id="principal-picker-dropdown"] button').allInnerTexts();
check("?œê? ê²€?‰ìœ¼ë¡?ë³¸ë?ê°€ ?¡íž˜", hitsDivision.some((h) => h.includes("Growth Center")), hitsDivision[0] ?? "(none)");

await picker.fill("ë§ˆì??…ì‹¤"); // ??await page.waitForTimeout(400);
const hitsOffice = await page.locator('[data-id="principal-picker-dropdown"] button').allInnerTexts();
check("?œê? ê²€?‰ìœ¼ë¡??¤ì´ ?¡íž˜", hitsOffice.some((h) => h.includes("Marketing Office")), hitsOffice[0] ?? "(none)");

// ë¶€?œìž¥ ?´ë¦„ ê²€????manager??login_idë§??€?¥ë˜ì§€ë§??¤ì´?¼ë¡œê·¸ê? ?”ë ‰?°ë¦¬ë¡??´ë¦„??ì¡°ì¸?œë‹¤
await picker.fill("System Admin");
await page.waitForTimeout(400);
const hitsByHead = await page.locator('[data-id="principal-picker-dropdown"] button').allInnerTexts();
check(
  "ë¶€?œìž¥ ?´ë¦„?¼ë¡œ ë¶€?œê? ?¡íž˜",
  hitsByHead.some((h) => h.includes("Growth Center") || h.includes("Marketing Office")),
  hitsByHead.slice(0, 2).join(" / ") || "(none)",
);

console.log(`\nconsole errors: ${consoleErrors.length}`);
consoleErrors.slice(0, 5).forEach((e) => console.log("  " + e.slice(0, 160)));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
process.exit(failed.length === 0 ? 0 : 1);
