import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getAirQuality } from './air-quality/route';
import { POST as postAssistant } from './assistant/route';
import { GET as getCommunity, POST as postCommunity } from './community/route';
import { GET as getHealth } from './health/route';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { HOUSEHOLD_PRESETS, generateWhatIfComparisons } from '@/lib/engine/recommendations';
import { convertWaqiPm25IaqiToUgM3, getAirQualityReport } from '@/lib/aqi/provider';

describe('API Route Handlers, Rate Limiter, WAQI Converter & What-If Simulator Integration Suite', () => {
  it('GET /api/health returns service status and capability flags without exposing secrets', async () => {
    const res = await getHealth(new NextRequest('http://localhost:3000/api/health'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.service).toBe('smogshield-ai');
    expect(json.capabilities.deterministicSafetyGuardrailsActive).toBe(true);
    expect(JSON.stringify(json)).not.toContain('AIzaSy');
  });

  it('GET /api/air-quality validates query parameters and returns offline reference baseline when simulated', async () => {
    const validReq = new NextRequest(
      'http://localhost:3000/api/air-quality?city=delhi-anand-vihar&simulate=offline'
    );
    const validRes = await getAirQuality(validReq);
    expect(validRes.status).toBe(200);
    const validJson = await validRes.json();
    expect(validJson.report.freshness).toBe('unavailable');
    expect(validJson.report.naqi).toBeGreaterThan(300);

    const invalidReq = new NextRequest(
      'http://localhost:3000/api/air-quality?city=delhi;DROP%20TABLE'
    );
    const invalidRes = await getAirQuality(invalidReq);
    expect(invalidRes.status).toBe(400);
  });

  it('POST /api/assistant validates payload, enforces 16KB body size limit, and returns grounded safety guidance', async () => {
    const oversizedReq = new NextRequest('http://localhost:3000/api/assistant', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '25000',
      },
      body: JSON.stringify({ question: 'test' }),
    });
    const oversizedRes = await postAssistant(oversizedReq);
    expect(oversizedRes.status).toBe(413);

    const validReq = new NextRequest('http://localhost:3000/api/assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question: 'Is it sensible to exercise outdoors today?',
        language: 'en',
        profile: HOUSEHOLD_PRESETS[0],
        airQualityContext: {
          city: 'New Delhi',
          stationName: 'Anand Vihar',
          naqi: 425,
          category: 'Severe',
          dominantPollutant: 'PM2.5',
          pm25: 298,
          pm10: 465,
          freshness: 'unavailable',
          sourceName: 'CPCB Baseline',
          saferWindowLabel: '13:30 - 15:30',
          inversionRisk: 'high',
        },
      }),
    });
    const validRes = await postAssistant(validReq);
    expect(validRes.status).toBe(200);
    const validJson = await validRes.json();
    expect(validJson.answer).toContain('indoors');
  });

  it('GET and POST /api/community list initiatives and record validated pledges', async () => {
    const getRes = await getCommunity(new NextRequest('http://localhost:3000/api/community'));
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(Array.isArray(getJson.initiatives)).toBe(true);

    const postReq = new NextRequest('http://localhost:3000/api/community', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ initiativeId: 'school-gate-no-idling' }),
    });
    const postRes = await postCommunity(postReq);
    expect(postRes.status).toBe(200);
    const postJson = await postRes.json();
    expect(postJson.status).toBe('PLEDGED');

    const notFoundReq = new NextRequest('http://localhost:3000/api/community', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ initiativeId: 'non-existent-initiative' }),
    });
    const notFoundRes = await postCommunity(notFoundReq);
    expect(notFoundRes.status).toBe(404);
  });

  it('enforces sliding-window rate limits and returns retryAfterSeconds when exceeded', () => {
    const bucketKey = `test-rate-limit-${Date.now()}`;
    const first = checkRateLimit(bucketKey, 2, 60_000);
    const second = checkRateLimit(bucketKey, 2, 60_000);
    const third = checkRateLimit(bucketKey, 2, 60_000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('converts WAQI US-EPA PM2.5 sub-indices accurately to raw ug/m3 and computes What-If dosimetry scenarios', async () => {
    // US-EPA AQI 50 corresponds to 12.0 ug/m3; US-EPA AQI 200 corresponds to 150.4 ug/m3
    expect(convertWaqiPm25IaqiToUgM3(50)).toBeCloseTo(12.0, 1);
    expect(convertWaqiPm25IaqiToUgM3(200)).toBeCloseTo(150.4, 1);

    const report = await getAirQualityReport('delhi-anand-vihar', 'offline');
    const scenarios = generateWhatIfComparisons(report, HOUSEHOLD_PRESETS[0]);
    expect(scenarios).toHaveLength(4);
    for (const sc of scenarios) {
      expect(sc.baselineDoseUg).toBeGreaterThan(sc.saferDoseUg);
      expect(sc.avoidedDoseUg).toBe(sc.baselineDoseUg - sc.saferDoseUg);
      expect(sc.reductionRangeLabel).toContain('%');
    }
  });
});
