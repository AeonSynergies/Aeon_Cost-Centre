import { test, expect, type Page } from "@playwright/test";

const EMAIL = "bharathprasad@aeonsynergies.com";
const PASSWORD = "Bharath25";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder(/aeonsynergies/i).fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

// Test 1 — Authentication
test.describe("Authentication", () => {
  test("redirects to login and rejects wrong password, accepts correct", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);

    await page.getByPlaceholder(/aeonsynergies/i).fill(EMAIL);
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();

    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

// Test 2 — Billing Generation
test.describe("Billing", () => {
  test("generate and finalise a billing record", async ({ page }) => {
    await login(page);
    await page.goto("/billing");
    await page.getByRole("button", { name: /generate billing/i }).click();
    await page.getByRole("button", { name: /^generate$/i }).click();
    // A draft row should appear; open it and finalise.
    await expect(page.getByText(/draft/i).first()).toBeVisible();
    await page.locator("tbody tr").first().click();
    await page.getByRole("button", { name: /finalise/i }).click();
    await expect(page.getByText(/finalised/i).first()).toBeVisible();
  });
});

// Test 3 — Resource Management
test.describe("Resources", () => {
  test("add a resource and open its detail", async ({ page }) => {
    await login(page);
    await page.goto("/resources");
    await page.getByRole("button", { name: /add resource/i }).first().click();
    const stamp = Date.now();
    await page.getByText("Employee Number").locator("xpath=following-sibling::input").fill(`E2E${stamp}`);
    // Fallback fill by order if label binding differs:
    const inputs = page.locator(".fixed input");
    await inputs.nth(0).fill(`E2E${stamp}`);
    await inputs.nth(1).fill("E2E Tester");
    await inputs.nth(2).fill("Engineer");
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.getByRole("button", { name: /create resource/i }).click();
    await expect(page.getByText("E2E Tester")).toBeVisible();
  });
});

// Test 4 — Client Creation
test.describe("Clients", () => {
  test("create a client through the wizard", async ({ page }) => {
    await login(page);
    await page.goto("/clients/new");
    const name = `E2E Client ${Date.now()}`;
    await page.locator("input").first().fill(name);
    await page.locator('input[type="date"]').first().fill("2026-01-01");
    await page.getByRole("button", { name: /^next$/i }).click(); // step 2
    await page.getByRole("button", { name: /^next$/i }).click(); // step 3
    await page.getByRole("button", { name: /add package block/i }).click();
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole("button", { name: /create client/i }).click();
    await expect(page).toHaveURL(/\/clients\//);
  });
});
