'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  loadCloudHouseholdData,
  signInWithGooglePopup,
  signOutFirebaseUser,
  subscribeToAuthState,
  syncCloudHouseholdData,
} from '@/lib/firebase/client';
import {
  AirQualityReport,
  AssistantMessage,
  CommunityInitiative,
  CompletedActionRecord,
  FamilyProfile,
  ImpactActionType,
  Language,
} from '@/types/smogshield';
import {
  generateIndoorAirGuidance,
  generateLowEmissionAlternatives,
  generatePersonalizedDailyPlan,
  generateWhatIfComparisons,
  getEffectiveSafetyNaqi,
  HOUSEHOLD_PRESETS,
} from '@/lib/engine/recommendations';
import {
  calculateHonestImpactSummary,
  INITIAL_COMMUNITY_INITIATIVES,
} from '@/lib/engine/impact';

export type ActiveTab =
  | 'planner'
  | 'indoor'
  | 'lifestyle'
  | 'assistant'
  | 'impact'
  | 'community'
  | 'profile';

export type SimulateMode = 'normal' | 'stale' | 'offline' | 'no_station';

const PROFILE_STORAGE_KEY = 'smogshield_family_profile_v1';
const COMPLETED_STORAGE_KEY = 'smogshield_completed_actions_v1';

/**
 * @architecture SOLID (Single Responsibility Principle)
 * Encapsulates workspace state, Firebase Auth/Firestore cloud sync, telemetry fetching,
 * deterministic recommendation memoization, and assistant/community actions separately
 * from JSX presentation components.
 */
export function useSmogShieldController(initialReport: AirQualityReport) {
  const [report, setReport] = useState<AirQualityReport>(initialReport);
  const [selectedCity, setSelectedCity] = useState<string>(initialReport.locationId);
  const [simulateMode, setSimulateMode] = useState<SimulateMode>('normal');
  const [isLoadingAqi, setIsLoadingAqi] = useState<boolean>(false);
  const [aqiError, setAqiError] = useState<string | null>(null);

  const [profile, setProfile] = useState<FamilyProfile>(HOUSEHOLD_PRESETS[0]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('planner');
  const [completedActions, setCompletedActions] = useState<CompletedActionRecord[]>([]);
  const [initiatives, setInitiatives] = useState<CommunityInitiative[]>(
    INITIAL_COMMUNITY_INITIATIVES
  );
  const [pledgedIds, setPledgedIds] = useState<string[]>([]);

  const [authUser, setAuthUser] = useState<{
    uid: string;
    displayName: string | null;
    email: string | null;
  } | null>(null);
  const [authInitializing, setAuthInitializing] = useState<boolean>(true);
  const [guestSessionActive, setGuestSessionActive] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [cloudSynced, setCloudSynced] = useState<boolean>(false);

  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Welcome to SmogShield AI. Ask me any question about today’s outdoor exercise safety, school commutes, low-cost indoor air protection without a purifier, or neighborhood smog solutions in English or Hindi.',
      createdAt: initialReport.fetchedAt,
      basis: 'safety_rule',
      sourceAttribution: `${initialReport.stationName} (NAQI ${initialReport.naqi})`,
      providerMode: 'deterministic_fallback',
    },
  ]);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed && typeof parsed.id === 'string' && Array.isArray(parsed.ageGroups)) {
          setProfile(parsed);
        }
      }
      const savedActions = localStorage.getItem(COMPLETED_STORAGE_KEY);
      if (savedActions) {
        const parsedActions = JSON.parse(savedActions);
        if (Array.isArray(parsedActions)) {
          setCompletedActions(parsedActions);
        }
      }
    } catch {
      // Ignore storage read errors in restricted browsing modes
    }

    const unsubscribe = subscribeToAuthState(async (user) => {
      if (user) {
        setAuthUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
        });
        setAuthInitializing(false);
        const cloud = await loadCloudHouseholdData(user.uid);
        if (cloud?.profile) {
          setProfile(cloud.profile);
          setCloudSynced(true);
        }
        if (Array.isArray(cloud?.completedActions)) {
          setCompletedActions(cloud.completedActions);
        }
      } else {
        setAuthUser(null);
        setCloudSynced(false);
        setAuthInitializing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const user = await signInWithGooglePopup();
      setAuthUser({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
      });
      const synced = await syncCloudHouseholdData(user.uid, profile, completedActions);
      setCloudSynced(synced);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Google Sign-In could not be completed. Please try again or use Guest/Demo Mode.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleFirebaseSignOut = async () => {
    setAuthError(null);
    await signOutFirebaseUser();
    setAuthUser(null);
    setGuestSessionActive(false);
    setCloudSynced(false);
  };

  const saveProfile = (next: FamilyProfile) => {
    setProfile(next);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
    if (authUser) {
      void syncCloudHouseholdData(authUser.uid, next, completedActions).then((ok) =>
        setCloudSynced(ok)
      );
    }
  };

  const fetchAirQuality = async (cityId: string, sim: SimulateMode) => {
    setIsLoadingAqi(true);
    setAqiError(null);
    try {
      const res = await fetch(
        `/api/air-quality?city=${encodeURIComponent(cityId)}&simulate=${encodeURIComponent(sim)}`
      );
      if (!res.ok) {
        throw new Error(`Air quality service returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data?.report) {
        setReport(data.report);
      }
    } catch (err) {
      setAqiError(
        err instanceof Error
          ? err.message
          : 'Unable to refresh air-quality telemetry. Retaining previous validated reading.'
      );
    } finally {
      setIsLoadingAqi(false);
    }
  };

  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity);
    void fetchAirQuality(newCity, simulateMode);
  };

  const handleSimulateChange = (newSim: SimulateMode) => {
    setSimulateMode(newSim);
    void fetchAirQuality(selectedCity, newSim);
  };

  const lang: Language = profile.language;

  const toggleLanguage = () => {
    const nextLang: Language = profile.language === 'en' ? 'hi' : 'en';
    saveProfile({ ...profile, language: nextLang });
  };

  const safetyMeta = useMemo(
    () => getEffectiveSafetyNaqi(report, profile),
    [report, profile]
  );
  const dailyPlan = useMemo(
    () => generatePersonalizedDailyPlan(report, profile),
    [report, profile]
  );
  const whatIfScenarios = useMemo(
    () => generateWhatIfComparisons(report, profile),
    [report, profile]
  );
  const indoorGuidance = useMemo(
    () => generateIndoorAirGuidance(report, profile),
    [report, profile]
  );
  const lowEmissionAlternatives = useMemo(
    () => generateLowEmissionAlternatives(report, profile),
    [report, profile]
  );
  const impactSummary = useMemo(
    () => calculateHonestImpactSummary(completedActions),
    [completedActions]
  );

  const toggleCompleteAction = (
    actionId: string,
    actionType: ImpactActionType,
    title: string
  ) => {
    const exists = completedActions.some((a) => a.actionId === actionId);
    const next: CompletedActionRecord[] = exists
      ? completedActions.filter((a) => a.actionId !== actionId)
      : [
          {
            id: `${actionId}-${Date.now()}`,
            actionId,
            actionType,
            title,
            completedAt: new Date().toISOString(),
            aqiAtCompletion: report.naqi,
            pm25AtCompletion: report.pollutants.pm25 ?? 160,
            distanceKm: profile.commuteDistanceKm || 8,
            durationMinutes: profile.outdoorExerciseMinutes || 35,
          },
          ...completedActions,
        ];
    setCompletedActions(next);
    try {
      localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage error
    }
    if (authUser) {
      void syncCloudHouseholdData(authUser.uid, profile, next).then((ok) =>
        setCloudSynced(ok)
      );
    }
  };

  const handleSendAssistantQuestion = async (questionText?: string) => {
    const q = (questionText ?? chatInput).trim();
    if (!q || isSendingChat) return;

    setChatError(null);
    if (!questionText) setChatInput('');

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: q,
        createdAt: new Date().toISOString(),
      },
    ]);
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          language: profile.language,
          profile,
          airQualityContext: {
            city: report.city,
            stationName: report.stationName,
            naqi: report.naqi,
            category: report.category,
            dominantPollutant: report.dominantPollutant,
            pm25: report.pollutants.pm25,
            pm10: report.pollutants.pm10,
            freshness: report.freshness,
            sourceName: report.sourceName,
            saferWindowLabel: report.saferOutdoorWindow.label,
            inversionRisk: report.weather.inversionRisk,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `Assistant returned status ${res.status}`);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          createdAt: new Date().toISOString(),
          basis: data.basis,
          sourceAttribution: data.sourceAttribution,
          safetyOverrideApplied: data.safetyOverrideApplied,
          providerMode: data.providerMode,
        },
      ]);
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : 'Assistant temporarily unreachable. Please try again.'
      );
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleCommunityPledge = async (initiativeId: string) => {
    if (pledgedIds.includes(initiativeId)) return;
    setPledgedIds((prev) => [...prev, initiativeId]);
    setInitiatives((prev) =>
      prev.map((item) =>
        item.id === initiativeId
          ? { ...item, householdsPledged: item.householdsPledged + 1 }
          : item
      )
    );
    try {
      await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initiativeId }),
      });
    } catch {
      // Optimistic local update retained
    }
  };

  return {
    report,
    selectedCity,
    simulateMode,
    isLoadingAqi,
    aqiError,
    profile,
    lang,
    activeTab,
    setActiveTab,
    completedActions,
    initiatives,
    pledgedIds,
    authUser,
    authInitializing,
    guestSessionActive,
    setGuestSessionActive,
    authError,
    setAuthError,
    isSigningIn,
    cloudSynced,
    chatInput,
    setChatInput,
    isSendingChat,
    chatError,
    messages,
    safetyMeta,
    dailyPlan,
    whatIfScenarios,
    indoorGuidance,
    lowEmissionAlternatives,
    impactSummary,
    handleGoogleSignIn,
    handleFirebaseSignOut,
    saveProfile,
    fetchAirQuality,
    handleCityChange,
    handleSimulateChange,
    toggleLanguage,
    toggleCompleteAction,
    handleSendAssistantQuestion,
    handleCommunityPledge,
  };
}
