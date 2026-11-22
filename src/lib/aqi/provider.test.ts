import { describe, expect, it } from 'vitest';
import {
  convertWaqiPm10IaqiToUgM3,
  convertWaqiPm25IaqiToUgM3,
  getAirQualityReport,
  INDIAN_MONITORING_LOCATIONS,
  resolveLocationConfig,
} from './provider';

describe('Multi-Tier Air Quality Provider & WAQI Inverse Normalization', () => {
  it('resolves known Indian monitoring stations and falls back safely for unknown IDs', () => {
    const delhi = resolveLocationConfig('delhi-anand-vihar');
    expect(delhi.id).toBe('delhi-anand-vihar');
    expect(delhi.hasLocalOfficialStation).toBe(true);

    const fallback = resolveLocationConfig('non-existent-city');
    expect(fallback.id).toBe(INDIAN_MONITORING_LOCATIONS[0]!.id);
  });

  it('converts WAQI US-EPA PM2.5 and PM10 sub-indices into raw ug/m3 concentrations accurately', () => {
    expect(convertWaqiPm25IaqiToUgM3(0)).toBe(0);
    expect(convertWaqiPm25IaqiToUgM3(50)).toBeCloseTo(12.0, 1);
    expect(convertWaqiPm25IaqiToUgM3(150)).toBeCloseTo(55.4, 1);
    expect(convertWaqiPm25IaqiToUgM3(300)).toBeCloseTo(250.4, 1);
    expect(convertWaqiPm10IaqiToUgM3(100)).toBeCloseTo(154, 0);
  });

  it('returns honest unavailable offline reference report when simulate=offline', async () => {
    const report = await getAirQualityReport('delhi-anand-vihar', 'offline');
    expect(report.freshness).toBe('unavailable');
    expect(report.sourceTier).toBe('tier3_offline_reference');
    expect(report.degradedReason).toContain('offline');
    expect(report.naqi).toBeGreaterThanOrEqual(300);
    expect(report.hourlyForecast.length).toBeGreaterThanOrEqual(12);
  });

  it('flags stale telemetry transparently when simulate=stale', async () => {
    const report = await getAirQualityReport('delhi-anand-vihar', 'stale');
    expect(report.freshness).toBe('stale');
    expect(report.degradedReason).toBeTruthy();
  });

  it('marks peri-urban regions without ground stations as non-station estimates', async () => {
    const report = await getAirQualityReport('tehri-rural-corridor', 'no_station');
    expect(report.isOfficialStation).toBe(false);
    expect(['estimated', 'unavailable']).toContain(report.freshness);
    expect(report.degradedReason).toBeTruthy();
  });
});
