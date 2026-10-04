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

  test("should render goals page", async ({ page }) => {
    await page.goto("/goals");
    await expect(page.getByRole("heading", { name: "Цели" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Добавить" })).toBeVisible();
  });

  test("should render envelopes page", async ({ page }) => {
    await page.goto("/envelopes");
    await expect(page.getByRole("heading", { name: "Конверты" })).toBeVisible();
  });

  test("should render planning page", async ({ page }) => {
    await page.goto("/planning");
    await expect(page.getByRole("heading", { name: "Планирование" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Начать планирование" })).toBeVisible();
  });

  test("should render mobile adviser chat", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByRole("heading", { name: "Финансовый советник" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Новый чат" })).toBeVisible();
    await expect(page.getByText("Начать разговор")).toBeVisible();
  });

  test("should render notifications page", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: "Уведомления" })).toBeVisible();
  });

  test("should render transaction import page", async ({ page }) => {
    await page.goto("/imports");
    await expect(page.getByRole("heading", { name: "Импорт операций" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Импортировать" })).toBeVisible();
  });

  test("should render AI provider settings", async ({ page }) => {
    await page.goto("/settings/ai-provider");
    await expect(page.getByRole("heading", { name: "AI-провайдер" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Сохранить и проверить" })).toBeVisible();
  });
});
