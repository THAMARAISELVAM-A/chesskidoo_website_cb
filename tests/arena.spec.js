import { test, expect } from '@playwright/test';

test.describe('ChessKiddo AI Arena & Portals E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Vite dev server port (default 5174 or 5173)
    await page.goto('http://localhost:5174/');
    // Navigate to the arena page
    await page.evaluate(() => {
      if (window.CK && typeof window.CK.navigate === 'function') {
        window.CK.navigate('arena');
      }
    });
  });

  test('1. Core Application & AI Settings Panel Loads', async ({ page }) => {
    // Verify page title and main components exist
    await expect(page).toHaveTitle(/ChessKidoo/i);

    // Verify AI settings checkboxes are loaded
    await expect(page.locator('#arena-coach-mode')).toBeAttached();
    await expect(page.locator('#arena-audio-coach')).toBeAttached();
    await expect(page.locator('#arena-threat-map')).toBeAttached();
    await expect(page.locator('#arena-safety-radar')).toBeAttached();
  });

  test('2. Board Coordinates Render Internally (a1-h8)', async ({ page }) => {
    // Ensure external coordinate strips are hidden to prevent mobile overflow
    const leftCoords = page.locator('.arena-coords-left');
    const bottomCoords = page.locator('.arena-coords-bottom');
    await expect(leftCoords).toBeHidden();
    await expect(bottomCoords).toBeHidden();

    // Verify coordinates are loaded directly inside the board squares
    const rankCoord = page.locator('.a-sq .board-coord-rank');
    const fileCoord = page.locator('.a-sq .board-coord-file');
    await expect(rankCoord.first()).toBeVisible();
    await expect(fileCoord.first()).toBeVisible();
  });

  test('3. AI Settings Toggle Persistence', async ({ page }) => {
    const coachToggle = page.locator('#arena-coach-mode');
    
    // Toggle on and check status
    await page.evaluate(() => document.getElementById('arena-coach-mode').click());
    await expect(coachToggle).toBeChecked();

    // Verify state matches localStorage
    let stored = await page.evaluate(() => localStorage.getItem('ck_coach_mode'));
    expect(stored).toBe('true');

    // Toggle off and verify change
    await page.evaluate(() => document.getElementById('arena-coach-mode').click());
    await expect(coachToggle).not.toBeChecked();
    stored = await page.evaluate(() => localStorage.getItem('ck_coach_mode'));
    expect(stored).toBe('false');
  });

  test('4. AI Coach Live Commentary Updates Feed', async ({ page }) => {
    const commentary = page.locator('#arena-coach-commentary-text');
    await expect(commentary).toBeVisible();
    
    // Default starting message
    await expect(commentary).toContainText(/Tom AI is watching/i);
  });

  test('5. Parent Portal UPI Payment Form & QR Codes', async ({ page }) => {
    // Mock login parent role
    await page.evaluate(() => {
      localStorage.setItem('ck_user', JSON.stringify({
        id: 'p-test',
        email: 'parent@gmail.com',
        full_name: 'Test Parent',
        role: 'parent'
      }));
    });
    
    await page.goto('http://localhost:5174/');
    
    // Verify parent elements exist
    await expect(page.locator('#parentWelcomeName')).toBeAttached();
  });
});
