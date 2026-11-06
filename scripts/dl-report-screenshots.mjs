// Screenshots the dev fixtures and checks the no-JS tabs and XSS probe in a real browser.
// Needs `npm run dev` running. Usage: node scripts/dl-report-screenshots.mjs [outDir] [baseUrl]
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const outDir = process.argv[2] ?? "screenshots";
const base = process.argv[3] ?? "http://localhost:3000";
const TABS = ["f1", "f2", "f10", "f13", "f16"];
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const failures = [];

for (const fixture of ["olectra", "hfcl"]) {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme });
    await context.addInitScript((value) => localStorage.setItem("theme", value), theme);
    const page = await context.newPage();
    // Hydration mismatches surface here in next dev.
    page.on("console", (message) => message.type() === "error" && failures.push(`${fixture}/${theme} console: ${message.text().slice(0, 300)}`));
    page.on("pageerror", (error) => failures.push(`${fixture}/${theme} page error: ${error.message.slice(0, 300)}`));
    await page.goto(`${base}/dev/dl-report/${fixture}`, { waitUntil: "networkidle" });
    if ((await page.evaluate(() => document.documentElement.classList.contains("dark"))) !== (theme === "dark")) failures.push(`${fixture} did not apply ${theme}`);
    for (const tab of TABS) {
      await page.click(`label[for="dl-tab-${tab}"]`);
      if (tab === "f2") await page.click('section[data-panel="f2"] details summary');
      await page.evaluate(() => window.scrollTo(0, 0)); // otherwise the sticky header lands mid-image
      await page.screenshot({ path: join(outDir, `${fixture}-${theme}-${tab}.png`), fullPage: true });
    }
    if (theme === "light") {
      // The export must hold every tab, whichever one is showing.
      const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download HTML" }).click()]);
      const file = join(outDir, download.suggestedFilename());
      await download.saveAs(file);
      const exported = readFileSync(file, "utf8");
      if (!exported.includes("F16 Stakeholders") || !exported.includes("SOURCES &amp; GAPS")) failures.push(`${fixture} download is incomplete`);
      const printable = page.frameLocator('iframe[title="Printable report"]');
      if ((await printable.locator("h2").count()) !== 17) failures.push(`${fixture} print document lacks 17 tabs`);
    }
    await context.close();
  }
}

// v1.1: the panels the fit audit flagged, with every F2 category open so the U rows show.
{
  const name = "hfcl-v1.1";
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  await context.addInitScript(() => localStorage.setItem("theme", "light"));
  const page = await context.newPage();
  page.on("console", (message) => message.type() === "error" && failures.push(`${name} console: ${message.text().slice(0, 300)}`));
  page.on("pageerror", (error) => failures.push(`${name} page error: ${error.message.slice(0, 300)}`));
  await page.goto(`${base}/dev/dl-report/${name}`, { waitUntil: "networkidle" });
  const expected = {
    f1: "LIVE PRICE SNAPSHOT",
    f2: "Verified empty UI shell",
    f3: "MODEL INPUTS & UNCERTAINTY",
    f7: "PERIODS, DEFINITIONS & EARNINGS BRIDGE",
    f11: "METHOD",
    f12: "RECONCILIATION",
    f13: "CRITERIA APPLIED",
    f14: "Price band",
    f17: "UPLOAD SLOT · NOT ENABLED",
  };
  for (const [tab, marker] of Object.entries(expected)) {
    await page.click(`label[for="dl-tab-${tab}"]`);
    const panel = page.locator(`section[data-panel="${tab}"]`);
    if (tab === "f2") for (const summary of await panel.locator("details summary").all()) await summary.click();
    if (!(await panel.getByText(marker).first().isVisible())) failures.push(`${name} ${tab} does not show "${marker}"`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: join(outDir, `${name}-light-${tab}.png`), fullPage: true });
  }
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download HTML" }).click()]);
  const file = join(outDir, `${name}-${download.suggestedFilename()}`);
  await download.saveAs(file);
  const exported = readFileSync(file, "utf8");
  for (const marker of ["LIVE PRICE SNAPSHOT", "UPLOAD SLOT · NOT ENABLED", "CRITERIA APPLIED"]) if (!exported.includes(marker)) failures.push(`${name} download lacks ${marker}`);
  const printable = page.frameLocator('iframe[title="Printable report"]');
  if ((await printable.locator("h2").count()) !== 17) failures.push(`${name} print document lacks 17 tabs`);
  await context.close();
}

// CSS-only tabs must switch with scripting off.
const noJs = await browser.newContext({ javaScriptEnabled: false });
const plain = await noJs.newPage();
await plain.goto(`${base}/dev/dl-report/olectra`);
await plain.click('label[for="dl-tab-f7"]');
const visible = await plain.locator("section[data-panel]:visible").evaluateAll((els) => els.map((el) => el.dataset.panel));
if (visible.join() !== "f7") failures.push(`no-JS tab switch showed: ${visible.join()}`);
await noJs.close();

// Nothing in the probe may execute or become an element.
const probe = await (await browser.newContext()).newPage();
probe.on("dialog", (dialog) => {
  failures.push(`XSS dialog fired: ${dialog.message()}`);
  void dialog.dismiss();
});
await probe.goto(`${base}/dev/dl-report/xss-probe`, { waitUntil: "networkidle" });
for (const panel of TABS) await probe.click(`label[for="dl-tab-${panel}"]`);
const live = await probe.locator(".dl-tabs :is(script, img, svg, b)").count();
if (live) failures.push(`${live} live elements from the XSS probe`);
const liveInPrint = await probe.frameLocator('iframe[title="Printable report"]').locator("script, img, svg").count();
if (liveInPrint) failures.push(`${liveInPrint} live elements in the XSS print document`);

await browser.close();
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`OK: screenshots in ${outDir}; no-JS tabs and XSS probe passed`);
