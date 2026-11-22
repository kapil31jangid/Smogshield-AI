export type Language = 'en' | 'hi';

export type NAQICategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export type FreshnessStatus =
  | 'live'
  | 'delayed'
  | 'stale'
  | 'estimated'
  | 'unavailable';

export type EvidenceBasis =
  | 'measured_data'
  | 'safety_rule'
  | 'model_estimate';

export type OutcomeCategory =
  | 'exposure_reduction'
  | 'indoor_air_quality'
  | 'emission_reduction';

export interface PollutantReading {
  pm25: number | null; // ug/m3 (24h avg / current)
  pm10: number | null; // ug/m3 (24h avg / current)
  no2: number | null;  // ug/m3
  so2: number | null;  // ug/m3
  co: number | null;   // mg/m3
  o3: number | null;   // ug/m3
}

export interface PollutantSubIndex {
  pollutant: keyof PollutantReading;
  label: string;
  unit: string;
  value: number | null;
  subIndex: number | null;
  category: NAQICategory | null;
  safeLimit: number;
}

export interface WeatherContext {
  temperatureC: number | null;
  humidityPct: number | null;
  windSpeedKmh: number | null;
  inversionRisk: 'low' | 'moderate' | 'high';
  inversionExplanation: string;
}

export interface HourlyWindow {
  hourLabel: string; // e.g., "06:00", "14:00"
  hour24: number;
  pm25: number;
  naqi: number;
  category: NAQICategory;
  isSaferWindow: boolean;
}

export interface AirQualityReport {
  locationId: string;
  city: string;
  state: string;
  stationName: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  observedAt: string; // ISO timestamp
  fetchedAt: string;  // ISO timestamp
  dataAgeMinutes: number;
  naqi: number;
  category: NAQICategory;
  dominantPollutant: string;
  whoPm25Multiple: number;
  healthSummary: {
    en: string;
    hi: string;
  };
  pollutants: PollutantReading;
  subIndices: PollutantSubIndex[];
  weather: WeatherContext;
  hourlyForecast: HourlyWindow[];
  saferOutdoorWindow: {
    label: string;
    expectedNaqi: number;
    recommendationEn: string;
    recommendationHi: string;
  };
  freshness: FreshnessStatus;
  sourceName: string;
  sourceTier: 'tier1_official_station' | 'tier2_secondary_model' | 'tier3_offline_reference';
  sourceUrl: string;
  isOfficialStation: boolean;
  degradedReason?: string;
}

export type AgeGroup = 'infants' | 'children' | 'adults' | 'elderly';

export type CommuteMode =
  | 'two_wheeler'
  | 'walk_cycle'
  | 'auto_bus'
  | 'metro'
  | 'car'
  | 'work_from_home';

export type CookingSetup =
  | 'lpg_exhaust'
  | 'lpg_no_exhaust'
  | 'electric_induction'
  | 'biomass_coal';

export type ProtectiveEquipment =
  | 'n95_masks'
  | 'hepa_purifier'
  | 'exhaust_fan'
  | 'wet_mop_cleaning'
  | 'cloth_masks_only';

export type BudgetTier = 'standard' | 'limited_budget';

export interface FamilyProfile {
  id: string;
  name: string;
  householdSize: number;
  ageGroups: AgeGroup[];
  hasRespiratorySensitivity: boolean;
  primaryCommuteMode: CommuteMode;
  commuteDistanceKm: number;
  schoolOrWorkStartHour: number; // 0-23
  outdoorExerciseMinutes: number;
  cookingSetup: CookingSetup;
  equipment: ProtectiveEquipment[];
  budgetTier: BudgetTier;
  language: Language;
}

export interface DailyActionSlot {
  id: string;
  slotKey:
    | 'morning_routine'
    | 'commute_school_work'
    | 'outdoor_exercise'
    | 'shopping_errands'
    | 'cooking_indoor'
    | 'evening_routine'
    | 'high_pollution_night';
  timeWindow: string;
  title: string;
  priority: 'critical' | 'high' | 'moderate' | 'routine';
  whatToDo: string;
  whyItMatters: string;
  whenToDoIt: string;
  alternative: string;
  basis: EvidenceBasis;
  ruleId: string;
  outcomeCategory: OutcomeCategory;
  estimatedExposureReductionPct: number;
  impactActionType: ImpactActionType;
}

export interface IndoorGuidanceItem {
  id: string;
  category:
    | 'ventilation'
    | 'sealing'
    | 'cooking'
    | 'dust_cleaning'
    | 'filtration'
    | 'masks'
    | 'low_cost';
  title: string;
  recommendation: string;
  mechanism: string;
  limitation: string;
  isLowCostFriendly: boolean;
  basis: EvidenceBasis;
}

export interface LifestyleAlternative {
  id: string;
  highEmissionActivity: string;
  sustainableAlternative: string;
  outcomeCategory: OutcomeCategory;
  outcomeDistinction: string;
  mechanism: string;
  co2SavedGramsPerAction: number;
  pm25TailpipeSavedMgPerAction: number;
  personalExposureDeltaPct: number;
  methodologyAndAssumptions: string;
  impactActionType: ImpactActionType;
}

export type ImpactActionType =
  | 'outdoor_trip_rescheduled'
  | 'vehicle_trip_avoided'
  | 'shared_journey_taken'
  | 'idling_avoided'
  | 'indoor_protection_completed'
  | 'clean_cooking_ventilation';

export interface CompletedActionRecord {
  id: string;
  actionId: string;
  actionType: ImpactActionType;
  title: string;
  completedAt: string; // ISO date
  aqiAtCompletion: number;
  pm25AtCompletion: number;
  distanceKm: number;
  durationMinutes: number;
}

export interface ImpactSummary {
  totalActionsCompleted: number;
  countsByType: Record<ImpactActionType, number>;
  estimatedInhaledPm25AvoidedUg: number;
  estimatedCo2AvoidedGrams: number;
  estimatedTailpipePm25AvoidedMg: number;
  methodologyDisclosures: string[];
  limitations: string[];
}

export interface CommunityInitiative {
  id: string;
  category:
    | 'shared_transport'
    | 'no_idling'
    | 'school_safety'
    | 'waste_burning_prevention'
    | 'dust_control'
    | 'awareness';
  titleEn: string;
  titleHi: string;
  summaryEn: string;
  summaryHi: string;
  targetGroup: string;
  outcomeCategory: OutcomeCategory;
  actionStepsEn: string[];
  actionStepsHi: string[];
  householdsPledged: number;
  impactMetricLabel: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  basis?: EvidenceBasis;
  sourceAttribution?: string;
  safetyOverrideApplied?: boolean;
  providerMode?: 'gemini_live' | 'deterministic_fallback';
}
