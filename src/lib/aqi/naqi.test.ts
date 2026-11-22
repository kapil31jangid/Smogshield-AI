import { describe, expect, it } from 'vitest';
import {
  calculatePollutantSubIndex,
  classifyNaqiScore,
  computeOverallNaqi,
  evaluateFreshness,
} from './naqi';
import {
  buildWeatherContext,
  getAirQualityReport,
  identifySaferOutdoorWindow,
} from './provider';

describe('Indian CPCB NAQI Normalization & Sub-Index Engine', () => {
  it('accurately classifies CPCB NAQI score boundaries', () => {
    expect(classifyNaqiScore(0)).toBe('Good');
    expect(classifyNaqiScore(50)).toBe('Good');
    expect(classifyNaqiScore(51)).toBe('Satisfactory');
    expect(classifyNaqiScore(100)).toBe('Satisfactory');
    expect(classifyNaqiScore(150)).toBe('Moderate');
    expect(classifyNaqiScore(250)).toBe('Poor');
    expect(classifyNaqiScore(350)).toBe('Very Poor');
    expect(classifyNaqiScore(450)).toBe('Severe');
  });

  it('computes official CPCB PM2.5 sub-indices across Good, Poor, Very Poor, and Severe bands', () => {
    expect(calculatePollutantSubIndex('pm25', 15)).toEqual({
      subIndex: 25,
      category: 'Good',
    });
    expect(calculatePollutantSubIndex('pm25', 60)).toEqual({
      subIndex: 100,
      category: 'Satisfactory',
    });
    const poor = calculatePollutantSubIndex('pm25', 105);
    expect(poor.category).toBe('Poor');
    expect(poor.subIndex).toBeGreaterThanOrEqual(201);
    expect(poor.subIndex).toBeLessThanOrEqual(300);

    const severe = calculatePollutantSubIndex('pm25', 300);
    expect(severe.category).toBe('Severe');
    expect(severe.subIndex).toBeGreaterThanOrEqual(401);
  });

  it('handles missing or negative pollutant measurements safely without throwing', () => {
    expect(calculatePollutantSubIndex('pm25', null)).toEqual({
      subIndex: null,
      category: null,
    });
    expect(calculatePollutantSubIndex('pm10', -12)).toEqual({
      subIndex: null,
      category: null,
    });
  });

  it('identifies dominant pollutant and computes WHO 2021 daily multiple', () => {
    const res = computeOverallNaqi({
      pm25: 150, // WHO multiple = 150 / 15 = 10x
      pm10: 200,
      no2: 40,
      so2: 15,
      co: 1.0,
      o3: 30,
    });
    expect(res.category).toBe('Very Poor');
    expect(res.dominantPollutant).toBe('PM2.5');
    expect(res.whoPm25Multiple).toBe(10);
  });

  it('evaluates data freshness accurately for live, delayed, stale, estimated, and offline modes', () => {
    const now = Date.parse('2026-11-22T12:00:00Z');
    const liveIso = '2026-11-22T11:30:00Z';
    const delayedIso = '2026-11-22T09:30:00Z';
    const staleIso = '2026-11-22T05:00:00Z';

    expect(
      evaluateFreshness(liveIso, now, 'tier1_official_station').freshness
    ).toBe('live');
    expect(
      evaluateFreshness(delayedIso, now, 'tier1_official_station').freshness
    ).toBe('delayed');
    expect(
      evaluateFreshness(staleIso, now, 'tier1_official_station').freshness
    ).toBe('stale');
    expect(
      evaluateFreshness(liveIso, now, 'tier2_secondary_model').freshness
    ).toBe('estimated');
    expect(
      evaluateFreshness(liveIso, now, 'tier3_offline_reference').freshness
    ).toBe('unavailable');
  });

  it('detects winter thermal inversion risk when temperature and wind speed are low', () => {
    const highRisk = buildWeatherContext(13.5, 78, 4.2);
    expect(highRisk.inversionRisk).toBe('high');

    const lowRisk = buildWeatherContext(26.0, 50, 15.0);
    expect(lowRisk.inversionRisk).toBe('low');
  });

  it('returns an explicitly badged offline reference baseline when provider is offline', async () => {
    const offlineReport = await getAirQualityReport('delhi-anand-vihar', 'offline');
    expect(offlineReport.freshness).toBe('unavailable');
    expect(offlineReport.isOfficialStation).toBe(false);
    expect(offlineReport.degradedReason).toContain('offline');
    expect(offlineReport.naqi).toBeGreaterThan(300);
  });

  it('identifies afternoon solar dispersion window from diurnal curve', async () => {
    const report = await getAirQualityReport('mumbai-bandra', 'offline');
    const win = identifySaferOutdoorWindow(report.hourlyForecast, report.naqi);
    expect(win.expectedNaqi).toBeLessThanOrEqual(report.naqi);
    expect(win.label).toContain('13:');
  });
});
