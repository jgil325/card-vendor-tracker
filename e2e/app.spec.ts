import { expect, test, type Page } from '@playwright/test'

const csv = `Date Purchased,Quantity,Card,Subject,Year,Set,Variation,Number,Category,Condition,Investment,Current Value,Potential Profit,Graded Cert #,Population,Notes
2026-05-01,1,E2E Dragon Alt Art,Dragon,2025,One Piece E2E Set,Alt Art,OP01-001,One Piece,PSA 10,500,650,150,E2ECERT001,12,Imported in E2E
2026-05-02,1,E2E Mouse Promo,Mouse,2024,Pokemon E2E Set,Promo,025,Pokemon,Near Mint,40,90,50,,200,Imported in E2E`

async function navigate(page: Page, label: string) {
  const menu = page.getByRole('button', {
    name: 'Open navigation',
    exact: true,
  })
  if (await menu.isVisible()) await menu.click()
  await page
    .locator('.sidebar')
    .getByRole('button', { name: new RegExp(`^${label}(?:\\s|$)`) })
    .click()
}

async function uploadCsv(page: Page) {
  await page.getByLabel('Card Ladder CSV file').setInputFiles({
    name: 'e2e-card-ladder.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  })
}

test('overview is immediately usable and all sections fit the viewport', async ({
  page,
}) => {
  const failures: string[] = []
  page.on('pageerror', (error) => failures.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Overview.' })).toBeVisible()
  await expect(page.locator('.big-number')).toHaveText('$9,550.00')
  await expect(
    page.getByRole('img', { name: /Cumulative gross sales/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: '1M', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '1M', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('9 sales in this period')).toBeVisible()
  for (const label of [
    'Inventory',
    'Sales',
    'Purchases',
    'Grading',
    'Expenses',
    'Import data',
    'Settings',
  ]) {
    await navigate(page, label)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      `${label}.`,
    )
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  }
  expect(failures).toEqual([])
})

test('inventory filters, view switch, details, and persistence work together', async ({
  page,
}) => {
  await page.goto('/#inventory')
  await page.getByRole('button', { name: /^One Piece 2$/ }).click()
  await expect(page.locator('.inventory-card')).toHaveCount(2)
  await page.getByRole('button', { name: /^All cards 8$/ }).click()
  await page.getByLabel('Search inventory').fill('Umbreon')
  await expect(page.locator('.inventory-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'List view', exact: true }).click()
  await expect(page.locator('.inventory-table tbody tr')).toHaveCount(1)
  await page
    .getByRole('button', { name: 'View Umbreon VMAX', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Umbreon VMAX',
    exact: true,
  })
  await dialog.getByLabel('Market value', { exact: true }).fill('1800')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('status')).toContainText('Card details updated.')
  await page.reload()
  await page.getByLabel('Search inventory').fill('Umbreon')
  await expect(page.locator('.inventory-card')).toHaveCount(1)
  await expect(page.locator('.inventory-card')).toContainText('$1,800.00')
})

test('inventory search has a recoverable empty state and exports a real CSV', async ({
  page,
}) => {
  await page.goto('/#inventory')
  await page.getByLabel('Search inventory').fill('no-such-card')
  await expect(
    page.getByRole('heading', { name: 'No cards match your filters' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page.locator('.inventory-card')).toHaveCount(8)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^stack-inventory-.*\.csv$/)
  expect(await file.failure()).toBeNull()
})

test('new inventory, purchase, and expense forms save records', async ({
  page,
}) => {
  await page.goto('/#inventory')
  await page.getByRole('button', { name: 'Add inventory', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Item ID', { exact: true }).fill('E2E-CARD-001')
  await dialog.getByLabel('Name', { exact: true }).fill('E2E collector card')
  await dialog.getByLabel('Unit Cost', { exact: true }).fill('50')
  await dialog.getByLabel('Market Value', { exact: true }).fill('75')
  await dialog
    .getByRole('button', { name: 'Save Inventory', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'E2E collector card' }),
  ).toBeVisible()
  await navigate(page, 'Purchases')
  await page.getByRole('button', { name: 'Add purchase', exact: true }).click()
  await dialog.getByLabel('Lot ID').fill('E2E-LOT-001')
  await dialog.getByLabel('Seller', { exact: true }).fill('E2E Seller')
  await dialog.getByLabel('Source', { exact: true }).fill('Card show')
  await dialog.getByLabel('Total Paid').fill('100')
  await dialog.getByLabel('Allocated Cost').fill('100')
  await dialog
    .getByRole('button', { name: 'Save Purchase', exact: true })
    .click()
  await expect(page.getByText('E2E Seller', { exact: true })).toBeVisible()
  await navigate(page, 'Expenses')
  await page.getByRole('button', { name: 'Add expense', exact: true }).click()
  await dialog.getByLabel('Vendor', { exact: true }).fill('E2E Supplies')
  await dialog.getByLabel('Amount', { exact: true }).fill('42.75')
  await dialog
    .getByRole('button', { name: 'Save Expense', exact: true })
    .click()
  await expect(page.getByText('E2E Supplies', { exact: true })).toBeVisible()
})

test('channel presets fill the sale form and cancellation restores inventory', async ({
  page,
}) => {
  await page.goto('/#sales')
  await page.getByRole('button', { name: 'Record sale', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Channel', { exact: true }).selectOption('Card Show')
  await expect(dialog.getByLabel('Fee rate (%)', { exact: true })).toHaveValue(
    '0',
  )
  await expect(dialog.getByLabel('Flat fee', { exact: true })).toHaveValue('0')
  await dialog.getByLabel('Gross Sale', { exact: true }).fill('411')
  await dialog.getByRole('button', { name: 'Save sale', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  const row = page
    .locator('tr')
    .filter({ has: page.getByRole('cell', { name: '$411.00', exact: true }) })
    .first()
  await expect(row).toBeVisible()
  await row.getByRole('combobox').selectOption('Cancelled')
  await expect(row.getByRole('combobox')).toHaveValue('Cancelled')
  await navigate(page, 'Overview')
  await expect(page.locator('.big-number')).toHaveText('$9,550.00')
})

test('grading submissions can be added and completed', async ({ page }) => {
  await page.goto('/#grading')
  await page
    .getByRole('button', { name: 'New submission', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Submission ID', { exact: true }).fill('E2E-PSA-001')
  await dialog.getByLabel('Grading fee', { exact: true }).fill('25')
  await dialog.getByLabel('Status', { exact: true }).selectOption('Submitted')
  await dialog
    .getByRole('button', { name: 'Save submission', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  const card = page.locator('article').filter({ hasText: 'E2E-PSA-001' })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Update submission' }).click()
  await dialog.getByLabel('Status', { exact: true }).selectOption('Complete')
  await dialog.getByLabel('Final grade', { exact: true }).fill('10')
  await dialog
    .getByRole('button', { name: 'Save submission', exact: true })
    .click()
  await expect(card.locator('.grading-status')).toHaveText('Complete')
  await expect(card).toContainText('PSA 10')
})

test('CSV import previews values and prevents repeated imports', async ({
  page,
}) => {
  await page.goto('/#import')
  await uploadCsv(page)
  await expect(page.getByText('E2E Dragon Alt Art')).toBeVisible()
  await expect(page.getByText('$740.00')).toBeVisible()
  await page
    .getByRole('button', { name: 'Confirm import', exact: true })
    .click()
  await expect(page.getByText('Import completed.')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Imported', exact: true }),
  ).toBeDisabled()
  await navigate(page, 'Overview')
  await expect(page.locator('.big-number')).toHaveText('$10,290.00')
  await navigate(page, 'Import data')
  await uploadCsv(page)
  await expect(
    page.getByText('Already in inventory by cert: E2ECERT001'),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Confirm import', exact: true }),
  ).toBeDisabled()
})

test('search and keyboard dismissal return focus to the workspace', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Search anything/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Search workspace' }).fill('Lugia')
  await dialog.getByRole('button', { name: /Lugia V Silver Tempest/ }).click()
  await expect(
    page.getByRole('dialog', { name: 'Lugia V', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
})

test('settings saves usable channel fees', async ({ page }) => {
  await page.goto('/#settings')
  await page.getByLabel('Channel', { exact: true }).fill('Card Show')
  await page.getByLabel('Fee rate (%)', { exact: true }).fill('5')
  await page.getByLabel('Flat fee ($)', { exact: true }).fill('1')
  await page.getByRole('button', { name: 'Save preset', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Fee preset saved.')
  await navigate(page, 'Sales')
  await page.getByRole('button', { name: 'Record sale', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Channel', { exact: true }).selectOption('Card Show')
  await expect(dialog.getByLabel('Fee rate (%)', { exact: true })).toHaveValue(
    '5',
  )
  await expect(dialog.getByLabel('Flat fee', { exact: true })).toHaveValue('1')
})
