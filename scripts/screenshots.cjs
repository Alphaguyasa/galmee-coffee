// Screenshots of every screen at 360 and 1280 px in Amharic and English (the frontend guidelines step 3).
// Usage: npm run build && npx next start -p 3123 &  then  npm run screenshots
// Logged-in screens need SHOT_EMAIL and SHOT_PASSWORD (a demo account; never commit them).
// Needs Playwright with Chromium (`npx playwright install chromium` on a new machine).
// eslint-disable-next-line @typescript-eslint/no-require-imports -- plain Node script, Playwright resolves via require
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3123";
const OUT = "docs/screenshots";
const PUBLIC = ["/login", "/signup", "/offline"];
const PRIVATE = ["/", "/buy", "/farmers", "/stock", "/reports", "/setup"];
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 1280, height: 800 },
];
const LOCALES = ["am", "en"];

const slug = (path) => (path === "/" ? "home" : path.slice(1).replaceAll("/", "-"));
const problems = [];

async function main() {
const browser = await chromium.launch();
for (const locale of LOCALES) {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport });
    await context.addCookies([{ name: "galmee_locale", value: locale, url: BASE }]);
    const page = await context.newPage();
    page.on("console", (m) => m.type() === "error" && problems.push(`${locale} ${viewport.width} ${page.url()}: ${m.text()}`));

    let paths = PUBLIC;
    if (process.env.SHOT_EMAIL && process.env.SHOT_PASSWORD) {
      await page.goto(`${BASE}/login`);
      await page.fill("#email", process.env.SHOT_EMAIL);
      await page.fill("#password", process.env.SHOT_PASSWORD);
      await Promise.all([page.waitForURL(`${BASE}/`), page.click("button[type=submit]")]);
      paths = [...PRIVATE, "/offline"];
    }

    for (const path of paths) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) problems.push(`${locale} ${viewport.width} ${path}: horizontal scroll`);
      await page.screenshot({ path: `${OUT}/${slug(path)}-${locale}-${viewport.width}.png`, fullPage: true });
    }
    await context.close();
  }
}
await browser.close();

if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Screenshots saved, no console errors, no horizontal scroll.");
}
}

main();
