import { describe, expect, it } from 'vitest';
import {
  generateIndoorAirGuidance,
  generateLowEmissionAlternatives,
  generatePersonalizedDailyPlan,
  getEffectiveSafetyNaqi,
  HOUSEHOLD_PRESETS,
} from './recommendations';
import { getAirQualityReport } from '@/lib/aqi/provider';

describe('Smart Exposure Reduction & Personalized Daily Action Engine', () => {
  it('applies conservative safety buffer for stale data and vulnerable family members', async () => {
    const staleReport = await getAirQualityReport('lucknow-lalbagh', 'stale');
    const vulnerableFamily = HOUSEHOLD_PRESETS[0]; // has children + elderly + sensitivity
    const { effectiveNaqi, basis, conservatismNote } = getEffectiveSafetyNaqi(
      staleReport,
      vulnerableFamily
    );

    expect(effectiveNaqi).toBeGreaterThan(staleReport.naqi);
    expect(basis).toBe('safety_rule');
    expect(conservatismNote).toContain('buffer');
  });

  it('generates 7 complete daily slots with mandatory outdoor exercise lockdown during severe smog', async () => {
    const severeReport = await getAirQualityReport('delhi-anand-vihar', 'offline');
    const family = HOUSEHOLD_PRESETS[0];
    const plan = generatePersonalizedDailyPlan(severeReport, family);

    expect(plan).toHaveLength(7);
    const exerciseSlot = plan.find((s) => s.slotKey === 'outdoor_exercise');
    expect(exerciseSlot).toBeDefined();
    expect(exerciseSlot?.ruleId).toBe('RULE_EXERCISE_INDOOR_MANDATORY');
    expect(exerciseSlot?.whatToDo).toContain('indoors');
  });

  it('adapts recommendations for limited-budget households without an air purifier', async () => {
    const severeReport = await getAirQualityReport('delhi-anand-vihar', 'offline');
    const budgetFamily = HOUSEHOLD_PRESETS[1]; // limited_budget, no hepa_purifier
    const plan = generatePersonalizedDailyPlan(severeReport, budgetFamily);

    const nightSlot = plan.find((s) => s.slotKey === 'high_pollution_night');
    expect(nightSlot?.ruleId).toBe('RULE_NIGHT_LOW_COST_DRAFT_SEAL');
    expect(nightSlot?.whatToDo).toMatch(/towel|tape/i);
  });

  it('provides indoor air protection guidance with explicit scientific limitations (including houseplants disclaimer)', async () => {
    const report = await getAirQualityReport('delhi-anand-vihar', 'offline');
    const guidance = generateIndoorAirGuidance(report, HOUSEHOLD_PRESETS[0]);

    expect(guidance.length).toBeGreaterThanOrEqual(6);
    const filtration = guidance.find((g) => g.category === 'filtration');
    expect(filtration?.limitation).toMatch(/plants/i);

    const sealing = guidance.find((g) => g.category === 'sealing');
    expect(sealing?.limitation).toMatch(/carbon monoxide|CO/i);
  });

  it('distinguishes emission reduction, personal exposure reduction, and indoor air quality in lifestyle alternatives', async () => {
    const report = await getAirQualityReport('delhi-anand-vihar', 'offline');
    const alternatives = generateLowEmissionAlternatives(report, HOUSEHOLD_PRESETS[0]);

    expect(alternatives.length).toBeGreaterThanOrEqual(4);
    const cyclingConditional = alternatives.find(
      (a) => a.id === 'alt-active-mobility-conditional'
    );
    // In severe smog, must warn against cycling due to heavy breathing exposure
    expect(cyclingConditional?.sustainableAlternative).toMatch(/CAUTION|e-rickshaw/i);
  });
});
