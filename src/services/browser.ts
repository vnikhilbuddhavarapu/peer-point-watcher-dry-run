import { z } from "zod";

const contentResponseSchema = z.object({
  success: z.literal(true),
  result: z.string().max(1_000_000),
});

export interface PageObservation {
  materialKey: string;
  cosmeticTimestamp: string | null;
  browserMs: number | null;
}

export function parsePageContent(
  result: string,
): Pick<PageObservation, "materialKey" | "cosmeticTimestamp"> {
  const materialKey =
    result.match(/<meta name="mock-material-key" content="([^"]+)"/u)?.[1] ??
    result.match(/data-material-key="([^"]+)"/u)?.[1];
  if (!materialKey) throw new Error("MATERIAL_KEY_NOT_FOUND");
  return {
    materialKey,
    cosmeticTimestamp: result.match(/datetime="([^"]+)" data-cosmetic-timestamp/u)?.[1] ?? null,
  };
}

export async function observePage(browser: BrowserRun, url: string): Promise<PageObservation> {
  const response = await browser.quickAction("content", { url, cacheTTL: 0 });
  if (!response.ok) throw new Error(`BROWSER_CONTENT_${String(response.status)}`);
  const { result } = contentResponseSchema.parse(await response.json());
  const parsed = parsePageContent(result);
  const materialKey = parsed.materialKey;
  const cosmeticTimestamp = parsed.cosmeticTimestamp;
  const browserMsHeader = Number(response.headers.get("x-browser-ms-used"));
  return {
    materialKey,
    cosmeticTimestamp,
    browserMs: Number.isFinite(browserMsHeader) ? browserMsHeader : null,
  };
}

export async function captureScreenshot(browser: BrowserRun, url: string): Promise<Response> {
  const response = await browser.quickAction("screenshot", {
    url,
    screenshotOptions: { fullPage: true, type: "png" },
    cacheTTL: 0,
  });
  if (!response.ok) throw new Error(`BROWSER_SCREENSHOT_${String(response.status)}`);
  return response;
}
