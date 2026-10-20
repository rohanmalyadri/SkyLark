import { expect, test } from "@playwright/test";
import { demoSignIn, signUp, typeSuggest, uniqueEmail } from "./helpers";

test.describe("registration", () => {
  test("rejects a gibberish name inline and an undeliverable email on the server", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("jhfavd");
    await page.getByLabel("Email").click();
    await expect(page.getByText("That doesn't look like a real name")).toBeVisible();

    await signUp(page, { name: "Test Person", email: "someone@no-such-domain-skylark-e2e.com" });
    await expect(page.getByText(/can't receive email/)).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("refuses duplicate accounts", async ({ page }) => {
    const email = uniqueEmail("dup");
    await signUp(page, { name: "Dana Duplicate", email });
    await expect(page).toHaveURL(/\/onboarding/);
    await page.context().clearCookies();
    await signUp(page, { name: "Dana Duplicate", email: email.toUpperCase() });
    await expect(page.getByText(/already exists/).first()).toBeVisible();
  });

  test("validates missing and implausible onboarding fields", async ({ page }) => {
    await signUp(page, { name: "Olive Onboard", email: uniqueEmail("onb") });
    await expect(page).toHaveURL(/\/onboarding/);
    await page.getByRole("button", { name: "Skip for now" }).click();
    await page.getByLabel("Headline").fill("asdfgh qwerty");
    await page.getByLabel("Headline").blur();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/doesn't look like a real word/).first()).toBeVisible();
    await expect(page.getByText("Choose your country")).toBeVisible();
    await expect(page.getByText("A few details are missing above.")).toBeVisible();
  });
});

test.describe("skills", () => {
  test.beforeEach(async ({ page }) => {
    await demoSignIn(page, "Candidate");
    await page.goto("/profile#skills");
  });

  test("suggests spellings and refuses gibberish", async ({ page }) => {
    const input = await typeSuggest(page, "New skill", "Kubernets");
    await input.press("Enter");
    await expect(page.getByText("Did you mean")).toBeVisible();
    await page.getByRole("button", { name: "Kubernetes", exact: true }).click();
    await expect(page.getByRole("radiogroup", { name: "Kubernetes proficiency" })).toBeVisible();

    const again = await typeSuggest(page, "New skill", "jhfavd");
    await again.press("Enter");
    await expect(page.getByText("“jhfavd” isn't a recognised skill")).toBeVisible();
    await expect(page.getByText(/Ask a reviewer/)).toHaveCount(0);
  });

  test("degrades gracefully when the suggestion API fails", async ({ page }) => {
    await page.route("**/api/skills/suggest**", (route) => route.fulfill({ status: 503, body: "unavailable" }));
    const input = await typeSuggest(page, "New skill", "Quarkusish");
    await input.press("Enter");
    await expect(page.getByText(/Suggestions are unavailable right now/)).toBeVisible();
  });
});

test.describe("matching", () => {
  test("explains matches and shows an empty state for impossible filters", async ({ page }) => {
    await demoSignIn(page, "Candidate");
    await page.goto("/jobs?q=zzzz-no-such-role-zzzz");
    await expect(page.getByText("No roles match these filters")).toBeVisible();
    await page.goto("/jobs");
    await expect(page.getByText(/Live listings|Live job data is unavailable/).first()).toBeVisible();
    await page.locator('a[href^="/jobs/"]').first().click();
    await expect(page.getByText("Why it matches", { exact: false })).toBeVisible();
    await expect(page.getByText(/weight/).first()).toBeVisible();
  });
});

test.describe("access control", () => {
  test("keeps candidates out of the admin portal", async ({ page }) => {
    await demoSignIn(page, "Candidate");
    await page.goto("/admin/candidates");
    await expect(page).toHaveURL(/\/dashboard/);
    const res = await page.request.get("/api/resumes/00000000-0000-4000-8000-000000000000?owner=someone-else");
    expect(res.status()).toBe(404);
  });

  test("lets staff review a candidate and requires a reason to reject", async ({ page }) => {
    await demoSignIn(page, "Operations");
    await page.goto("/admin/candidates?status=pending");
    await page.getByRole("link", { name: "Aisha Bello" }).click();
    await page.getByRole("button", { name: "Reject" }).click();
    await expect(page.getByText(/Explain what the candidate needs to change/)).toBeVisible();
    await page.getByLabel("Note to the candidate").fill("Please add a resume and your work history before we can verify you.");
    await page.getByRole("button", { name: "Request changes" }).click();
    await expect(page.getByText("Changes requested").first()).toBeVisible();
  });

  test("blocks signed-out visitors from private APIs", async ({ request }) => {
    expect((await request.get("/api/me/export")).status()).toBe(401);
  });
});
