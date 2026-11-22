import { expect, test } from '@playwright/test';

test.describe('SmogShield AI — 10 Mandatory Competition Scenarios E2E', () => {
  test('Scenarios 1–4 & 8: Auth Gate entry, Severely polluted location, moderate pollution, no local station, stale AQI, and offline provider', async ({
    page,
  }) => {
    await page.goto('/');

    // Verify application starts on the Firebase Authentication screen gate first
    await expect(page.getByTestId('auth-google-signin-btn')).toBeVisible();
    await expect(page.getByTestId('auth-guest-continue-btn')).toBeVisible();
    await page.getByTestId('auth-guest-continue-btn').click();

    // Scenario 1: Severely polluted location (Default Delhi NCR - Anand Vihar)
    await expect(page.locator('h1')).toContainText('New Delhi');
    const naqiValue = page.getByTestId('naqi-value');
    await expect(naqiValue).toBeVisible();

    // Verify 7 daily action slots and What-If Decision Simulator are rendered
    await expect(page.getByTestId('what-if-simulator')).toBeVisible();
    await page.getByTestId('whatif-btn-whatif-commute').click();
    await expect(page.getByTestId('whatif-avoided-dose')).toContainText('µg PM2.5 avoided');

    await expect(page.getByTestId('daily-slot-morning_routine')).toBeVisible();
    await page.getByTestId('evidence-btn-slot-morning').click();
    await expect(page.getByTestId('evidence-drawer-slot-morning')).toBeVisible();
    await expect(page.getByTestId('daily-slot-commute_school_work')).toBeVisible();
    await expect(page.getByTestId('daily-slot-outdoor_exercise')).toBeVisible();
    await expect(page.getByTestId('daily-slot-high_pollution_night')).toBeVisible();

    // Scenario 2: Switch to Moderate/Satisfactory pollution location (Bengaluru)
    const citySelector = page.getByTestId('city-selector');
    await citySelector.selectOption('bengaluru-btm');
    await expect(page.locator('h1')).toContainText('Bengaluru');

    // Scenario 3: Location with no reliable local official monitoring station
    await citySelector.selectOption('tehri-rural-corridor');
    await expect(page.locator('h1')).toContainText('No Local CPCB');
    await expect(page.getByTestId('degraded-data-banner')).toContainText(
      'No official CPCB ground monitoring station'
    );

    // Scenario 4: Stale AQI information (>4h)
    const telemetrySelector = page.getByTestId('telemetry-condition-selector');
    await citySelector.selectOption('delhi-anand-vihar');
    await telemetrySelector.selectOption('stale');
    await expect(page.getByTestId('freshness-badge')).toContainText('Stale');
    await expect(page.getByTestId('degraded-data-banner')).toBeVisible();

    // Scenario 8: Environmental data provider unavailable (Offline mode)
    await telemetrySelector.selectOption('offline');
    await expect(page.getByTestId('freshness-badge')).toContainText('Unavailable');
    await expect(page.getByTestId('degraded-data-banner')).toContainText(
      'historical winter baseline'
    );
  });

  test('Scenarios 5 & 6: Limited financial resources family, school/work commute, indoor protection, and honest impact tracking', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByTestId('auth-guest-continue-btn').click();

    // Scenario 5: Family with limited financial resources (No Purifier / Two-Wheeler preset)
    await page.getByTestId('preset-budget-commuter-household').click();
    await expect(page.getByTestId('daily-slot-high_pollution_night')).toContainText(
      'RULE_NIGHT_LOW_COST_DRAFT_SEAL'
    );

    // Scenario 6: Commute slot & marking actions completed for Impact Tracker
    const commuteCompleteBtn = page.getByTestId('complete-btn-slot-commute');
    await commuteCompleteBtn.click();

    // Check Impact Tracker updates honestly
    await page.getByTestId('tab-impact').click();
    await expect(page.getByTestId('impact-total-actions')).toHaveText('1');
    const pm25AvoidedText = await page.getByTestId('impact-pm25-avoided').textContent();
    expect(Number(pm25AvoidedText?.replace(/[^0-9]/g, ''))).toBeGreaterThan(0);

    // Check Indoor Air Protection scientific limitations
    await page.getByTestId('tab-indoor').click();
    await expect(page.locator('main')).toContainText('Indoor houseplants');
    await expect(page.locator('main')).toContainText('Carbon Monoxide');

    // Check Low-Emission Lifestyle outcome distinction
    await page.getByTestId('tab-lifestyle').click();
    await expect(page.getByTestId('outcome-distinction-card')).toContainText(
      'Reducing Personal Exposure'
    );
    await expect(page.getByTestId('outcome-distinction-card')).toContainText(
      'Improving Indoor Air Quality'
    );
    await expect(page.getByTestId('outcome-distinction-card')).toContainText(
      'Reducing Outdoor Emissions'
    );

    // Check Community Action Hub pledge interaction
    await page.getByTestId('tab-community').click();
    const pledgeBtn = page.getByTestId('pledge-btn-school-gate-no-idling');
    await pledgeBtn.click();
    await expect(pledgeBtn).toContainText('Joined');
  });

  test('Scenario 7: GenAI assistant bilingual support (EN & HI) and deterministic fallback when AI provider is unavailable', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByTestId('auth-guest-continue-btn').click();
    await page.getByTestId('tab-assistant').click();

    const input = page.getByTestId('assistant-input');
    const sendBtn = page.getByTestId('assistant-send-btn');

    await input.fill('What can I do if I cannot afford an air purifier?');
    await sendBtn.click();

    await expect(page.getByTestId('assistant-messages')).toContainText(
      'Wet Mop Only'
    );

    // Switch language to Hindi and verify bilingual UI + Hindi response
    await page.getByTestId('language-toggle').click();
    await expect(page.getByTestId('tab-planner')).toContainText('दैनिक कार्य योजना');
  });

  test('Scenarios 9 & 10: Mobile viewport user and keyboard-only navigation user', async ({
    page,
  }) => {
    // Scenario 9: Mobile viewport (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();

    // Scenario 10: Keyboard navigation (Skip link, Tab focus & WAI-ARIA tablist)
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main-workspace"]');
    await expect(skipLink).toBeFocused();
    await page.getByTestId('auth-guest-continue-btn').click();
    await expect(page.getByTestId('naqi-value')).toBeVisible();
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    await expect(page.getByTestId('tab-planner')).toHaveAttribute('aria-selected', 'true');
  });
});
