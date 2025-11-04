import { test, expect } from '@playwright/test';
test('create-save-export', async ({ page })=>{
  await page.goto('/');
  await page.getByPlaceholder('Client Name').fill('Acme Corp');
  await page.getByRole('button', { name: /Add Item/i }).click();
  await page.locator('input[type="number"]').first().fill('2');
  await page.locator('input[type="number"]').nth(1).fill('100');
  await page.getByRole('button', { name: /Save to DB/i }).click();
  await page.getByRole('button', { name: /Invoices/i }).click();
  await expect(page.getByText('Acme Corp')).toBeVisible();
});
