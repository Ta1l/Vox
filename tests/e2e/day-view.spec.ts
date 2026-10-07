import { expect, test } from "@playwright/test";

test("records selected-day earnings once and refreshes both summaries", async ({ page }) => {
  let earned = 500000;
  let posts = 0;
  const calendarRequests: string[] = [];
  await page.route("**/api/calendar?*", async (route) => {
    calendarRequests.push(route.request().url());
    await route.fulfill({ json: { events: [{ date: "2026-10-06", earnedIncome: earned, inTransitIncome: earned, receivedIncome: 0, expectedIncome: earned, expenses: 0, scheduledPayments: [] }] } });
  });
  await page.route("**/api/dashboard", (route) => route.fulfill({ json: { financial: { availableCashKopecks: 0, protectedAmountKopecks: 0, discretionaryAmountKopecks: 0, incomeInTransitKopecks: earned } } }));
  await page.route("**/api/income", async (route) => {
    posts += 1;
    expect(route.request().postDataJSON()).toEqual({ amountKopecks: 500050, source: "Работа", earnedAt: "2026-10-06T00:00:00.000Z" });
    earned += 500050;
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ status: 201, json: { status: "EARNED" } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Открыть 2026-10-06" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /6 октября/i })).toBeVisible();
  await expect(page.getByText("5 000 ₽").first()).toBeVisible();
  await page.getByLabel("Сумма, ₽").fill("5000,50");
  await page.getByRole("button", { name: "Записать заработок" }).click();
  await expect(page.getByRole("button", { name: "Сохраняем…" })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Заработок записан");
  await expect(page.getByText("10 000,50 ₽").first()).toBeVisible();
  expect(posts).toBe(1);
  await page.getByRole("button", { name: "Назад" }).click();
  await expect(page.getByText("В пути 10 000,50 ₽")).toBeVisible();
  await expect(page.getByText("Доступно сейчас")).toBeVisible();
  expect(calendarRequests.length).toBeGreaterThanOrEqual(2);
});

test("changes month when moving from 31 October to 1 November", async ({ page }) => {
  const requests: string[] = [];
  await page.route("**/api/calendar?*", async (route) => { requests.push(route.request().url()); await route.fulfill({ json: { events: [] } }); });
  await page.route("**/api/dashboard", (route) => route.fulfill({ json: { financial: { availableCashKopecks: 0, protectedAmountKopecks: 0, discretionaryAmountKopecks: 0, incomeInTransitKopecks: 0 } } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Открыть 2026-10-31" }).click();
  await page.getByRole("button", { name: "Открыть 2026-11-01" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /1 ноября/i })).toBeVisible();
  await expect.poll(() => requests.some((url) => url.includes("year=2026&month=11"))).toBe(true);
});

test("keeps a failed draft and does not repeat a saved POST after refresh fails", async ({ page }) => {
  let posts = 0;
  let refreshFails = false;
  await page.route("**/api/calendar?*", (route) => refreshFails
    ? route.fulfill({ status: 500, body: "{}" })
    : route.fulfill({ json: { events: [] } }));
  await page.route("**/api/dashboard", (route) => route.fulfill({ json: { financial: { availableCashKopecks: 0, protectedAmountKopecks: 0, discretionaryAmountKopecks: 0, incomeInTransitKopecks: 0 } } }));
  await page.route("**/api/income", async (route) => {
    posts += 1;
    if (posts === 1) { await route.fulfill({ status: 400, json: { message: "Invalid input", errors: [{ path: ["amountKopecks"] }] } }); return; }
    refreshFails = true;
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ status: 201, json: { status: "EARNED" } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Открыть 2026-10-06" }).click();
  await page.getByLabel("Сумма, ₽").fill("100");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Открыть 2026-10-07" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /6 октября/i })).toBeVisible();
  await expect(page.getByLabel("Сумма, ₽")).toHaveValue("100");
  await page.getByRole("button", { name: "Записать заработок" }).click();
  await expect(page.locator("#income-error")).toContainText("Проверьте сумму");
  await expect(page.getByLabel("Сумма, ₽")).toHaveValue("100");
  await page.getByRole("button", { name: "Записать заработок" }).click();
  await expect(page.getByText("Заработок сохранён, но сводку обновить не удалось.", { exact: false })).toBeVisible();
  expect(posts).toBe(2);
  await expect(page.getByLabel("Сумма, ₽")).toHaveValue("");
});

test("does a read-only refresh after a lost POST response", async ({ page }) => {
  let posts = 0;
  let calendarReads = 0;
  await page.route("**/api/calendar?*", (route) => { calendarReads += 1; return route.fulfill({ json: { events: [] } }); });
  await page.route("**/api/dashboard", (route) => route.fulfill({ json: { financial: { availableCashKopecks: 0, protectedAmountKopecks: 0, discretionaryAmountKopecks: 0, incomeInTransitKopecks: 0 } } }));
  await page.route("**/api/income", (route) => { posts += 1; return route.abort("failed"); });
  await page.goto("/");
  await page.getByRole("button", { name: "Открыть 2026-10-06" }).click();
  await page.getByLabel("Сумма, ₽").fill("100");
  await page.getByRole("button", { name: "Записать заработок" }).click();
  await expect(page.locator("#income-error")).toContainText("Не удалось подтвердить сохранение");
  await expect(page.getByLabel("Сумма, ₽")).toHaveValue("100");
  expect(posts).toBe(1);
  expect(calendarReads).toBeGreaterThanOrEqual(2);
});
