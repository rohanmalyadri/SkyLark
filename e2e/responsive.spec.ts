import { expect, test } from "@playwright/test";
import { demoSignIn } from "./helpers";

const noHorizontalScroll = () => document.documentElement.scrollWidth <= window.innerWidth + 1;

test("key screens fit a phone without horizontal scrolling", async ({ page }) => {
  for (const path of ["/signup", "/terms", "/privacy"]) {
    await page.goto(path);
    expect(await page.evaluate(noHorizontalScroll), path).toBe(true);
  }
  await demoSignIn(page, "Candidate");
  for (const path of ["/dashboard", "/jobs", "/profile", "/settings"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(noHorizontalScroll), path).toBe(true);
  }
});
