// SearchSelect ?œë¡­?¤ìš´ ?´ë¦¬???Œê? ê²€ì¦????¸ìŠ¤?™í„°(overflow-y-auto)Â·?¸ë“œ ?¸ì§‘ ëª¨ë‹¬(overflow-hidden).
// ?¤í–‰: frontend/ ?ì„œ node scripts/pw-verify-search-select-portal.mjs
// ?„ì œ: backend :8000 + frontend :3000, dev.db ì¢…í•© ?œë“œ.
//   ë§?1??draft v6 ?ìœ ê¶?ë³´ìœ ?ëŠ” ?œë“œ??sion.seo3 ??ê·?? ì?ë¡??´ì–´???¼ì»¤ê°€ ?¸ì§‘ ê°€???íƒœë¡??¬ë‹¤.
//   (admin.sysë¡?/maps/1???´ë©´ ê²Œì‹œë³?v5ê°€ ?½ê¸°?„ìš©?¼ë¡œ ?´ë ¤ SearchSelect ?ì²´ê°€ ?†ë‹¤.)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:7000";
const HEIGHTS = [800, 620, 540, 480];

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` ??${detail}` : ""}`);
};

// ë©”ë‰´ê°€ ?¤ì œë¡??¨ì „??ë³´ì´?”ê? ????ê·€?ì´ ?ˆìª½ ?ì—??elementFromPointê°€ ë©”ë‰´ ?´ë?ë¥?ê°€ë¦¬ì¼œ???œë‹¤.
// bounding boxë§?ë³´ë©´ ì¡°ìƒ??overflow ?´ë¦¬?‘ì„ ëª??¡ëŠ”??
const probeMenu = (page) =>
  page.evaluate(() => {
    const menu = document.querySelector('[data-id="search-select-menu"]');
    if (!menu) return { found: false };
    const b = menu.getBoundingClientRect();
    const corners = {
      topLeft: [b.left + 4, b.top + 4],
      topRight: [b.right - 4, b.top + 4],
      bottomLeft: [b.left + 4, b.bottom - 4],
      bottomRight: [b.right - 4, b.bottom - 4],
    };
    const hidden = Object.entries(corners)
      .filter(([, [x, y]]) => {
        const el = document.elementFromPoint(x, y);
        return !el || !menu.contains(el);
      })
      .map(([name]) => name);
    return {
      found: true,
      hidden,
      inViewport: b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight,
      portaled: menu.parentElement === document.body,
    };
  });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const consoleErrors = [];

for (const height of HEIGHTS) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height } });
  await ctx.addInitScript(() => {
    window.localStorage.setItem("bpm.devUser", "sion.seo3");
    window.localStorage.setItem("bpm.lang", "en");
  });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });

  await page.goto(`${BASE}/maps/1?version=6`, { waitUntil: "networkidle" });
  await page.waitForSelector(".react-flow__node");
  await page.waitForTimeout(1200);

  const nodes = page.locator(".react-flow__node");
  let bpmNode = -1;
  for (let i = 0; i < (await nodes.count()); i++) {
    await nodes.nth(i).click({ force: true });
    await page.waitForTimeout(300);
    if (await page.locator('[data-id="search-select-trigger"]').count()) {
      bpmNode = i;
      break;
    }
  }
  if (bpmNode < 0) {
    check(`${height}px ??BPM ?ì„± ?¼ì»¤ ?¸ì¶œ`, false, "?¸ì§‘ ê°€?¥í•œ process ?¸ë“œ ?†ìŒ");
    await ctx.close();
    continue;
  }

  // ?¸ìŠ¤?™í„° ?¨ë„??ë¶€???œë¡­?¤ìš´
  await page.locator('[data-id="search-select-trigger"]').first().click();
  await page.waitForTimeout(350);
  const insp = await probeMenu(page);
  check(
    `?¸ìŠ¤?™í„° ${height}px ???œë¡­?¤ìš´ ???˜ë¦¼`,
    insp.found && insp.hidden.length === 0 && insp.inViewport && insp.portaled,
    JSON.stringify(insp),
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);

  // ?¸ë“œ ?¸ì§‘ ëª¨ë‹¬ ???œëª© ?”ë¸”?´ë¦­?€ ?´ë¦„ ?¸ì§‘?´ë¼ ì¹´ë“œ ?˜ë‹¨???¸ë¦°??  const nb = await nodes.nth(bpmNode).boundingBox();
  await page.mouse.dblclick(nb.x + nb.width / 2, nb.y + nb.height - 6);
  await page.waitForTimeout(700);
  const modal = page.locator('div.w-\\[420px\\]').first();
  await modal.waitFor();

  const body = await page.evaluate(() => {
    const el = document.querySelector('[data-id="node-summary-body"]');
    const card = el.parentElement;
    el.scrollTop = el.scrollHeight;
    const nav = el.querySelector(".grid.grid-cols-2");
    const nr = nav.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    return {
      canScroll: el.scrollHeight > el.clientHeight,
      scrollbarHidden: getComputedStyle(el).scrollbarWidth === "none",
      navReachable: nr.top >= cr.top - 1 && nr.bottom <= cr.bottom + 1,
    };
  });
  check(`ëª¨ë‹¬ ${height}px ??ë³¸ë¬¸ ?¤í¬ë¡??´ì•„?ˆìŒ`, body.canScroll, JSON.stringify(body));
  check(`ëª¨ë‹¬ ${height}px ???¤í¬ë¡¤ë°” ?¨ê?`, body.scrollbarHidden);
  check(`ëª¨ë‹¬ ${height}px ???ê¹Œì§€ ?´ë¦¬ë©?? í–‰/?„í–‰ ?´ë¹„ê°€ ì¹´ë“œ ??, body.navReachable);

  await modal.locator('[data-id="search-select-trigger"]').first().click();
  await page.waitForTimeout(350);
  const mod = await probeMenu(page);
  check(
    `ëª¨ë‹¬ ${height}px ???œë¡­?¤ìš´ ???˜ë¦¼`,
    mod.found && mod.hidden.length === 0 && mod.inViewport && mod.portaled,
    JSON.stringify(mod),
  );
  await ctx.close();
}

console.log(`\nconsole errors: ${consoleErrors.length}`);
consoleErrors.slice(0, 5).forEach((e) => console.log("  " + e.slice(0, 160)));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
process.exit(failed.length === 0 ? 0 : 1);
