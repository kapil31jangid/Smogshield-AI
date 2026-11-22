import {
  AirQualityReport,
  CompletedActionRecord,
  DailyActionSlot,
  FamilyProfile,
  ImpactSummary,
  IndoorGuidanceItem,
  LifestyleAlternative,
  WhatIfScenarioComparison,
} from '@/types/smogshield';

/**
 * @architecture SOLID (Interface Segregation & Dependency Inversion)
 * Core domain contracts decoupling high-level UI/API orchestrators from concrete
 * telemetry, recommendation, physics impact, GenAI, and security implementations.
 */

export interface IAirQualityTelemetryProvider {
  getAirQualityReport(
    cityId: string,
    simulateMode?: 'normal' | 'stale' | 'offline' | 'no_station'
  ): Promise<AirQualityReport>;
  getSupportedLocations(): Array<{
    id: string;
    city: string;
    state: string;
    stationName: string;
    hasLocalOfficialStation: boolean;
  }>;
}

export interface IExposureRecommendationEngine {
  generateDailyPlan(
    report: AirQualityReport,
    profile: FamilyProfile
  ): DailyActionSlot[];
  generateWhatIfComparisons(
    report: AirQualityReport,
    profile: FamilyProfile
  ): WhatIfScenarioComparison[];
  generateIndoorGuidance(
    report: AirQualityReport,
    profile: FamilyProfile
  ): IndoorGuidanceItem[];
  generateLifestyleAlternatives(
    report: AirQualityReport,
    profile: FamilyProfile
  ): LifestyleAlternative[];
}

export interface IImpactCalculator {
  calculateSummary(records: CompletedActionRecord[]): ImpactSummary;
}

export interface ISlidingWindowRateLimiter {
  check(
    identifier: string,
    limit: number,
    windowMs: number
  ): {
    allowed: boolean;
    remaining: number;
    resetAtMs: number;
  };
}

export interface ISensitiveOperationGuardResult {
  allowed: boolean;
  status?: 403 | 413 | 415 | 429;
  errorCode?: string;
  message?: string;
  retryAfterSeconds?: number;
  remaining?: number;
}
