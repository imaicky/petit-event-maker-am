import { test, expect } from '@playwright/test';

/**
 * Smoke tests for organizer follow feature (Issue #1)
 *
 * These tests validate the follow button surface without requiring
 * a real follows table — the page should still render and the API
 * should respond with a 401 for anonymous callers.
 */

test.describe('follow feature smoke', () => {
  test('GET / responds successfully', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
  });

  test('follow API rejects anonymous POST with 401', async ({ request }) => {
    const res = await request.post('/api/profiles/nonexistent-user-test/follow');
    // either 401 (no session) or 404 (user lookup) is acceptable here;
    // anything 5xx means the route handler crashed
    expect([401, 404]).toContain(res.status());
  });

  test('follow API rejects anonymous DELETE with 401', async ({ request }) => {
    const res = await request.delete('/api/profiles/nonexistent-user-test/follow');
    expect([401, 404]).toContain(res.status());
  });
});
