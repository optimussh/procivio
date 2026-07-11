// Task 9 ?úÍ∞Å ?§Î™®?????òÏúÑ?ÑÎ°ú?∏Ïä§ ?∏Ïä§?ôÌÑ∞?êÏÑú follow-latest Ï≤¥ÌÅ¨Î∞ïÏä§Í∞Ä ?åÎçî?òÎäîÏßÄ,
// ?†Í? ??ÏΩòÏÜî ?§Î•òÍ∞Ä ?ÜÎäîÏßÄ, ?£Ï? sourceHandle ?ºÏö¥?úÌä∏Î¶ΩÏù¥ Î∞±Ïóî?úÏóê???†Ï??òÎäîÏßÄ ?§Ï∏°.
// ?§Ìñâ: node scripts/pw-smoke-task9.mjs  (playwright-core, ?úÎ≤Ñ 8000/3000 Í∏∞Îèô ?ÑÏ†ú)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext();
// dev Î°úÍ∑∏???∞Ìöå ??DevGateÍ∞Ä ?ΩÎäî localStorage ?§Î? ?†Ï£º??await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin");
});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://localhost:7000/maps/3", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".react-flow__node", { timeout: 30000 });
await page.waitForTimeout(2000); // Ï∏°Ï†ï/?àÏù¥?ÑÏõÉ + resolved ?†Î°ú???àÏ†ï??
// (a) "Ï£ºÎ¨∏ Ï≤òÎ¶¨" subprocess ?∏Îìú ?†ÌÉù ??inspector?êÏÑú follow-latest Ï≤¥ÌÅ¨Î∞ïÏä§ ?ïÏù∏
const orderNode = page.locator(".react-flow__node", { hasText: "Ï£ºÎ¨∏ Ï≤òÎ¶¨" }).first();
let nodeFound = false;
let checkboxFound = false;
let checkboxToggled = false;
const errorsAfterToggle = [];

try {
  await orderNode.click({ timeout: 5000 });
  nodeFound = true;
  await page.waitForTimeout(500); // inspector ?åÎçî ?ÄÍ∏?} catch {
  nodeFound = false;
}

if (nodeFound) {
  // follow-latest ?ºÎ≤® Í≤Ä?????∏Ïä§?ôÌÑ∞??"Follow" ?êÎäî "Ï∂îÏ¢Ö" ?çÏä§?∏Í? ?àÎäî Ï≤¥ÌÅ¨Î∞ïÏä§
  const labels = await page.$$eval("label", (els) =>
    els.map((el) => ({ text: el.textContent?.trim() ?? "", hasCheckbox: !!el.querySelector('input[type="checkbox"]') }))
  );
  const followLabel = labels.find((l) => l.hasCheckbox && (l.text.includes("Follow") || l.text.includes("Ï∂îÏ¢Ö")));
  checkboxFound = !!followLabel;

  if (checkboxFound) {
    const errsBefore = errors.length;
    try {
      // ?ºÎ≤®??ÏßÅÏ†ë DOM ?¥Î¶≠?ºÎ°ú ?†Í? (opacity-0 ?∞Ìöå) ??safe eval: Î°úÏª¨ DOM Ï°∞ÏûëÎß?      await page.evaluate(() => {
        const labels = [...document.querySelectorAll("label")];
        const target = labels.find((l) => l.textContent?.includes("Follow") || l.textContent?.includes("Ï∂îÏ¢Ö"));
        const cb = target?.querySelector('input[type="checkbox"]');
        if (cb) cb.click();
      });
      await page.waitForTimeout(500);
      checkboxToggled = true;
      errorsAfterToggle.push(...errors.slice(errsBefore));
      // ?êÎ≥µ
      await page.evaluate(() => {
        const labels = [...document.querySelectorAll("label")];
        const target = labels.find((l) => l.textContent?.includes("Follow") || l.textContent?.includes("Ï∂îÏ¢Ö"));
        const cb = target?.querySelector('input[type="checkbox"]');
        if (cb) cb.click();
      });
    } catch {
      checkboxToggled = false;
    }
  }
}

// (b) ?£Ï? sourceHandle ?ºÏö¥?úÌä∏Î¶???REST API ÏßÅÏ†ë ?ïÏù∏
// map 3 version 3??Í∑∏Îûò?ÑÎ? GET ??source_handle="Ï∑®ÏÜå" ?£Ï?Í∞Ä ?àÎäîÏßÄ ?ïÏù∏
// (seed?êÏÑú ?¥Î? ?¨Ïñ¥Ïß?Í∞???Î∞±Ïóî?úÍ? Î≥¥Ï°¥?àÎäîÏßÄ ?ïÏù∏)
let roundtripOk = false;
try {
  const graphResp = await fetch("http://localhost:8000/api/versions/3/graph");
  const graph = await graphResp.json();
  // seed ?£Ï? c-e4: source_handle="Ï∑®ÏÜå" ???àÏñ¥????  const cancelEdge = graph.edges?.find((e) => e.source_handle === "Ï∑®ÏÜå");
  if (cancelEdge) {
    roundtripOk = true;
  } else {
    // ?ÜÏúºÎ©?ÏßÅÏ†ë PUT/GET ?ºÏö¥?úÌä∏Î¶ΩÏúºÎ°??ïÏù∏
    if (graph.edges && graph.edges.length > 0) {
      const testEdge = { ...graph.edges[0], source_handle: "test-handle-9" };
      const modified = { ...graph, edges: [testEdge, ...graph.edges.slice(1)] };
      const putResp = await fetch("http://localhost:8000/api/versions/3/graph", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modified),
      });
      if (putResp.ok) {
        const readback = await (await fetch("http://localhost:8000/api/versions/3/graph")).json();
        roundtripOk = readback.edges?.some((e) => e.source_handle === "test-handle-9") === true;
        // Î≥µÏõê
        await fetch("http://localhost:8000/api/versions/3/graph", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(graph),
        });
      }
    }
  }
} catch (e) {
  console.log("roundtrip error:", e.message);
}

await page.screenshot({ path: "/tmp/bpm-task9-smoke.png", fullPage: false });
await browser.close();

console.log("nodeFound (Ï£ºÎ¨∏ Ï≤òÎ¶¨ subprocess):", nodeFound);
console.log("checkboxFound (follow-latest in inspector):", checkboxFound);
console.log("checkboxToggled:", checkboxToggled);
console.log("errorsAfterToggle:", errorsAfterToggle);
console.log("roundtripOk (source_handle persists):", roundtripOk);
console.log("consoleErrors total:", errors.length, errors.slice(0, 5));

const ok = nodeFound && checkboxFound && checkboxToggled && errorsAfterToggle.length === 0 && roundtripOk && errors.length === 0;
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
