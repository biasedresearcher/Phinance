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
import type { BrowserContext, Page } from "@playwright/test";
import { emptyData } from "../../lib/finance-repository";
import type { FinanceData } from "../../lib/types";
function backend() {
  let cloud: {
    payload: { schemaVersion: number; data: FinanceData };
    revision: number;
  } | null = null;
  let writes = 0;
  let hold: Promise<void> | null = null;
  return {
    holdNextWrite() {
      let release!: () => void;
      hold = new Promise<void>((resolve) => {
        release = resolve;
      });
      return release;
    },
    get cloud() {
      return cloud;
    },
    get writes() {
      return writes;
    },
    async connect(context: BrowserContext) {
      await context.addInitScript(
        ({ session }) => {
          if (!localStorage.getItem("sb-auth-test-auth-token"))
            localStorage.setItem(
              "sb-auth-test-auth-token",
              JSON.stringify({ ...session, expires_at: 4102444800 }),
            );
        },
        { session },
      );
      await context.route("https://auth-test.supabase.co/auth/v1/**", (route) =>
        route.fulfill({ json: user }),
      );
      await context.route(
        "https://auth-test.supabase.co/rest/v1/**",
        async (route) => {
          if (route.request().method() === "POST") {
            const body = route.request().postDataJSON();
            if (body.p_expected_revision !== (cloud?.revision ?? null)) {
              await route.fulfill({
                status: 409,
                json: { code: "40001", message: "Newer cloud copy" },
              });
              return;
            }
            cloud = {
              payload: body.p_payload,
              revision: (cloud?.revision ?? 0) + 1,
            };
            writes++;
            const revision = cloud.revision;
            const pending = hold;
            hold = null;
            if (pending) await pending;
            await route.fulfill({ json: revision });
          } else await route.fulfill({ json: cloud ? [cloud] : [] });
        },
      );
    },
  };
}
async function addAccount(page: Page, name: string) {
  await page.getByLabel("Account name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Save account", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}
const upToDate = (page: Page) =>
  expect(
    page.getByRole("button", { name: "Up to date", exact: true }),
  ).toBeVisible({ timeout: 15000 });
test("two devices sync automatically, queue offline edits, and pause conflicting copies", async ({
  context,
  page,
  playwright,
  launchOptions,
}) => {
  const api = backend();
  await api.connect(context);
  await page.goto("/accounts");
  await upToDate(page);
  await addAccount(page, "Mac bank");
  await expect.poll(() => api.cloud?.payload.data.accounts.length).toBe(1);
  const androidBrowser = await playwright.chromium.launch(launchOptions);
  const android = await androidBrowser.newContext({
    baseURL: "http://127.0.0.1:3000",
  });
  try {
    await api.connect(android);
    const phone = await android.newPage();
    await phone.goto("/accounts");
    await expect(
      phone.getByRole("heading", { name: "Mac bank", exact: true }),
    ).toBeVisible();
    await upToDate(phone);
    await android.setOffline(true);
    await addAccount(phone, "Offline cash");
    await expect(
      phone.getByRole("button", { name: /Offline · edits saved here/ }),
    ).toBeVisible();
    expect(api.cloud?.payload.data.accounts.length).toBe(1);
    await android.setOffline(false);
    await expect.poll(() => api.cloud?.payload.data.accounts.length).toBe(2);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(
      page.getByRole("heading", { name: "Offline cash", exact: true }),
    ).toBeVisible();
    await upToDate(page);
    await upToDate(phone);
    await android.setOffline(true);
    await addAccount(phone, "Phone edit");
    await addAccount(page, "Mac edit");
    await expect
      .poll(() =>
        api.cloud?.payload.data.accounts.some((a) => a.name === "Mac edit"),
      )
      .toBe(true);
    const before = api.writes;
    await android.setOffline(false);
    await expect(
      phone.getByRole("button", { name: "Sync needs attention" }),
    ).toBeVisible();
    await phone.getByRole("button", { name: "Sync needs attention" }).click();
    await expect(
      phone.getByRole("status").filter({ hasText: "Both copies" }),
    ).toBeVisible();
    expect(api.writes).toBe(before);
    expect(
      api.cloud?.payload.data.accounts.some((a) => a.name === "Phone edit"),
    ).toBe(false);
    await expect(
      phone.getByRole("heading", { name: "Phone edit", exact: true }),
    ).toBeVisible();
    phone.once("dialog", (d) => d.accept());
    await phone
      .getByRole("button", { name: "Use cloud copy", exact: true })
      .click();
    await expect(
      phone.getByRole("heading", { name: "Mac edit", exact: true }),
    ).toBeVisible();
    await expect(
      phone.getByRole("heading", { name: "Phone edit", exact: true }),
    ).toHaveCount(0);
    await upToDate(phone);
    const recovery = await phone.evaluate(
      (userId) =>
        JSON.parse(localStorage.getItem(`phinance-sync-recovery:${userId}`)!),
      user.id,
    );
    expect(
      recovery.local.data.accounts.some(
        (a: { name: string }) => a.name === "Phone edit",
      ),
    ).toBe(true);
    expect(
      recovery.cloud.data.accounts.some(
        (a: { name: string }) => a.name === "Mac edit",
      ),
    ).toBe(true);
  } finally {
    await androidBrowser.close();
  }
});
test("a different account cannot automatically upload this profile's local finances", async ({
  context,
  page,
}) => {
  const api = backend();
  await api.connect(context);
  await context.addInitScript(() =>
    localStorage.setItem("phinance-sync-owner", "another-user"),
  );
  await page.goto("/accounts");
  await expect(
    page.getByRole("button", { name: "Sync needs attention" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sync needs attention" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "another account" }),
  ).toBeVisible();
  expect(api.writes).toBe(0);
});
test("existing manual-sync history safely uploads pending edits after upgrade", async ({
  context,
  page,
}) => {
  const api = backend();
  await api.connect(context);
  await page.goto("/accounts");
  await upToDate(page);
  await page.evaluate(
    ({ userId, data }) => {
      localStorage.removeItem(`phinance-auto-sync:${userId}`);
      localStorage.setItem(
        "phinance-v2",
        JSON.stringify({
          schemaVersion: 2,
          revision: 1,
          updatedAt: new Date().toISOString(),
          data,
        }),
      );
    },
    {
      userId: user.id,
      data: {
        ...emptyData(),
        settings: { ...emptyData().settings, expectedSalary: 50000 },
      },
    },
  );
  await page.reload();
  await expect
    .poll(() => api.cloud?.payload.data.settings.expectedSalary)
    .toBe(50000);
  await upToDate(page);
});

test("edits made during an upload are queued rather than marked as already synced", async ({
  context,
  page,
}) => {
  const api = backend();
  await api.connect(context);
  await page.goto("/accounts");
  await upToDate(page);
  const release = api.holdNextWrite();
  await addAccount(page, "First edit");
  await expect.poll(() => api.cloud?.payload.data.accounts.length).toBe(1);
  await addAccount(page, "Second edit");
  release();
  await expect.poll(() => api.cloud?.payload.data.accounts.length).toBe(2);
  await upToDate(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Second edit", exact: true }),
  ).toBeVisible();
});
