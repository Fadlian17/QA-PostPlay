import { test, expect } from '../../fixtures/base';

async function loginToSaucedemo(page: any) {
  await page.goto('/');
  await page.locator('#user-name').fill('standard_user');
  await page.locator('#password').fill('secret_sauce');
  await page.locator('[data-test="login-button"]').click();
  await expect(page).toHaveURL(/.*inventory/);
}

test.describe('Checkout Flow', () => {

  test.beforeEach(async ({ page }) => {
    await loginToSaucedemo(page);
  });

  test('user dapat menyelesaikan checkout dari awal sampai selesai', async ({ page }) => {
    // Step 1: Tambah produk ke cart
    await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();
    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');

    // Step 2: Buka cart
    await page.locator('.shopping_cart_link').click();
    await expect(page).toHaveURL(/.*cart/);
    await expect(page.locator('.cart_item')).toHaveCount(1);

    // Step 3: Mulai checkout
    await page.locator('[data-test="checkout"]').click();
    await expect(page).toHaveURL(/.*checkout-step-one/);

    // Step 4: Isi data pengiriman
    await page.locator('[data-test="firstName"]').fill('Budi');
    await page.locator('[data-test="lastName"]').fill('Santoso');
    await page.locator('[data-test="postalCode"]').fill('10110');
    await page.locator('[data-test="continue"]').click();

    // Step 5: Review order
    await expect(page).toHaveURL(/.*checkout-step-two/);
    await expect(page.locator('.cart_item')).toHaveCount(1);
    await expect(page.locator('.summary_total_label')).toBeVisible();

    // Step 6: Finish
    await page.locator('[data-test="finish"]').click();
    await expect(page).toHaveURL(/.*checkout-complete/);
    await expect(page.locator('[data-test="complete-header"]')).toHaveText('Thank you for your order!');
  });

  test('checkout gagal jika form pengiriman kosong', async ({ page }) => {
    await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();
    await page.locator('.shopping_cart_link').click();
    await page.locator('[data-test="checkout"]').click();

    // Langsung klik continue tanpa isi form
    await page.locator('[data-test="continue"]').click();

    await expect(page.locator('[data-test="error"]')).toBeVisible();
    await expect(page.locator('[data-test="error"]')).toContainText('First Name is required');
  });

  test('user dapat menghapus item dari cart', async ({ page }) => {
    await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();
    await page.locator('[data-test="add-to-cart-sauce-labs-bike-light"]').click();
    await expect(page.locator('.shopping_cart_badge')).toHaveText('2');

    await page.locator('.shopping_cart_link').click();
    await expect(page.locator('.cart_item')).toHaveCount(2);

    // Hapus item pertama
    await page.locator('[data-test="remove-sauce-labs-backpack"]').click();
    await expect(page.locator('.cart_item')).toHaveCount(1);
    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
  });

  test('problem_user mengalami bug pada checkout (known issue)', async ({ page }) => {
    // Logout dulu
    await page.locator('#react-burger-menu-btn').click();
    await page.locator('#logout_sidebar_link').click();

    // Login sebagai problem_user
    await page.locator('#user-name').fill('problem_user');
    await page.locator('#password').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();

    await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();
    await page.locator('.shopping_cart_link').click();
    await page.locator('[data-test="checkout"]').click();

    await page.locator('[data-test="firstName"]').fill('Budi');
    await page.locator('[data-test="lastName"]').fill('Santoso');
    await page.locator('[data-test="postalCode"]').fill('10110');
    await page.locator('[data-test="continue"]').click();

    // problem_user diketahui tidak bisa menyelesaikan checkout
    // test ini mendokumentasikan bug yang ada
    await expect(page.locator('[data-test="error"]')).toBeVisible();
  });

});