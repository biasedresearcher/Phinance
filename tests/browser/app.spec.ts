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
import { emptyData } from "../../lib/finance-repository";
import type { FinanceData } from "../../lib/types";
const today = "2026-09-24";
function fixture(): FinanceData {
  const d = emptyData();
  d.accounts = [
    {
      id: "a",
      name: "Salary account",
      kind: "bank",
      openingBalance: 10000,
      openingDate: "2026-09-01",
      spendable: true,
    },
  ];
  d.transactions = [
    {
      id: "s",
      kind: "income",
      amount: 50000,
      date: "2026-09-01",
      accountId: "a",
      category: "Salary",
      note: "September salary",
      salaryMonth: "2026-09",
    },
  ];
  return d;
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${today}T12:00:00+05:30`));
});
async function seed(page: import("@playwright/test").Page, data: FinanceData) {
  await page.goto("/");
  await page.evaluate(
    (d) =>
      localStorage.setItem(
        "phinance-v2",
        JSON.stringify({
          schemaVersion: 2,
          revision: 1,
          updatedAt: new Date().toISOString(),
          data: d,
        }),
      ),
    data,
  );
  await page.reload();
  await expect(page.getByText("Loading your records…")).toHaveCount(0);
}

test("first salary, expense, edit, delete and reload reconcile on a fresh account", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/accounts");
  await page.getByLabel("Account name", { exact: true }).fill("My bank");
  await page.getByLabel("Opening balance (₹)", { exact: true }).fill("10000");
  await page.getByLabel("Opening date", { exact: true }).fill("2026-09-01");
  await page.getByRole("button", { name: "Save account", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My bank", exact: true }),
  ).toBeVisible();
  await page.goto("/salary");
  await page.getByLabel("Amount (₹)", { exact: true }).fill("50000");
  await page.getByLabel("Date money moved").fill("2026-09-02");
  await page
    .getByRole("button", { name: "Save transaction", exact: true })
    .click();
  await expect(page.getByRole("table")).toContainText("50,000.00");
  await page.goto("/expenses");
  await page.getByLabel("Amount (₹)", { exact: true }).fill("125.50");
  await page.getByLabel("Category", { exact: true }).selectOption("Food");
  await page
    .getByRole("button", { name: "Save transaction", exact: true })
    .click();
  await expect(page.getByRole("table")).toContainText("125.50");
  await page.getByRole("button", { name: /^Edit Food/ }).click();
  await page
    .getByRole("heading", { name: "Edit transaction" })
    .locator("..")
    .getByLabel("Amount (₹)", { exact: true })
    .fill("100.25");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.goto("/accounts");
  await expect(page.getByText("₹59,899.75", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("₹59,899.75", { exact: true })).toBeVisible();
  await page.goto("/expenses");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /^Delete Food/ }).click();
  await expect(page.getByRole("table")).not.toContainText("100.25");
  expect(errors).toEqual([]);
});

test("backup export and validated restore preserve data; malformed input does not", async ({
  page,
}) => {
  await seed(page, fixture());
  await page.goto("/settings");
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export JSON backup", exact: true })
    .click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/^phinance-.*\.json$/);
  await page.getByLabel("Choose a backup to inspect").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":2,"data":{}}'),
  });
  await expect(page.getByText(/Settings must be an object/)).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("phinance-v2")!).data.transactions
          .length,
    ),
  ).toBe(1);
  const data = fixture();
  data.transactions[0].amount = 45000;
  await page.getByLabel("Choose a backup to inspect").setInputFiles({
    name: "restore.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 2, data })),
  });
  await expect(page.getByText("Restore preview:")).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Export current records & restore" })
    .click();
  await expect(page.getByText("Backup restored successfully.")).toBeVisible();
  await page.goto("/accounts");
  await expect(page.getByText("₹55,000.00", { exact: true })).toBeVisible();
});

test("demo mode survives navigation and leaves personal records untouched", async ({
  page,
}) => {
  await seed(page, fixture());
  const original = await page.evaluate(() =>
    localStorage.getItem("phinance-v2"),
  );
  await page.goto("/settings");
  await page.getByRole("button", { name: "Open demo mode" }).click();
  await page.goto("/accounts");
  await expect(
    page.getByRole("heading", { name: "Demo salary account", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Leave demo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Salary account", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("phinance-v2"))).toBe(
    original,
  );
});

test("loan payment clears a due commitment and cash changes once", async ({
  page,
}) => {
  const d = fixture();
  d.loans = [
    {
      id: "l",
      name: "Device loan",
      amount: 10000,
      interestRate: 0,
      monthlyInstallment: 1000,
      startDate: "2026-08-01",
      firstDueDate: "2026-09-01",
    },
  ];
  await seed(page, d);
  await page.goto("/planner");
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save transaction", exact: true })
    .click();
  await expect(
    page.getByText("No unpaid scheduled payments in this month."),
  ).toBeVisible();
  await page.goto("/accounts");
  await expect(page.getByText("₹59,000.00", { exact: true })).toBeVisible();
  await page.goto("/emi");
  await expect(page.getByText("₹9,000.00", { exact: true })).toBeVisible();
});

test("phone layout has no page overflow, and offline navigation and entry work", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, fixture());
  await expect(
    page.getByText("Offline access ready on this device"),
  ).toBeVisible({ timeout: 30000 });
  await page.screenshot({
    path: "test-results/phinance-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await context.setOffline(true);
  await page.goto("/expenses");
  await page.getByLabel("Amount (₹)", { exact: true }).fill("25.75");
  await page.getByLabel("Category", { exact: true }).selectOption("Food");
  await page
    .getByRole("button", { name: "Save transaction", exact: true })
    .click();
  await expect(page.getByRole("table")).toContainText("25.75");
  await page.reload();
  await expect(page.getByRole("table")).toContainText("25.75");
  await page.goto("/accounts");
  await expect(page.getByText("₹59,974.25", { exact: true })).toBeVisible();
  await context.setOffline(false);
});

test("corrupt local data is recoverable without sample replacement", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.evaluate(() => localStorage.setItem("phinance-v2", "{corrupt"));
  await page.reload();
  await expect(page.locator(".error-banner")).toContainText(
    "Records could not be loaded",
  );
  await expect(
    page.getByRole("button", { name: "Download unreadable original" }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("phinance-v2"))).toBe(
    "{corrupt",
  );
});
