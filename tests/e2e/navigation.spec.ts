import { test, expect } from "@playwright/test";

test.describe("Mobile Application", () => {
  test("should render homepage with bottom navigation", async ({ page }) => {
    await page.goto("/");

    // Check page header
    await expect(page.getByRole("heading", { name: "Финансы" })).toBeVisible();

    // Check bottom navigation exists
    await expect(page.getByText("Главная")).toBeVisible();
    await expect(page.getByText("Календарь")).toBeVisible();
    await expect(page.getByText("Доходы")).toBeVisible();
    await expect(page.getByText("Расходы")).toBeVisible();

    // Check balance section
    await expect(page.getByText("Баланс")).toBeVisible();
    await expect(page.getByText("Доступно")).toBeVisible();
    await expect(page.getByText("Защищено")).toBeVisible();
  });

  test("should fit mobile viewport without horizontal scroll", async ({ page }) => {
    await page.goto("/");

    // Check viewport dimensions
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(390);
    expect(viewport?.height).toBe(844);

    // Check no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("should navigate to calendar page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Календарь/i }).click();
    await page.waitForURL("/calendar");
    await expect(page.getByRole("heading", { name: "Календарь" })).toBeVisible();
  });

  test("should render debts page", async ({ page }) => {
    await page.goto("/debts");
    await expect(page.getByRole("heading", { name: "Долги" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Добавить" })).toBeVisible();
  });
});
