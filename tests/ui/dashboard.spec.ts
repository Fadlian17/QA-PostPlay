import { test, expect } from '../../fixtures/base';

// Helper login UI — saucedemo tidak punya API login
async function loginToSaucedemo(page: any) {
  await page.goto('/');
  await page.locator('#user-name').fill('standard_user');
  await page.locator('#password').fill('secret_sauce');
  await page.locator('[data-test="login-button"]').click();
  await expect(page).toHaveURL(/.*inventory/);
  await expect(page.locator('.inventory_list')).toBeVisible();
  await expect(page.locator('.product_sort_container')).toBeVisible();
}

test.describe('Inventory Dashboard', () => {

  test('halaman inventory menampilkan daftar produk', async ({ page }) => {
    await loginToSaucedemo(page);

    await expect(page.locator('.inventory_list')).toBeVisible();

    const items = page.locator('.inventory_item');
    await expect(items).toHaveCount(6); // Saucedemo selalu punya 6 produk
  });

  test('setiap produk menampilkan nama, deskripsi, dan harga', async ({ page }) => {
    await loginToSaucedemo(page);

    const firstItem = page.locator('.inventory_item').first();
    await expect(firstItem.locator('.inventory_item_name')).toBeVisible();
    await expect(firstItem.locator('.inventory_item_desc')).toBeVisible();
    await expect(firstItem.locator('.inventory_item_price')).toBeVisible();
  });

  test('produk dapat ditambahkan ke cart dari halaman inventory', async ({ page }) => {
    await loginToSaucedemo(page);

    await page.locator('.inventory_item').first()
      .getByRole('button', { name: /add to cart/i }).click();

    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
  });

  test('sorting produk A-Z berfungsi', async ({ page }) => {
    await loginToSaucedemo(page);

    await page.locator('.product_sort_container').selectOption('az');

    const firstItemName = await page.locator('.inventory_item_name').first().textContent();
    expect(firstItemName).toBe('Sauce Labs Backpack');
  });

  test('sorting produk Z-A berfungsi', async ({ page }) => {
    await loginToSaucedemo(page);

    await page.locator('.product_sort_container').selectOption('za');

    const firstItemName = await page.locator('.inventory_item_name').first().textContent();
    expect(firstItemName).toBe('Test.allTheThings() T-Shirt (Red)');
  });

});
