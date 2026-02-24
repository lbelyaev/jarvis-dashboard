import { test, expect, APIRequestContext, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3333';

test.describe('Jarvis Dashboard E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    await page.goto(BASE_URL);
  });

  test.describe('Home Page', () => {
    test('should load the home page', async () => {
      await expect(page).toHaveTitle(/Jarvis/);
      await expect(page.locator('text=Gateway Online')).toBeVisible();
    });

    test('should show navigation sidebar', async () => {
      await expect(page.locator('aside >> text=Overview')).toBeVisible();
      await expect(page.locator('aside >> text=Sub-Agents')).toBeVisible();
      await expect(page.locator('aside >> text=Missions')).toBeVisible();
    });
  });

  test.describe('Missions List Page', () => {
    test('should load missions list', async () => {
      await page.click('a:has-text("Missions")');
      await expect(page).toHaveURL(/.*missions/);
    });

    test('should show all missions', async () => {
      await page.goto(`${BASE_URL}/missions`);
      // Check for at least some mission cards
      const missionCards = page.locator('[class*="border-zinc"]');
      await expect(missionCards.first()).toBeVisible();
    });
  });

  test.describe('Mission Detail Page', () => {
    test('should load mission detail with repo selector', async () => {
      await page.goto(`${BASE_URL}/missions/9`);
      await expect(page.locator('h1:has-text("Rich Mission Audit Trail")')).toBeVisible();
      await expect(page.locator('label:has-text("Repository")')).toBeVisible();
    });

    test('should show repo dropdown with options', async () => {
      await page.goto(`${BASE_URL}/missions/9`);
      const repoSelect = page.locator('select').nth(1); // Second select is repo
      await expect(repoSelect).toBeVisible();
      // Mission 9 has repo_id=35 assigned
      await expect(repoSelect).toHaveValue('35');
    });

    test('should show status dropdown', async () => {
      await page.goto(`${BASE_URL}/missions/9`);
      const statusSelect = page.locator('select').first();
      await expect(statusSelect).toBeVisible();
    });
  });

  test.describe('Sub-Agents Page', () => {
    test('should load sub-agents page', async () => {
      await page.click('a:has-text("Sub-Agents")');
      await expect(page).toHaveURL(/.*agents/);
    });

    test('should show agent runs', async () => {
      await page.goto(`${BASE_URL}/agents`);
      await expect(page.locator('h1:has-text("Sub-Agents")')).toBeVisible();
    });
  });

  test.describe('Ops Log Page', () => {
    test('should load ops log page', async () => {
      await page.click('text=Ops Log');
      await expect(page).toHaveURL(/.*ops-log/);
    });
  });

  test.describe('Costs Page', () => {
    test('should load costs page', async () => {
      await page.click('text=Cost Analytics');
      await expect(page).toHaveURL(/.*costs/);
    });
  });
});

test.describe('API Tests', () => {
  test('GET /api/missions should return missions', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/missions`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.missions).toBeDefined();
    expect(Array.isArray(data.missions)).toBeTruthy();
  });

  test('GET /api/missions?id=9 should return mission detail', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/missions?id=9`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.mission).toBeDefined();
    expect(data.mission.id).toBe(9);
    expect(data.repos).toBeDefined();
    expect(data.repos.length).toBeGreaterThan(0);
  });

  test('GET /api/agent-runs should return agent runs', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agent-runs`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.runs).toBeDefined();
    expect(Array.isArray(data.runs)).toBeTruthy();
  });

  test('GET /api/repos should return repos', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/repos`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.repos).toBeDefined();
    expect(Array.isArray(data.repos)).toBeTruthy();
  });
});
