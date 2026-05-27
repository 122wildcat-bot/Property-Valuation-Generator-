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
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
