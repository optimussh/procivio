// �??�세 로딩 ?�레??검�?????�?로딩: 중앙 ?�피???�벨 ??멤버 로딩: 고스??컬럼
// ??고스?�→?�데?�터 ?�환?�서 버전 ?�레????불�?(리플로우 방�?). API�??�위 지?�시�?결정?�으�?검??
// ?�행: node scripts/pw-verify-detail-loading.mjs  (playwright-core, ?�버 8000/3000 기동 ?�제)
import { chromium } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DETAIL_DELAY_MS = 700; // getMap 지?????�피??관�?�?const PERMS_DELAY_MS = 1800; // permissions 지????고스??관�?�?
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext();
await ctx.addInitScript(() => {
  window.localStorage.setItem("bpm.devUser", "admin.sys");
  window.localStorage.setItem("bpm.lang", "en");
});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

// API 지??주입 ???�세??짧게, 권한(멤버)?� 길게
await page.route(/\/api\/maps\/\d+$/, async (route) => {
  await new Promise((r) => setTimeout(r, DETAIL_DELAY_MS));
  await route.continue();
});
await page.route(/\/api\/maps\/\d+\/permissions/, async (route) => {
  await new Promise((r) => setTimeout(r, PERMS_DELAY_MS));
  await route.continue();
});

await page.goto("http://localhost:7000/", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-id="map-card"]', { timeout: 30000 });
// 카드 ?�백(?�딩) ?�릭 ??중앙???�르�??�름 Link가 ?�디?�로 ?�비게이?�해 버림
await page.locator('[data-id="map-card"]').first().click({ position: { x: 8, y: 8 } });

// ?�측 ?�널�??�정 ??카드 ?�버 ?�리�?모달?�도 같�? 카드가 ?�서 중복 매치??const aside = page.locator('[data-id="map-detail-aside"]');

// ???�피??로딩 박스 ??detail 지???�안 ?�출
const loading = aside.locator('[data-id="map-detail-loading"]');
await loading.waitFor({ state: "visible", timeout: DETAIL_DELAY_MS + 500 });
const spinnerSeen = (await loading.locator("svg.animate-spin").count()) > 0;
const labelSeen = (await loading.textContent())?.includes("Loading") ?? false;

// ??고스??멤버 컬럼 ??detail ?�착 ??permissions 지???�안 ?�출
const ghost = aside.locator('[data-id="map-detail-members-ghost"]');
await ghost.waitFor({ state: "visible", timeout: DETAIL_DELAY_MS + 1500 });
const versionsBox = aside.locator('[data-id="map-detail-versions"]');
const widthDuringGhost = (await versionsBox.boundingBox())?.width ?? -1;

// ??멤버 ?�데?�터 ?�착 ??고스???�멸, 버전 ?�레????불�?
await ghost.waitFor({ state: "detached", timeout: PERMS_DELAY_MS + 2000 });
await page.waitForTimeout(300);
const widthAfterMembers = (await versionsBox.boundingBox())?.width ?? -2;
const widthStable = Math.abs(widthDuringGhost - widthAfterMembers) < 2;

const pass = spinnerSeen && labelSeen && widthDuringGhost > 0 && widthStable && errors.length === 0;
console.log(
  JSON.stringify(
    { spinnerSeen, labelSeen, widthDuringGhost, widthAfterMembers, widthStable, consoleErrors: errors.length, pass },
    null,
    2,
  ),
);
await browser.close();
process.exit(pass ? 0 : 1);
