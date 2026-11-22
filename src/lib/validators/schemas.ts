import { z } from 'zod';

export const LanguageSchema = z.enum(['en', 'hi']).default('en');

export const AirQualityQuerySchema = z.object({
  city: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9\s\-_,().]+$/, 'Invalid city identifier')
    .default('delhi-anand-vihar'),
  simulate: z
    .enum(['normal', 'stale', 'offline', 'no_station'])
    .optional()
    .default('normal'),
});

export const AgeGroupSchema = z.enum(['infants', 'children', 'adults', 'elderly']);

export const CommuteModeSchema = z.enum([
  'two_wheeler',
  'walk_cycle',
  'auto_bus',
  'metro',
  'car',
  'work_from_home',
]);

export const CookingSetupSchema = z.enum([
  'lpg_exhaust',
  'lpg_no_exhaust',
  'electric_induction',
  'biomass_coal',
]);

export const ProtectiveEquipmentSchema = z.enum([
  'n95_masks',
  'hepa_purifier',
  'exhaust_fan',
  'wet_mop_cleaning',
  'cloth_masks_only',
]);

export const BudgetTierSchema = z.enum(['standard', 'limited_budget']);

export const FamilyProfileSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  householdSize: z.number().int().min(1).max(25),
  ageGroups: z.array(AgeGroupSchema).min(1).max(4),
  hasRespiratorySensitivity: z.boolean(),
  primaryCommuteMode: CommuteModeSchema,
  commuteDistanceKm: z.number().min(0).max(150),
  schoolOrWorkStartHour: z.number().int().min(0).max(23),
  outdoorExerciseMinutes: z.number().int().min(0).max(300),
  cookingSetup: CookingSetupSchema,
  equipment: z.array(ProtectiveEquipmentSchema).max(5),
  budgetTier: BudgetTierSchema,
  language: LanguageSchema,
});

export const PollutantReadingSchema = z.object({
  pm25: z.number().min(0).max(2000).nullable(),
  pm10: z.number().min(0).max(3000).nullable(),
  no2: z.number().min(0).max(2000).nullable(),
  so2: z.number().min(0).max(2000).nullable(),
  co: z.number().min(0).max(200).nullable(),
  o3: z.number().min(0).max(2000).nullable(),
});

export const AssistantRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(2, 'Question must be at least 2 characters')
    .max(600, 'Question cannot exceed 600 characters'),
  language: LanguageSchema,
  profile: FamilyProfileSchema,
  airQualityContext: z.object({
    city: z.string().trim().min(1).max(80),
    stationName: z.string().trim().min(1).max(140),
    naqi: z.number().min(0).max(999),
    category: z.enum([
      'Good',
      'Satisfactory',
      'Moderate',
      'Poor',
      'Very Poor',
      'Severe',
    ]),
    dominantPollutant: z.string().trim().min(1).max(32),
    pm25: z.number().min(0).max(2000).nullable(),
    pm10: z.number().min(0).max(3000).nullable(),
    freshness: z.enum(['live', 'delayed', 'stale', 'estimated', 'unavailable']),
    sourceName: z.string().trim().min(1).max(160),
    saferWindowLabel: z.string().trim().min(1).max(120),
    inversionRisk: z.enum(['low', 'moderate', 'high']),
  }),
});

export const CommunityPledgeRequestSchema = z.object({
  initiativeId: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9\-_]+$/),
  neighborhoodNote: z.string().trim().max(140).optional(),
});

/**
 * Strips prompt-injection framing tokens or role-hijacking markers from untrusted user text.
 */
export function sanitizeUserPrompt(raw: string): string {
  return raw
    .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi, '[filtered]')
    .replace(/system\s*prompt|developer\s*instruction|override\s*safety/gi, '[filtered]')
    .replace(/[<>]/g, '')
    .trim();
}
