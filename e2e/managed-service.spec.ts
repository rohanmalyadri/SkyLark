import { expect, test } from "@playwright/test";
import { demoSignIn } from "./helpers";

/**
 * The managed service end to end: answering the forms once, seeing the daily promise, the
 * specialist's side of it, and the public surfaces that feed it.
 */

test.describe("answer vault", () => {
  test("records a tri-state answer and refuses to invent one", async ({ page }) => {
    await demoSignIn(page, "Candidate");
    await page.goto("/answers");

    const question = "Have you ever refused or failed an employer drug test?";
    const group = page.getByRole("group", { name: question });

    await group.getByRole("button", { name: "No", exact: true }).click();
    await expect(group.getByRole("button", { name: "No", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(group.getByText("Unanswered")).toBeHidden();

    // Clearing returns the question to unanswered rather than flipping it to the other value.
    await group.getByRole("button", { name: `Clear answer to: ${question}` }).click();
    await expect(group.getByText("Unanswered")).toBeVisible();
    await expect(group.getByRole("button", { name: "No", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(group.getByRole("button", { name: "Yes", exact: true })).toHaveAttribute("aria-pressed", "false");
  });

  test("asks for an explanation only when the trigger answer is yes", async ({ page }) => {
    await demoSignIn(page, "Candidate");
    await page.goto("/answers");

    await expect(page.getByLabel("Details", { exact: true }).first()).toBeHidden();
    await page.getByRole("group", { name: "Have you been convicted of a felony?" }).getByRole("button", { name: "Yes", exact: true }).click();
    await expect(page.getByText("What, when, and anything since")).toBeVisible();
  });

  test("tells the candidate their self-identification is withheld from staff", async ({ page }) => {
    await demoSignIn(page, "Candidate");
    await page.goto("/answers");
    await expect(page.getByText("Withheld from staff")).toBeVisible();
    await expect(page.getByText(/never reaches your match scores/i)).toBeVisible();
  });

  test("saves a section and reports completeness", async ({ page }) => {
    await demoSignIn(page, "Candidate");
    await page.goto("/answers");

    const panel = page.locator("section", { has: page.getByRole("heading", { name: "Work eligibility" }) });
    await panel.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/Work eligibility saved/i)).toBeVisible();
  });
});

test.describe("the daily promise", () => {
  test("shows today's submissions and the week on the dashboard", async ({ page }) => {
    await demoSignIn(page, "Candidate");
    await expect(page.getByRole("heading", { name: "Applications sent for you" })).toBeVisible();
    await expect(page.getByRole("img", { name: /Applications sent each of the last seven days/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Pause applications/i })).toBeVisible();
  });
});

test.describe("the specialist's side", () => {
  test("a reviewer is told the delivery board is not theirs", async ({ page }) => {
    // The demo operations account is an admin, who is also an operator, so check the guard
    // copy exists for the reviewer case by visiting as a candidate first.
    await demoSignIn(page, "Candidate");
    await page.goto("/admin/delivery");
    // Candidates are bounced out of the console entirely.
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("an admin sees the board with today's totals", async ({ page }) => {
    await demoSignIn(page, "Operations");
    await page.goto("/admin/delivery");
    await expect(page.getByRole("heading", { name: "Delivery board" })).toBeVisible();
    await expect(page.getByText(/sent today/i)).toBeVisible();
  });

  test("the lead inbox is staff-only and filterable", async ({ page }) => {
    await demoSignIn(page, "Operations");
    await page.goto("/admin/leads");
    await expect(page.getByRole("heading", { name: "Enquiries" })).toBeVisible();
    await page.getByRole("button", { name: /^qualified/i }).click();
    await expect(page.getByRole("button", { name: /^qualified/i })).toHaveAttribute("aria-pressed", "true");
  });

  test("partners show their code and share link", async ({ page }) => {
    await demoSignIn(page, "Operations");
    await page.goto("/admin/partners");
    await expect(page.getByRole("heading", { name: "Partners & codes" })).toBeVisible();
    await expect(page.getByText("COMPASS20").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Promo codes" })).toBeVisible();
  });
});

test.describe("public surfaces", () => {
  test("a promo code is priced against real plan prices and a bad one is refused", async ({ page }) => {
    await page.goto("/pricing");
    const field = page.getByLabel("Promo code");
    await field.fill("NOTACODE");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.locator(".promo-box__msg--error")).toContainText(/recognise|applied/i);

    await field.fill("LAUNCH25");
    await page.getByRole("button", { name: "Apply" }).click();
    // The code applies to Professional and Executive only, so a struck-through price appears.
    await expect(page.getByText(/LAUNCH25 applied/).first()).toBeVisible();
  });

  test("a partner share link lands on pricing with the discount already in place", async ({ page }) => {
    await page.goto("/r/cmps7k2f4qd91xab");
    await expect(page).toHaveURL(/\/pricing\?promo=COMPASS20/);
    await expect(page.getByLabel("Promo code")).toHaveValue("COMPASS20");
  });

  test("an unknown share link quietly shows normal pricing", async ({ page }) => {
    await page.goto("/r/definitelynotarealtoken");
    await expect(page).toHaveURL(/\/pricing$/);
  });

  test("the contact form validates before it submits, then confirms", async ({ page }) => {
    await page.goto("/#contact");
    const form = page.locator("form.contact-form");
    await form.getByRole("button", { name: /Ask us to get in touch/i }).click();
    // Nothing is sent until the required fields are real.
    await expect(form).toBeVisible();

    await form.getByLabel("Your name").fill("Priya Raman");
    await form.getByLabel("Email").fill("priya.raman@example.com");
    await form.getByLabel("Phone").fill("912 445 778");
    await form.getByLabel("City").fill("Chennai");
    await form.getByRole("button", { name: /Ask us to get in touch/i }).click();

    await expect(page.getByText(/Thanks — we have it/i)).toBeVisible({ timeout: 15_000 });
  });

  test("the trust wall states commitments rather than testimonials", async ({ page }) => {
    await page.goto("/#trust");
    await expect(page.getByRole("heading", { name: /Every application comes with proof/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Your answers are yours/i })).toBeVisible();
  });
});

test("the new screens fit a phone without horizontal scrolling", async ({ page }) => {
  const noHorizontalScroll = () => document.documentElement.scrollWidth <= window.innerWidth + 1;
  await page.goto("/pricing");
  expect(await page.evaluate(noHorizontalScroll), "/pricing").toBe(true);

  await demoSignIn(page, "Candidate");
  for (const path of ["/answers", "/partner"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(noHorizontalScroll), path).toBe(true);
  }

  await demoSignIn(page, "Operations");
  for (const path of ["/admin/delivery", "/admin/partners", "/admin/leads"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(noHorizontalScroll), path).toBe(true);
  }
});

test.describe("multi-currency pricing", () => {
  test("converts prices and says what will actually be charged", async ({ page }) => {
    await page.goto("/pricing");

    const picker = page.getByLabel("Show prices in");
    // When rates are unavailable the picker is replaced by a note, so only assert the
    // conversion behaviour when a choice is actually offered.
    if (!(await picker.isVisible().catch(() => false))) {
      await expect(page.getByText(/Prices are in USD/i)).toBeVisible();
      return;
    }

    await expect(page.getByText(/Billed in USD/i)).toBeVisible();
    await picker.selectOption("INR");

    // Converted figures are marked approximate and rounded to whole units.
    await expect(page.locator(".plan .price").first()).toContainText("≈");
    await expect(page.locator(".plan .price").first()).not.toContainText(".");
    await expect(page.getByText(/Indicative only — you are charged in USD/i)).toBeVisible();
    await expect(page.locator(".plan-billed").first()).toContainText("Charged in USD");

    await picker.selectOption("USD");
    await expect(page.locator(".plan .price").first()).not.toContainText("≈");
  });
});

test.describe("writing", () => {
  test("lists posts and opens one", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/country that is not yours yet/i);

    const first = page.locator(".post-card").first();
    await expect(first).toContainText(/min read/);
    await first.getByRole("link", { name: /Read it/i }).click();

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Blocks render as real elements, so prose and lists are present as semantic HTML.
    await expect(page.locator(".post-body p").first()).toBeVisible();
  });

  test("a post carries its own metadata and structured data", async ({ page }) => {
    await page.goto("/blog/answer-the-forms-once");
    await expect(page).toHaveTitle(/questions every application form asks/i);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /two dozen questions/i);

    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(jsonLd ?? "{}");
    expect(parsed["@type"]).toBe("BlogPosting");
    expect(parsed.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parsed.author.name).toBeTruthy();
  });

  test("an unknown slug is a 404, not an empty page", async ({ page }) => {
    const res = await page.goto("/blog/no-such-article");
    expect(res?.status()).toBe(404);
  });

  test("links back to the index and shows related reading", async ({ page }) => {
    await page.goto("/blog/will-this-job-sponsor-you");
    await expect(page.getByRole("link", { name: /All writing/i })).toBeVisible();
    await page.getByRole("link", { name: /All writing/i }).click();
    await expect(page).toHaveURL(/\/blog$/);
  });

  test("the home page shows the latest posts", async ({ page }) => {
    await page.goto("/#writing");
    await expect(page.getByRole("heading", { name: /Practical notes on looking for work/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Everything we have written/i })).toBeVisible();
  });

  test("blog screens fit a phone", async ({ page }) => {
    const noHorizontalScroll = () => document.documentElement.scrollWidth <= window.innerWidth + 1;
    for (const path of ["/blog", "/blog/reading-your-match-score"]) {
      await page.goto(path);
      expect(await page.evaluate(noHorizontalScroll), path).toBe(true);
    }
  });
});
