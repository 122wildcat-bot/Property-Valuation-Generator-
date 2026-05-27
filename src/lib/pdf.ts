import puppeteer, { type Browser, type LaunchOptions } from "puppeteer";

let browserPromise: Promise<Browser> | null = null;

function launchBrowser(): Promise<Browser> {
  const options: LaunchOptions = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
    ],
  };
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (executablePath) {
    options.executablePath = executablePath;
  }
  return puppeteer.launch(options);
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  const browser = await browserPromise;
  // If a previous browser was disconnected (e.g., crash), relaunch.
  if (!browser.connected) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const tBrowser = Date.now();
  const browser = await getBrowser();
  const page = await browser.newPage();
  const browserMs = Date.now() - tBrowser;
  try {
    // networkidle0 would block until *every* network request settles —
    // a single slow Google Fonts response can add 10–30s to the render.
    // networkidle2 (≤2 in-flight requests) is enough for our use case;
    // the 15s ceiling guarantees we move on if a font CDN is down.
    const tContent = Date.now();
    await page.setContent(html, { waitUntil: "networkidle2", timeout: 15000 });
    await page.emulateMediaType("print");
    const contentMs = Date.now() - tContent;

    const tPdf = Date.now();
    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    });
    const pdfMs = Date.now() - tPdf;
    console.log(`[puppeteer] browser_ready=${browserMs}ms set_content=${contentMs}ms pdf=${pdfMs}ms`);
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
