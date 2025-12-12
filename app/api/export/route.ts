import { NextRequest, NextResponse } from "next/server";
import puppeteer, { Browser } from "puppeteer";

// Puppeteer configuration for different environments
function getBrowserConfig() {
  const isDev = process.env.NODE_ENV === "development";
  const isVercel = !!process.env.VERCEL;

  // Base configuration
  const config: any = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--disable-software-rasterizer",
    ],
  };

  // Vercel/Production: Use chromium from puppeteer
  if (isVercel) {
    // Vercel Edge Functions don't support Puppeteer well
    // For Vercel, you might need to use @sparticuz/chromium or similar
    console.log("Running on Vercel - using default Chromium");
  }

  // Local development on macOS
  if (isDev && process.platform === "darwin") {
    console.log("Running on macOS - using bundled Chromium");
  }

  // Linux (Docker, Railway, Render, etc.)
  if (process.platform === "linux") {
    console.log(
      "Running on Linux - using bundled Chromium with additional flags",
    );
    config.args.push("--single-process"); // Helpful in containerized environments
  }

  return config;
}

// Cache browser instance for better performance
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  const config = getBrowserConfig();

  browserInstance = await puppeteer.launch(config);

  return browserInstance;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const resumeId = searchParams.get("id");
  const themeColor = searchParams.get("themeColor");
  const language = searchParams.get("language") || "en";

  if (!resumeId) {
    return NextResponse.json(
      { error: "Resume ID is required" },
      { status: 400 },
    );
  }

  let browser: Browser | null = null;

  try {
    // Get or create browser instance
    browser = await getBrowser();

    // Create a new page
    const page = await browser.newPage();

    // Set viewport to A4 size
    await page.setViewport({
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
      deviceScaleFactor: 2, // Higher quality rendering
    });

    // Build print page URL
    const baseUrl = process.env.NEXTAUTH_URL;
    const printUrl = new URL(`/resume/print/${resumeId}`, baseUrl);

    if (themeColor) {
      printUrl.searchParams.set("themeColor", themeColor);
    }
    printUrl.searchParams.set("language", language);

    console.log(`Navigating to: ${printUrl.toString()}`);

    // Navigate to the print page
    await page.goto(printUrl.toString(), {
      waitUntil: ["networkidle0", "domcontentloaded"],
      timeout: 30000,
    });

    // Wait for fonts to load (with timeout and fallback)
    try {
      await page.waitForFunction(
        () => {
          if (document.fonts && document.fonts.ready) {
            return document.fonts.ready.then(() => true);
          }

          return true; // Fallback if fonts API not available
        },
        { timeout: 8000 },
      );
      console.log("Fonts loaded successfully");
    } catch (error) {
      console.log("Font loading timeout, proceeding anyway");
    }

    // Wait for the ready signal from the page (with timeout and fallback)
    try {
      await page.waitForFunction(
        () => {
          return document.body.getAttribute("data-ready") === "true";
        },
        { timeout: 5000 },
      );
      console.log("Page ready signal received");
    } catch (error) {
      console.log("Ready signal timeout, proceeding with fixed delay");
    }

    // Extra delay to ensure everything is rendered (especially for web fonts)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("Generating PDF...");

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        right: "12mm",
        bottom: "12mm",
        left: "12mm",
      },
      displayHeaderFooter: false,
      preferCSSPageSize: false,
      omitBackground: false, // Ensure background is included
    });

    // Close the page
    await page.close();

    // Get resume name for filename
    let fileName = "Resume.pdf";

    try {
      const resumeDataResponse = await fetch(
        `${baseUrl}/api/resumes/${resumeId}`,
        {
          cache: "no-store",
        },
      );

      if (resumeDataResponse.ok) {
        const resumeData = await resumeDataResponse.json();
        const fullName = resumeData.resume.fullName || resumeData.resume.name;

        if (fullName) {
          fileName = `${fullName.replace(/\s+/g, "_")}_Resume.pdf`;
        }
      }
    } catch (error) {
      console.error("Error fetching resume data for filename:", error);
    }

    // Return PDF
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);

    // Close browser on error
    if (browser) {
      try {
        await browser.close();
        browserInstance = null;
      } catch (closeError) {
        console.error("Error closing browser:", closeError);
      }
    }

    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

// Optional: Add a cleanup endpoint or periodic cleanup
// For serverless environments, the browser will be cleaned up automatically
// For long-running servers, you might want to implement browser instance management
