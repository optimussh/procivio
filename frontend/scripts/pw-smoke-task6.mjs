// Task 6 ?œê° ?¤ëª¨?????˜ìœ„ ?¸ì§‘ ê²½ë¡œ ?œê±° ????ê°€ì§€ ê²€ì¦?
// 1) ?„ë² ???Œê?: ?¼ì¹¨ ??embedded ?ì‹(?‘ìˆ˜/ê²€?????¬ì „???œì‹œ??(Task 5 regression safety net)
// 2) ?¸ì§‘ ?¤ëª¨?? ?¼ì¹¨ ??ë£¨íŠ¸ ?¸ë“œ??draggable ?´ëž˜??ë³´ìœ , ?¼ì¹¨ ???ì‹ ?¸ë“œ??draggable ?´ëž˜???†ìŒ
// ?¤í–‰: node scripts/pw-smoke-task6.mjs  (playwright-core, ?œë²„ 8000/3000 ê¸°ë™ ?„ì œ)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext();
// dev ë¡œê·¸???°íšŒ ??DevGateê°€ ?½ëŠ” localStorage ?¤ë? ? ì£¼??await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin");
});
const page = await ctx.newPage();
const consoleErrors = [];
const serverErrors500 = [];
// Pre-existing 500s from checkout/notifications polling ??not caused by Task 6
const PREEXISTING_500_PATHS = ["/checkout", "/notifications"];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 500) serverErrors500.push(r.url());
});

await page.goto("http://localhost:7000/maps/3", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".react-flow__node", { timeout: 30000 });
await page.waitForTimeout(2000); // ì¸¡ì •/?ˆì´?„ì›ƒ ?ˆì •??
// ?€?€ 1. ?¼ì¹¨ ?? ë£¨íŠ¸ ?¸ë“œê°€ draggable ?´ëž˜?¤ë? ë³´ìœ ?˜ëŠ”ì§€ ?•ì¸ ?€?€?€?€?€?€?€?€?€?€
// RF v12: draggable=true???¸ë“œ??'draggable' ?´ëž˜??ë¶€??
// nodesDraggable prop??false?´ë©´ ?„ì²´ ë¹„í™œ?±í™”?˜ë?ë¡?expandedInline.size===0????ì¸¡ì •.
const beforeInfo = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll(".react-flow__node")];
  return nodes.slice(0, 3).map((n) => ({
    text: n.textContent?.trim().slice(0, 20) ?? "",
    draggable: n.classList.contains("draggable"),
    selectable: n.classList.contains("selectable"),
  }));
});
const rootIsDraggable = beforeInfo.length > 0 && beforeInfo[0].draggable === true;

// ?€?€ 2. ?„ë² ???Œê?: ?¼ì¹¨ ???ì‹ ?±ìž¥ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
const textsBefore = await page.$$eval(".react-flow__node", (ns) =>
  ns.map((n) => n.textContent?.trim() ?? ""),
);
const nodeCountBefore = textsBefore.length;

const orderNode = page.locator(".react-flow__node", { hasText: "ì£¼ë¬¸ ì²˜ë¦¬" }).first();
await orderNode.hover();
await page.waitForTimeout(200);
const toggle = orderNode.locator('button[title*="ubprocess"], button[title*="?¼ì¹˜ê¸?]').first();
let clicked = false;
try {
  await toggle.click({ timeout: 4000, force: true });
  clicked = true;
} catch {
  clicked = await page.evaluate(() => {
    const order = [...document.querySelectorAll(".react-flow__node")].find((n) =>
      n.textContent?.includes("ì£¼ë¬¸ ì²˜ë¦¬"),
    );
    const btn = order?.querySelector("button[title]");
    if (!btn) return false;
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return true;
  });
}
await page.waitForTimeout(2000); // ?¼ì¹¨ ? ë‹ˆë©”ì´??+ materialize

const textsAfter = await page.$$eval(".react-flow__node", (ns) =>
  ns.map((n) => n.textContent?.trim() ?? ""),
);
const hasJeobsu = textsAfter.some((t) => t.includes("?‘ìˆ˜"));
const hasGeomto = textsAfter.some((t) => t.includes("ê²€??));
const nodeCountAfter = textsAfter.length;

// ?€?€ 3. ?¼ì¹¨ ?? ?ì‹ ?¸ë“œ(?‘ìˆ˜)??draggable ?´ëž˜???†ìŒ(read-only) ?€?€?€?€?€?€?€?€
// ?¼ì¹¨ ì¤?nodesDraggable=false?´ë?ë¡?ë£¨íŠ¸??draggable ?†ìŒ ???´ê²ƒ???¤ê³„.
// ?ì‹??draggable:falseë¡??¤ì •?ëŠ”ì§€ ?•ì¸: RF???¸ë“œë³?draggable=falseë©??´ëž˜?¤ë„ ?†ìŒ.
// ë£¨íŠ¸?€ ?ì‹ ëª¨ë‘ draggable ?†ëŠ” ê²ƒì´ ?•ìƒ ??ì¤‘ìš”??ê±??ì‹ ?¸ë“œê°€ selectable?¸ì?(?´ë¦­ ?ˆìš©).
const afterInfo = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll(".react-flow__node")];
  const child = nodes.find((n) => n.textContent?.includes("?‘ìˆ˜"));
  const root = nodes.find((n) => n.textContent?.includes("ì£¼ë¬¸ ?‘ìˆ˜"));
  return {
    childSelectable: child?.classList.contains("selectable") ?? null,
    childDraggable: child?.classList.contains("draggable") ?? null,
    rootSelectable: root?.classList.contains("selectable") ?? null,
    rootDraggable: root?.classList.contains("draggable") ?? null,
  };
});

// ?¼ì¹¨ ???ì‹?€ selectable(?´ë¦­ ê°€???´ì?ë§?draggable ?†ì–´??????read-only ì¦ëª…
const childIsSelectableNotDraggable =
  afterInfo.childSelectable === true && afterInfo.childDraggable === false;

await page.screenshot({ path: "/tmp/bpm-task6-smoke.png", fullPage: false });
await browser.close();

// pre-existing 500s (checkout/notifications) ?œì™¸???¤ì œ ?œë²„ ?¤ë¥˜ë§?ì§‘ê³„
const taskErrors500 = serverErrors500.filter(
  (url) => !PREEXISTING_500_PATHS.some((path) => url.includes(path)),
);

console.log("beforeInfo (root nodes):", JSON.stringify(beforeInfo));
console.log("rootIsDraggable (before expand):", rootIsDraggable);
console.log("toggle clicked:", clicked);
console.log("nodeCount before -> after:", nodeCountBefore, "->", nodeCountAfter);
console.log("embedded visible ???‘ìˆ˜:", hasJeobsu, "ê²€??", hasGeomto);
console.log("afterInfo (child classes post-expand):", JSON.stringify(afterInfo));
console.log("childIsSelectableNotDraggable:", childIsSelectableNotDraggable);
console.log("consoleErrors (all):", consoleErrors.length, consoleErrors.slice(0, 5));
console.log("serverErrors500 (all):", serverErrors500);
console.log("taskErrors500 (non-pre-existing):", taskErrors500);

const embedOk = clicked && hasJeobsu && hasGeomto && nodeCountAfter > nodeCountBefore;
const editingOk = rootIsDraggable && childIsSelectableNotDraggable;
const noTaskErrors = taskErrors500.length === 0;

console.log("embedOk:", embedOk, "editingOk:", editingOk, "noTaskErrors:", noTaskErrors);
const ok = embedOk && editingOk && noTaskErrors;
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
