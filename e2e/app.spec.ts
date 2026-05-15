import { expect, test } from '@playwright/test'

const csv = `Date Purchased,Quantity,Card,Subject,Year,Set,Variation,Number,Category,Condition,Investment,Current Value,Potential Profit,Graded Cert #,Population,Notes
2026-05-01,1,E2E Dragon Alt Art,Dragon,2025,One Piece E2E Set,Alt Art,OP01-001,One Piece,PSA 10,500,650,150,E2ECERT001,12,Imported in E2E
2026-05-02,1,E2E Mouse Promo,Mouse,2024,Pokemon E2E Set,Promo,025,Pokemon,Near Mint,40,90,50,,200,Imported in E2E`

test('demo workspace supports CSV import and dashboard refresh', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await page.getByRole('button', { name: 'CSV Import' }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'e2e-card-ladder.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  })

  await expect(page.getByText('E2E Dragon Alt Art')).toBeVisible()
  await expect(page.getByText('$740.00')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm Import' }).click()
  await expect(page.getByText('Import completed.')).toBeVisible()

  await page.getByRole('button', { name: 'Dashboard' }).click()
  await expect(page.getByText('Market Value', { exact: true })).toBeVisible()
  await expect(page.getByText('$1,747.00').first()).toBeVisible()
})

test('quick add drawers capture purchase and sale rows', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Purchases' }).click()
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByLabel('Lot ID').fill('E2E-LOT-001')
  await page.getByLabel('Seller').fill('E2E Seller')
  await page.getByLabel('Source').fill('Card show')
  await page.getByLabel('Total Paid').fill('100')
  await page.getByLabel('Allocated Cost').fill('100')
  await page.getByLabel('Payment Method').fill('Cash')
  await page.getByRole('button', { name: 'Save Purchase' }).click()
  await expect(page.getByText('E2E Seller')).toBeVisible()

  await page.getByRole('button', { name: 'Sales' }).click()
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByLabel('Gross Sale').fill('125')
  await page.getByRole('button', { name: 'Save Sale' }).click()
  await expect(page.getByText('$125.00')).toBeVisible()
})
