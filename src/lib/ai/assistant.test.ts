import { describe, expect, it } from 'vitest';
import {
  enforceDeterministicSafetyGuardrail,
  generateContextualAssistantReply,
} from './assistant';
import { HOUSEHOLD_PRESETS } from '@/lib/engine/recommendations';

describe('GenAI Family Assistant & Deterministic Post-Generation Guardrails', () => {
  const severeContext = {
    city: 'New Delhi (East)',
    stationName: 'Anand Vihar, Delhi - DPCC / CPCB CAAQMS',
    naqi: 418,
    category: 'Severe' as const,
    dominantPollutant: 'PM2.5',
    pm25: 290,
    pm10: 440,
    freshness: 'live' as const,
    sourceName: 'CPCB CAAQMS',
    saferWindowLabel: '13:30–16:00',
    inversionRisk: 'high' as const,
  };

  it('overrides unsafe LLM outdoor exercise approval when NAQI >= 201', () => {
    const unsafeDraft =
      'Yes, it is safe to jog outside for 45 minutes this morning to stay fit.';
    const guarded = enforceDeterministicSafetyGuardrail(
      unsafeDraft,
      severeContext,
      'en'
    );
    expect(guarded.safetyOverrideApplied).toBe(true);
    expect(guarded.safeAnswer).toMatch(/Safety|Do NOT|outdoor/i);
  });

  it('appends medical disclaimer when household mentions asthma or breathing symptoms', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const reply = await generateContextualAssistantReply(
        'My child has asthma and coughing today, what should we do?',
        'en',
        HOUSEHOLD_PRESETS[0],
        severeContext
      );
      expect(reply.providerMode).toBe('deterministic_fallback');
      expect(reply.answer).toMatch(/medical|doctor|pediatrician|inhaler/i);
      expect(reply.sourceAttribution).toContain('418');
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it('answers in Hindi (हिन्दी) when language is set to hi', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const reply = await generateContextualAssistantReply(
        'क्या आज सुबह बाहर दौड़ना सुरक्षित है?',
        'hi',
        { ...HOUSEHOLD_PRESETS[0], language: 'hi' },
        severeContext
      );
      expect(reply.answer).toMatch(/[\u0900-\u097F]/);
      expect(reply.basis).toBeTruthy();
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    }
  });
});
