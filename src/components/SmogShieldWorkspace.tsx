'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Cloud,
  HeartPulse,
  Home,
  Languages,
  Leaf,
  LogIn,
  LogOut,
  MapPin,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Users,
  Wind,
} from 'lucide-react';
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
import AuthGateScreen from './modules/AuthGateScreen';
import LiveAirHeroPanel from './modules/LiveAirHeroPanel';
import DailyPlannerModule from './modules/DailyPlannerModule';
import {
  IndoorProtectionModule,
  LowEmissionLifestyleModule,
} from './modules/IndoorAndLifestyleModules';
import AssistantModule from './modules/AssistantModule';
import {
  CommunityActionModule,
  ImpactTrackerModule,
  ProfileConfiguratorModule,
} from './modules/ImpactCommunityProfileModules';

interface LocationSummary {
  id: string;
  city: string;
  state: string;
  stationName: string;
  hasLocalOfficialStation: boolean;
}

interface Props {
  initialReport: AirQualityReport;
  locations: LocationSummary[];
}

type ActiveTab =
  | 'planner'
  | 'indoor'
  | 'lifestyle'
  | 'assistant'
  | 'impact'
  | 'community'
  | 'profile';

const PROFILE_STORAGE_KEY = 'smogshield_family_profile_v1';
const COMPLETED_STORAGE_KEY = 'smogshield_completed_actions_v1';

export default function SmogShieldWorkspace({ initialReport, locations }: Props) {
  const uid = useId();
  const [report, setReport] = useState<AirQualityReport>(initialReport);
  const [selectedCity, setSelectedCity] = useState<string>(initialReport.locationId);
  const [simulateMode, setSimulateMode] = useState<
    'normal' | 'stale' | 'offline' | 'no_station'
  >('normal');
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

  const fetchAirQuality = async (
    cityId: string,
    sim: 'normal' | 'stale' | 'offline' | 'no_station'
  ) => {
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

  const handleSimulateChange = (
    newSim: 'normal' | 'stale' | 'offline' | 'no_station'
  ) => {
    setSimulateMode(newSim);
    void fetchAirQuality(selectedCity, newSim);
  };

  const lang: Language = profile.language;
  const hi = lang === 'hi';

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

  if (authInitializing) {
    return (
      <div
        id="main-workspace"
        className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 px-4"
      >
        <div
          className="h-12 w-12 rounded-full border-4 border-teal-800 border-t-transparent animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm font-semibold text-slate-700">
          Connecting to SmogShield AI &amp; Firebase Authentication...
        </p>
      </div>
    );
  }

  if (!authUser && !guestSessionActive) {
    return (
      <AuthGateScreen
        report={report}
        lang={lang}
        isSigningIn={isSigningIn}
        authError={authError}
        onToggleLanguage={toggleLanguage}
        onGoogleSignIn={() => void handleGoogleSignIn()}
        onEnterGuestMode={() => {
          setAuthError(null);
          setGuestSessionActive(true);
        }}
      />
    );
  }

  const tabs = [
    {
      id: 'planner' as ActiveTab,
      labelEn: '1. Daily Action Planner',
      labelHi: '1. दैनिक कार्य योजना',
      icon: Activity,
    },
    {
      id: 'indoor' as ActiveTab,
      labelEn: '2. Indoor Air Protection',
      labelHi: '2. इनडोर वायु सुरक्षा',
      icon: Home,
    },
    {
      id: 'lifestyle' as ActiveTab,
      labelEn: '3. Low-Emission Lifestyle',
      labelHi: '3. कम-उत्सर्जन जीवनशैली',
      icon: Leaf,
    },
    {
      id: 'assistant' as ActiveTab,
      labelEn: '4. GenAI Family Assistant',
      labelHi: '4. एआई परिवार सहायक',
      icon: MessageSquare,
    },
    {
      id: 'impact' as ActiveTab,
      labelEn: `5. Impact Tracker (${completedActions.length})`,
      labelHi: `5. प्रभाव ट्रैकर (${completedActions.length})`,
      icon: HeartPulse,
    },
    {
      id: 'community' as ActiveTab,
      labelEn: '6. Community Action Hub',
      labelHi: '6. सामुदायिक पहल',
      icon: Users,
    },
    {
      id: 'profile' as ActiveTab,
      labelEn: '7. Family Profile Setup',
      labelHi: '7. परिवार प्रोफ़ाइल सेटअप',
      icon: Sliders,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-900 text-white shadow-sm">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  SmogShield AI
                </span>
                <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-900 border border-teal-200">
                  {hi ? 'परिवार सुरक्षा सहायक' : 'Family Smog Intelligence'}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {hi
                  ? 'वायु गुणवत्ता जागरूकता से व्यावहारिक पारिवारिक सुरक्षा तक'
                  : 'From air-quality awareness to actionable family protection'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <label htmlFor={`${uid}-city-select`} className="sr-only">
                {hi ? 'शहर या स्टेशन चुनें' : 'Select Monitoring Location'}
              </label>
              <MapPin className="h-4 w-4 text-teal-800 shrink-0" aria-hidden="true" />
              <select
                id={`${uid}-city-select`}
                data-testid="city-selector"
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                disabled={isLoadingAqi}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 shadow-sm focus:border-teal-700"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.city} — {loc.state}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label
                htmlFor={`${uid}-sim-select`}
                className="text-xs font-medium text-slate-700"
              >
                {hi ? 'डेटा स्थिति:' : 'Telemetry Condition:'}
              </label>
              <select
                id={`${uid}-sim-select`}
                data-testid="telemetry-condition-selector"
                value={simulateMode}
                onChange={(e) =>
                  handleSimulateChange(
                    e.target.value as 'normal' | 'stale' | 'offline' | 'no_station'
                  )
                }
                disabled={isLoadingAqi}
                className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-800"
              >
                <option value="normal">
                  {hi ? 'लाइव / मानक फ़ीड' : 'Live / Standard Feed'}
                </option>
                <option value="stale">
                  {hi ? 'पुराना डेटा (>4 घंटे) जांच' : 'Stale Telemetry (>4h)'}
                </option>
                <option value="no_station">
                  {hi ? 'स्थानीय स्टेशन अनुपलब्ध' : 'No Local Ground Station'}
                </option>
                <option value="offline">
                  {hi ? 'प्रदाता ऑफ़लाइन (Fallback)' : 'Provider Offline (Degraded)'}
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => void fetchAirQuality(selectedCity, simulateMode)}
              disabled={isLoadingAqi}
              aria-label={
                hi ? 'वायु गुणवत्ता डेटा रीफ्रेश करें' : 'Refresh air quality data'
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoadingAqi ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{hi ? 'रीफ्रेश' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              data-testid="language-toggle"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800"
            >
              <Languages className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{hi ? 'English' : 'हिन्दी (Hindi)'}</span>
            </button>

            {authUser ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs">
                <Cloud className="h-3.5 w-3.5 text-teal-800" aria-hidden="true" />
                <span className="font-semibold text-teal-950 max-w-[130px] truncate">
                  {authUser.displayName || authUser.email || 'Firebase User'}
                </span>
                {cloudSynced && (
                  <span className="text-[10px] font-bold text-emerald-800">
                    • Synced
                  </span>
                )}
                <button
                  type="button"
                  data-testid="firebase-signout-btn"
                  onClick={() => void handleFirebaseSignOut()}
                  className="ml-1 inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[11px] font-bold text-slate-800 border border-slate-300 hover:bg-slate-100"
                >
                  <LogOut className="h-3 w-3" aria-hidden="true" />
                  <span>{hi ? 'लॉग आउट' : 'Sign Out'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="firebase-signin-btn"
                  onClick={() => void handleGoogleSignIn()}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-800 bg-white px-2.5 py-1.5 text-xs font-bold text-teal-950 shadow-sm hover:bg-teal-50 disabled:opacity-50"
                >
                  <LogIn className="h-3.5 w-3.5 text-teal-800" aria-hidden="true" />
                  <span>
                    {isSigningIn
                      ? hi
                        ? 'कनेक्ट हो रहा है...'
                        : 'Signing in...'
                      : hi
                        ? 'Google साइन-इन'
                        : 'Google Sign-In'}
                  </span>
                </button>
                <button
                  type="button"
                  data-testid="exit-guest-mode-btn"
                  onClick={() => setGuestSessionActive(false)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{hi ? 'ऑथ स्क्रीन' : 'Auth Screen'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main
        id="main-workspace"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 space-y-6"
      >
        {authError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle
                className="h-4 w-4 text-amber-800 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{authError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="font-bold underline"
            >
              {hi ? 'बंद करें' : 'Dismiss'}
            </button>
          </div>
        )}

        {aqiError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-950"
          >
            <AlertTriangle
              className="h-5 w-5 text-rose-700 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">
                {hi ? 'नेटवर्क चेतावनी' : 'Telemetry Warning'}
              </p>
              <p>{aqiError}</p>
            </div>
          </div>
        )}

        {report.degradedReason && (
          <div
            role="status"
            data-testid="degraded-data-banner"
            className="flex items-start gap-3 rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <ShieldAlert
              className="h-5 w-5 text-amber-800 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="font-bold">
                {hi
                  ? 'संरक्षी सुरक्षा मोड सक्रिय (Degraded / Non-Station Telemetry Notice)'
                  : 'Conservative Safety Mode Active — Telemetry Transparency Notice'}
              </p>
              <p className="mt-0.5">{report.degradedReason}</p>
            </div>
          </div>
        )}

        <LiveAirHeroPanel
          report={report}
          profile={profile}
          lang={lang}
          safetyMeta={safetyMeta}
          onCustomizeProfile={() => setActiveTab('profile')}
        />

        <section
          aria-label={hi ? 'परिवार प्रोफ़ाइल प्रीसेट' : 'Household Profile Presets'}
          className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Sliders className="h-4 w-4 text-teal-800" aria-hidden="true" />
            <span>
              {hi
                ? 'त्वरित परिवार परिदृश्य (Instant Family Presets):'
                : 'Instant Family Scenario Presets:'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {HOUSEHOLD_PRESETS.map((preset) => {
              const isSelected = profile.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`preset-${preset.id}`}
                  aria-pressed={isSelected}
                  onClick={() => saveProfile(preset)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-teal-900 text-white shadow-sm'
                      : 'border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* WAI-ARIA Compliant Module Tablist */}
        <div
          role="tablist"
          aria-label={hi ? 'मुख्य मॉड्यूल नेविगेशन' : 'Primary Module Navigation'}
          className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm gap-1"
        >
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                data-testid={`tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    const nextTab = tabs[(index + 1) % tabs.length];
                    if (nextTab) setActiveTab(nextTab.id);
                  } else if (e.key === 'ArrowLeft') {
                    const prevTab = tabs[(index - 1 + tabs.length) % tabs.length];
                    if (prevTab) setActiveTab(prevTab.id);
                  }
                }}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition ${
                  active
                    ? 'bg-teal-900 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{hi ? tab.labelHi : tab.labelEn}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'planner' && (
          <DailyPlannerModule
            report={report}
            profile={profile}
            dailyPlan={dailyPlan}
            whatIfScenarios={whatIfScenarios}
            completedActions={completedActions}
            lang={lang}
            onToggleCompleteAction={toggleCompleteAction}
          />
        )}

        {activeTab === 'indoor' && (
          <IndoorProtectionModule indoorGuidance={indoorGuidance} lang={lang} />
        )}

        {activeTab === 'lifestyle' && (
          <LowEmissionLifestyleModule
            lowEmissionAlternatives={lowEmissionAlternatives}
            completedActions={completedActions}
            lang={lang}
            onToggleCompleteAction={toggleCompleteAction}
          />
        )}

        {activeTab === 'assistant' && (
          <AssistantModule
            uid={uid}
            report={report}
            profile={profile}
            lang={lang}
            messages={messages}
            chatInput={chatInput}
            isSendingChat={isSendingChat}
            chatError={chatError}
            onChatInputChange={setChatInput}
            onSendQuestion={(qText) => void handleSendAssistantQuestion(qText)}
          />
        )}

        {activeTab === 'impact' && (
          <ImpactTrackerModule
            impactSummary={impactSummary}
            completedActions={completedActions}
            lang={lang}
            onToggleCompleteAction={toggleCompleteAction}
          />
        )}

        {activeTab === 'community' && (
          <CommunityActionModule
            initiatives={initiatives}
            pledgedIds={pledgedIds}
            lang={lang}
            onPledge={(id) => void handleCommunityPledge(id)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileConfiguratorModule
            uid={uid}
            profile={profile}
            lang={lang}
            onSaveProfile={saveProfile}
          />
        )}
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-xs text-slate-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-teal-800" aria-hidden="true" />
            <span>
              <strong>SmogShield AI</strong> • Indian CPCB NAQI Deterministic Decision Engine &amp; Family Assistant
            </span>
          </div>
          <div>
            {hi
              ? 'डेटा पारदर्शिता: कभी भी काल्पनिक लाइव AQI नहीं दिखाया जाता। स्वास्थ्य प्रश्नों के लिए हमेशा चिकित्सक से परामर्श लें।'
              : 'Data Honesty Guarantee: Never fabricates live AQI readings. Public-health guidance does not replace medical advice.'}
          </div>
        </div>
      </footer>
    </div>
  );
}
