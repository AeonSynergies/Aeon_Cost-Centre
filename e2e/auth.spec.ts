import { test, expect } from "@playwright/test";

/**
 * Phase 1 smoke test: an unauthenticated visitor is redirected to /login,
 * and the login form renders. The full billing-generation E2E flow is added
 * in Phase 3 once the billing screens exist.
 */
test("redirects unauthenticated users to the login page", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});
