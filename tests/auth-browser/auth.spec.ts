import { test as base, expect } from "@playwright/test";
// A fresh browser per case also supports constrained single-process Chromium.
const test = base.extend({
  context: async (
    {
      playwright,
      browserName,
      launchOptions,
      contextOptions,
      baseURL,
      timezoneId,
    },
    runWithContext,
  ) => {
    const browser = await playwright[browserName].launch(launchOptions);
    const context = await browser.newContext({
      ...contextOptions,
      baseURL,
      timezoneId,
    });
    try {
      await runWithContext(context);
    } finally {
      await browser.close();
    }
  },
});
const user = {
  id: "a2c3dd44-5555-4666-8777-889900112233",
  email: "owner@example.com",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800, role: "authenticated" })).toString("base64url")}.test`;
const session = {
  access_token: token,
  refresh_token: "test-refresh",
  token_type: "bearer",
  expires_in: 3600,
  user,
};
test("sign-in gate hides records, handles errors, and retains a password session", async ({
  page,
}) => {
  let loginCalls = 0;
  await page.route(
    "https://auth-test.supabase.co/auth/v1/**",
    async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/token")) {
        loginCalls++;
        const valid =
          route.request().postDataJSON().password === "correct-password";
        await route.fulfill({
          status: valid ? 200 : 400,
          json: valid
            ? session
            : { code: "invalid_credentials", msg: "Invalid login credentials" },
        });
      } else await route.fulfill({ json: user });
    },
  );
  await page.goto("/accounts");
  await expect(
    page.getByRole("heading", { name: "Welcome to Phinance" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Invalid login credentials",
  );
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  expect(loginCalls).toBe(2);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome to Phinance" }),
  ).toBeVisible();
});
test("email limits give actionable feedback and keep password sign-in available", async ({
  page,
}) => {
  await page.route("https://auth-test.supabase.co/auth/v1/recover**", (route) =>
    route.fulfill({
      status: 429,
      json: {
        code: "over_email_send_rate_limit",
        msg: "email rate limit exceeded",
      },
    }),
  );
  await page.goto("/settings#error=access_denied&error_code=otp_expired");
  await expect(
    page.getByRole("alert").filter({ hasText: "The email link" }),
  ).toContainText("expired or already been used");
  await page.getByRole("button", { name: "Set or reset password" }).click();
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByRole("button", { name: "Send password setup link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "email limit has been reached",
  );
  await expect(
    page.getByRole("button", { name: /Wait .*before requesting/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled();
});
test("recovery link requires a new password before showing finances", async ({
  page,
}) => {
  let updated = false;
  await page.route(
    "https://auth-test.supabase.co/auth/v1/**",
    async (route) => {
      if (route.request().method() === "PUT") {
        expect(route.request().postDataJSON().password).toBe(
          "a-new-strong-password",
        );
        updated = true;
      }
      await route.fulfill({ json: user });
    },
  );
  await page.goto(
    `/settings#access_token=${token}&refresh_token=test-refresh&expires_in=3600&token_type=bearer&type=recovery`,
  );
  await expect(
    page.getByRole("heading", { name: "Choose your password" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await page
    .getByLabel("New password", { exact: true })
    .fill("a-new-strong-password");
  await page.getByLabel("Confirm new password").fill("a-new-strong-password");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  expect(updated).toBe(true);
});
