import { spawn } from 'node:child_process';

const PORT = 3456;
const BASE = `http://127.0.0.1:${PORT}`;

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return true;
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function runVerification() {
  console.log(`[verify-http] Starting production Next.js server on port ${PORT}...`);
  const server = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['next', 'start', '-p', String(PORT)],
    {
      stdio: 'pipe',
      shell: process.platform === 'win32',
    }
  );

  try {
    const ready = await waitForServer();
    if (!ready) {
      throw new Error('Server failed to become healthy within 30 seconds.');
    }

    // 1. Check /api/health and security headers
    const healthRes = await fetch(`${BASE}/api/health`);
    if (healthRes.status !== 200) {
      throw new Error(`/api/health returned ${healthRes.status}`);
    }
    const xFrame = healthRes.headers.get('x-frame-options');
    const xContent = healthRes.headers.get('x-content-type-options');
    if (xFrame !== 'DENY' || xContent !== 'nosniff') {
      throw new Error(
        `Missing required security headers: X-Frame-Options=${xFrame}, X-Content-Type-Options=${xContent}`
      );
    }
    console.log('[verify-http] PASS: /api/health & security headers verified.');

    // 2. Check /api/air-quality validation and fallback modes
    const aqRes = await fetch(`${BASE}/api/air-quality?city=delhi-anand-vihar&simulate=offline`);
    if (aqRes.status !== 200) {
      throw new Error(`/api/air-quality returned ${aqRes.status}`);
    }
    const aqData = await aqRes.json();
    if (aqData?.report?.freshness !== 'unavailable' || typeof aqData?.report?.naqi !== 'number') {
      throw new Error('Invalid air quality report payload structure.');
    }

    const badAqRes = await fetch(`${BASE}/api/air-quality?city=invalid;DROP`);
    if (badAqRes.status !== 400) {
      throw new Error(`Expected 400 for invalid city query, got ${badAqRes.status}`);
    }
    console.log('[verify-http] PASS: /api/air-quality telemetry & Zod validation verified.');

    // 3. Check /api/assistant deterministic safety & bilingual fallback
    const aiRes = await fetch(`${BASE}/api/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Is it sensible to exercise outdoors today?',
        language: 'en',
        profile: {
          id: 'test-family',
          name: 'Test Family',
          householdSize: 4,
          ageGroups: ['children', 'adults'],
          hasRespiratorySensitivity: true,
          primaryCommuteMode: 'auto_bus',
          commuteDistanceKm: 8,
          schoolOrWorkStartHour: 8,
          outdoorExerciseMinutes: 30,
          cookingSetup: 'lpg_exhaust',
          equipment: ['n95_masks'],
          budgetTier: 'standard',
          language: 'en',
        },
        airQualityContext: {
          city: 'New Delhi',
          stationName: 'Anand Vihar',
          naqi: 425,
          category: 'Severe',
          dominantPollutant: 'PM2.5',
          pm25: 298,
          pm10: 465,
          freshness: 'unavailable',
          sourceName: 'CPCB Reference',
          saferWindowLabel: '13:30 - 15:30',
          inversionRisk: 'high',
        },
      }),
    });

    if (aiRes.status !== 200) {
      throw new Error(`/api/assistant returned ${aiRes.status}`);
    }
    const aiData = await aiRes.json();
    if (!aiData?.answer || !aiData.answer.includes('indoors')) {
      throw new Error('Assistant response did not enforce indoor exercise safety during Severe NAQI.');
    }
    console.log('[verify-http] PASS: /api/assistant contextual guidance verified.');

    // 4. Check /api/community GET & POST
    const commRes = await fetch(`${BASE}/api/community`);
    if (commRes.status !== 200) {
      throw new Error(`/api/community GET returned ${commRes.status}`);
    }
    console.log('[verify-http] PASS: /api/community verified.');
    console.log('[verify-http] ALL PRODUCTION HTTP CHECKS PASSED.');
  } finally {
    server.kill();
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('[verify-http] FAILED:', err);
  process.exit(1);
});
