'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Car,
  CheckCircle2,
  Clock,
  Cloud,
  Compass,
  ExternalLink,
  HeartPulse,
  Home,
  Info,
  Languages,
  Leaf,
  LogIn,
  LogOut,
  MapPin,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Thermometer,
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
  AgeGroup,
  AirQualityReport,
  AssistantMessage,
  BudgetTier,
  CommuteMode,
  CommunityInitiative,
  CompletedActionRecord,
  CookingSetup,
  EvidenceBasis,
  FamilyProfile,
  FreshnessStatus,
  ImpactActionType,
  Language,
  NAQICategory,
  ProtectiveEquipment,
} from '@/types/smogshield';
import {
  generateIndoorAirGuidance,
  generateLowEmissionAlternatives,
  generatePersonalizedDailyPlan,
  getEffectiveSafetyNaqi,
  HOUSEHOLD_PRESETS,
} from '@/lib/engine/recommendations';
import {
  calculateHonestImpactSummary,
  INITIAL_COMMUNITY_INITIATIVES,
} from '@/lib/engine/impact';

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

function getCategoryStyles(category: NAQICategory): {
  bg: string;
  border: string;
  badge: string;
  text: string;
  labelHi: string;
} {
  switch (category) {
    case 'Good':
      return {
        bg: 'bg-emerald-950 text-white',
        border: 'border-emerald-700',
        badge: 'bg-emerald-100 text-emerald-950 border-emerald-400',
        text: 'text-emerald-800',
        labelHi: 'अच्छा (Good)',
      };
    case 'Satisfactory':
      return {
        bg: 'bg-teal-950 text-white',
        border: 'border-teal-700',
        badge: 'bg-teal-100 text-teal-950 border-teal-400',
        text: 'text-teal-800',
        labelHi: 'संतोषजनक (Satisfactory)',
      };
    case 'Moderate':
      return {
        bg: 'bg-amber-950 text-white',
        border: 'border-amber-700',
        badge: 'bg-amber-100 text-amber-950 border-amber-400',
        text: 'text-amber-900',
        labelHi: 'मध्यम (Moderate)',
      };
    case 'Poor':
      return {
        bg: 'bg-orange-950 text-white',
        border: 'border-orange-700',
        badge: 'bg-orange-100 text-orange-950 border-orange-400',
        text: 'text-orange-900',
        labelHi: 'खराब (Poor)',
      };
    case 'Very Poor':
      return {
        bg: 'bg-red-950 text-white',
        border: 'border-red-700',
        badge: 'bg-red-100 text-red-950 border-red-400',
        text: 'text-red-900',
        labelHi: 'बहुत खराब (Very Poor)',
      };
    case 'Severe':
      return {
        bg: 'bg-rose-950 text-white',
        border: 'border-rose-800',
        badge: 'bg-rose-200 text-rose-950 border-rose-500',
        text: 'text-rose-950',
        labelHi: 'गंभीर (Severe)',
      };
  }
}

function getFreshnessBadge(
  freshness: FreshnessStatus,
  lang: Language
): { label: string; style: string } {
  const hi = lang === 'hi';
  switch (freshness) {
    case 'live':
      return {
        label: hi ? 'लाइव स्टेशन डेटा (<1 घंटा)' : 'Live Station Measurement (<1h)',
        style: 'bg-emerald-100 text-emerald-950 border-emerald-400',
      };
    case 'delayed':
      return {
        label: hi ? 'विलंबित स्टेशन डेटा (1-4 घंटे)' : 'Delayed Measurement (1–4h)',
        style: 'bg-amber-100 text-amber-950 border-amber-400',
      };
    case 'estimated':
      return {
        label: hi ? 'वायुमंडलीय मॉडल अनुमान (CPCB सूत्र)' : 'Atmospheric Model Estimate (CPCB NAQI)',
        style: 'bg-sky-100 text-sky-950 border-sky-400',
      };
    case 'stale':
      return {
        label: hi ? 'पुराना डेटा (>4 घंटे — सुरक्षा बफर लागू)' : 'Stale Reading (>4h — Safety Buffer Active)',
        style: 'bg-orange-100 text-orange-950 border-orange-500',
      };
    case 'unavailable':
      return {
        label: hi
          ? 'लाइव डेटा अनुपलब्ध (ऑफ़लाइन संदर्भ बेसलाइन)'
          : 'Live Feed Unavailable (Offline Reference Baseline)',
        style: 'bg-rose-100 text-rose-950 border-rose-500',
      };
  }
}

function getBasisLabel(basis: EvidenceBasis, lang: Language): { text: string; cls: string } {
  const hi = lang === 'hi';
  switch (basis) {
    case 'measured_data':
      return {
        text: hi ? 'मापा गया स्टेशन डेटा' : 'Based on Measured Data',
        cls: 'bg-emerald-50 text-emerald-900 border-emerald-300',
      };
    case 'safety_rule':
      return {
        text: hi ? 'निर्धारक सुरक्षा नियम' : 'Deterministic Safety Rule',
        cls: 'bg-amber-50 text-amber-950 border-amber-300',
      };
    case 'model_estimate':
      return {
        text: hi ? 'मॉडल अनुमान' : 'Atmospheric Model Estimate',
        cls: 'bg-sky-50 text-sky-900 border-sky-300',
      };
  }
}

export default function SmogShieldWorkspace({ initialReport, locations }: Props) {
  const uid = useId();
  const [report, setReport] = useState<AirQualityReport>(initialReport);
  const [selectedCity, setSelectedCity] = useState<string>(initialReport.locationId);
  const [simulateMode, setSimulateMode] = useState<'normal' | 'stale' | 'offline' | 'no_station'>('normal');
  const [isLoadingAqi, setIsLoadingAqi] = useState<boolean>(false);
  const [aqiError, setAqiError] = useState<string | null>(null);

  const [profile, setProfile] = useState<FamilyProfile>(HOUSEHOLD_PRESETS[0]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('planner');
  const [completedActions, setCompletedActions] = useState<CompletedActionRecord[]>([]);
  const [initiatives, setInitiatives] = useState<CommunityInitiative[]>(
    INITIAL_COMMUNITY_INITIATIVES
  );
  const [pledgedIds, setPledgedIds] = useState<string[]>([]);

  // Firebase Auth & Cloud Sync State (Starts on Auth Screen Gate first)
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

  // Assistant State
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

  // Hydrate persisted profile & action history safely after mount, and subscribe to Firebase Auth
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

  const handleEnterGuestMode = () => {
    setAuthError(null);
    setGuestSessionActive(true);
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

  const handleSimulateChange = (newSim: 'normal' | 'stale' | 'offline' | 'no_station') => {
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
    let next: CompletedActionRecord[];
    if (exists) {
      next = completedActions.filter((a) => a.actionId !== actionId);
    } else {
      const record: CompletedActionRecord = {
        id: `${actionId}-${Date.now()}`,
        actionId,
        actionType,
        title,
        completedAt: new Date().toISOString(),
        aqiAtCompletion: report.naqi,
        pm25AtCompletion: report.pollutants.pm25 ?? 160,
        distanceKm: profile.commuteDistanceKm || 8,
        durationMinutes: profile.outdoorExerciseMinutes || 35,
      };
      next = [record, ...completedActions];
    }
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

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
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

      const assistantMsg: AssistantMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        createdAt: new Date().toISOString(),
        basis: data.basis,
        sourceAttribution: data.sourceAttribution,
        safetyOverrideApplied: data.safetyOverrideApplied,
        providerMode: data.providerMode,
      };
      setMessages((prev) => [...prev, assistantMsg]);
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

  const catStyle = getCategoryStyles(report.category);
  const freshnessBadge = getFreshnessBadge(report.freshness, lang);

  // 1. Initial Firebase Auth Handshake Loading Screen
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

  // 2. Starting Authentication Screen Gate (shown before entering the dashboard)
  if (!authUser && !guestSessionActive) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        <header className="border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-900 text-white">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                SmogShield AI
              </span>
            </div>
            <button
              type="button"
              data-testid="auth-language-toggle"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
            >
              <Languages className="h-3.5 w-3.5 text-teal-800" aria-hidden="true" />
              <span>{hi ? 'English' : 'हिन्दी (Hindi)'}</span>
            </button>
          </div>
        </header>

        <main
          id="main-workspace"
          className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-10 sm:px-6"
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-center rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
            {/* Left Column: Mission & Live Snapshot Preview */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-900 border border-teal-200">
                <Wind className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {hi
                    ? 'शीतकालीन स्मॉग और परिवार वायु सुरक्षा प्लेटफ़ॉर्म'
                    : 'Winter Smog & Family Air Protection Intelligence'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {hi
                  ? 'वायु गुणवत्ता जागरूकता से व्यावहारिक पारिवारिक सुरक्षा तक।'
                  : 'From Air-Quality Awareness to Actionable Family Protection.'}
              </h1>

              <p className="text-sm text-slate-600 leading-relaxed">
                {hi
                  ? 'आधिकारिक भारतीय CPCB NAQI डेटा, आपके परिवार की दिनचर्या, इनडोर वायु सुरक्षा, कम-उत्सर्जन जीवनशैली विकल्प और द्विभाषी (हिंदी/अंग्रेजी) एआई सहायक।'
                  : 'Transform real-time CPCB NAQI station telemetry and your household schedule into deterministic daily protection plans, indoor air improvements, low-emission alternatives, and bilingual AI guidance.'}
              </p>

              {/* Live Telemetry Preview Badge on Auth Gate */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-500">
                    {hi ? 'लाइव स्टेशन पूर्वावलोकन:' : 'Live Station Telemetry Preview:'}
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {report.city} — {report.stationName}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    PM2.5: <strong>{report.pollutants.pm25 ?? 'N/A'} µg/m³</strong> • Safer Window:{' '}
                    <strong>{report.saferOutdoorWindow.label.split(' ')[0]}</strong>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase text-slate-500">CPCB NAQI</div>
                  <div className="text-2xl font-extrabold text-slate-900">{report.naqi}</div>
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold border ${catStyle.badge}`}
                  >
                    {report.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Firebase Authentication Card */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-6 space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900">
                  {hi ? 'परिवार सुरक्षा पोर्टल में प्रवेश करें' : 'Sign In to SmogShield AI'}
                </h2>
                <p className="text-xs text-slate-600">
                  {hi
                    ? 'अपने परिवार की प्रोफ़ाइल और दैनिक सुरक्षा प्रगति को Firebase क्लाउड पर सुरक्षित रखने के लिए Google से साइन-इन करें।'
                    : 'Authenticate with Google via Firebase to sync your Family Protection Profile and daily impact ledger across devices.'}
                </p>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-950"
                >
                  <p className="font-bold">
                    {hi ? 'प्रमाणीकरण सूचना' : 'Authentication Notice'}
                  </p>
                  <p className="mt-0.5">{authError}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  data-testid="auth-google-signin-btn"
                  onClick={() => void handleGoogleSignIn()}
                  disabled={isSigningIn}
                  className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-teal-900 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50 transition"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {isSigningIn
                      ? hi
                        ? 'Google से कनेक्ट हो रहा है...'
                        : 'Connecting to Google...'
                      : hi
                        ? 'Google खाते से साइन-इन करें'
                        : 'Continue with Google (Firebase Auth)'}
                  </span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-300" />
                  <span className="flex-shrink mx-3 text-[11px] font-semibold uppercase text-slate-500">
                    {hi ? 'या बिना खाते के अनुभव करें' : 'or instant evaluation'}
                  </span>
                  <div className="flex-grow border-t border-slate-300" />
                </div>

                <button
                  type="button"
                  data-testid="auth-guest-continue-btn"
                  onClick={handleEnterGuestMode}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition"
                >
                  <Users className="h-4 w-4 text-teal-800" aria-hidden="true" />
                  <span>
                    {hi
                      ? 'अतिथि / डेमो परिवार मोड में जारी रखें'
                      : 'Continue in Guest / Demo Family Mode'}
                  </span>
                </button>
              </div>

              <div className="rounded-lg bg-white p-3 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">
                  {hi ? 'गोपनीयता और डेटा सुरक्षा गारंटी:' : 'Privacy & Zero-PII Guarantee:'}
                </div>
                <p>
                  {hi
                    ? 'SmogShield AI केवल आयु समूह, यात्रा माध्यम और घरेलू उपकरण प्राथमिकताएं सहेजता है। कोई अनावश्यक संवेदनशील डेटा एकत्र नहीं किया जाता।'
                    : 'SmogShield AI stores only generalized household routines, commute modes, and protective equipment in Firestore (smogshield-ai-kapil).'}
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-600">
          SmogShield AI • Powered by Firebase Authentication (`smogshield-ai-kapil`) &amp; CPCB NAQI Deterministic Engine
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Header */}
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

          {/* Location Selector, Telemetry Mode & Language Switcher */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <label
                htmlFor={`${uid}-city-select`}
                className="sr-only"
              >
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
              aria-label={hi ? 'वायु गुणवत्ता डेटा रीफ्रेश करें' : 'Refresh air quality data'}
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

      {/* Main Content Landmark */}
      <main id="main-workspace" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 space-y-6">
        {/* Degraded / Error / Stale Alert Banners */}
        {authError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-800 shrink-0 mt-0.5" aria-hidden="true" />
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
            <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" aria-hidden="true" />
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
            <ShieldAlert className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" aria-hidden="true" />
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

        {/* MODULE A: LIVE AIR INTELLIGENCE HERO PANEL */}
        <section
          aria-labelledby="live-air-heading"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          <div className={`p-5 sm:p-6 ${catStyle.bg}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    data-testid="freshness-badge"
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${freshnessBadge.style}`}
                  >
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {freshnessBadge.label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
                    {report.isOfficialStation
                      ? hi
                        ? 'आधिकारिक CPCB स्टेशन'
                        : 'Official CPCB/PCB Station'
                      : hi
                        ? 'द्वितीयक वायुमंडलीय स्रोत (स्पष्ट रूप से चिह्नित)'
                        : 'Documented Secondary Source'}
                  </span>
                </div>
                <h1 id="live-air-heading" className="text-xl sm:text-2xl font-bold tracking-tight">
                  {report.city} — {report.stationName}
                </h1>
                <p className="text-xs text-slate-200 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    {hi ? 'अवलोकन समय:' : 'Observed:'}{' '}
                    {new Date(report.observedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    ({report.dataAgeMinutes} min ago)
                  </span>
                  <span>•</span>
                  <span>
                    {hi ? 'स्रोत:' : 'Source:'} {report.sourceName}
                  </span>
                  <a
                    href={report.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline hover:text-teal-200"
                  >
                    <span>{hi ? 'स्रोत सत्यापित करें' : 'Source Reference'}</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </p>
              </div>

              {/* Primary NAQI Readout */}
              <div className="flex items-center gap-4 rounded-xl bg-black/25 px-4 py-3 border border-white/15">
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider text-slate-200 font-semibold">
                    {hi ? 'भारतीय CPCB NAQI' : 'Indian CPCB NAQI'}
                  </div>
                  <div
                    data-testid="naqi-value"
                    className="text-3xl sm:text-4xl font-extrabold tracking-tight"
                  >
                    {report.naqi}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span
                    data-testid="naqi-category"
                    className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-extrabold ${catStyle.badge}`}
                  >
                    {hi ? catStyle.labelHi : report.category}
                  </span>
                  <span className="text-xs text-slate-200">
                    {hi ? 'मुख्य प्रदूषक:' : 'Dominant:'}{' '}
                    <strong>{report.dominantPollutant}</strong> ({report.whoPm25Multiple}× WHO)
                  </span>
                </div>
              </div>
            </div>

            <p
              aria-live="polite"
              className="mt-4 rounded-xl bg-white/10 p-3.5 text-sm leading-relaxed text-white border border-white/10"
            >
              {hi ? report.healthSummary.hi : report.healthSummary.en}
            </p>
          </div>

          {/* Pollutants Grid + Weather Inversion + Safer Window */}
          <div className="p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {report.subIndices.map((sub) => (
                <div
                  key={sub.pollutant}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>{sub.label}</span>
                    <span>
                      {sub.subIndex !== null ? `NAQI ${sub.subIndex}` : 'N/A'}
                    </span>
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {sub.value !== null ? `${sub.value}` : '—'}{' '}
                    <span className="text-xs font-normal text-slate-600">
                      {sub.unit}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600">
                    {hi ? 'CPCB 24h सीमा:' : 'CPCB limit:'} {sub.safeLimit} {sub.unit}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Weather & Inversion Trap Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Thermometer className="h-4 w-4 text-teal-800" aria-hidden="true" />
                    {hi ? 'मौसम और थर्मल इनवर्जन जोखिम' : 'Meteorology & Smog Inversion Risk'}
                  </h2>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase ${
                      report.weather.inversionRisk === 'high'
                        ? 'bg-rose-100 text-rose-900'
                        : report.weather.inversionRisk === 'moderate'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    {report.weather.inversionRisk} risk
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-slate-800">
                  <span>
                    🌡️ {report.weather.temperatureC ?? '—'}°C
                  </span>
                  <span>
                    💨 {report.weather.windSpeedKmh ?? '—'} km/h
                  </span>
                  <span>
                    💧 {report.weather.humidityPct ?? '—'}% RH
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                  {report.weather.inversionExplanation}
                </p>
              </div>

              {/* Safer Afternoon Window Card */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-teal-950 flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-teal-800" aria-hidden="true" />
                  {hi ? 'आज का सबसे कम प्रदूषण वाला समय' : 'Today’s Lowest-Exposure Window'}
                </h2>
                <div className="mt-1.5 text-sm font-bold text-teal-950">
                  {report.saferOutdoorWindow.label} (Expected NAQI ~{report.saferOutdoorWindow.expectedNaqi})
                </div>
                <p className="mt-1 text-xs text-teal-900 leading-relaxed">
                  {hi
                    ? report.saferOutdoorWindow.recommendationHi
                    : report.saferOutdoorWindow.recommendationEn}
                </p>
              </div>

              {/* Active Household Context & Safety Buffer Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-teal-800" aria-hidden="true" />
                      {hi ? 'सक्रिय परिवार प्रोफ़ाइल' : 'Active Household Context'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="text-xs font-semibold text-teal-800 underline hover:text-teal-950"
                    >
                      {hi ? 'बदलें' : 'Customize'}
                    </button>
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {profile.name} ({profile.householdSize} {hi ? 'सदस्य' : 'members'})
                  </div>
                  <p className="mt-1 text-xs text-slate-700">
                    {hi ? 'सुरक्षा निर्णय NAQI:' : 'Effective Safety NAQI:'}{' '}
                    <strong>{safetyMeta.effectiveNaqi}</strong> — {safetyMeta.conservatismNote}
                  </p>
                </div>
              </div>
            </div>

            {/* 24-Hour Diurnal Exposure Strip */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {hi
                    ? '24-घंटे का प्रदूषण चक्र (सुबह/रात स्मॉग ट्रैप बनाम दोपहर का फैलाव)'
                    : '24-Hour Diurnal Smog Curve (Morning/Night Inversion vs. Midday Solar Dispersion)'}
                </h2>
                <span className="text-xs text-slate-600">
                  {hi ? 'हरा बॉर्डर = अपेक्षाकृत कम जोखिम खिडकी' : 'Teal highlight = Afternoon lowest-exposure window'}
                </span>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                {report.hourlyForecast
                  .filter((_, idx) => idx % 2 === 0)
                  .map((slot) => (
                    <div
                      key={slot.hourLabel}
                      className={`rounded-lg border p-2 text-center ${
                        slot.isSaferWindow
                          ? 'border-teal-600 bg-teal-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="text-[11px] font-semibold text-slate-600">
                        {slot.hourLabel}
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">
                        {slot.naqi}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {slot.pm25} µg
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </section>

        {/* HOUSEHOLD PRESET QUICK-SWITCH BAR */}
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

        {/* PRIMARY MODULE NAVIGATION TABS */}
        <nav
          aria-label={hi ? 'मुख्य मॉड्यूल नेविगेशन' : 'Primary Module Navigation'}
          className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm gap-1"
        >
          {[
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
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`tab-${tab.id}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => setActiveTab(tab.id)}
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
        </nav>

        {/* TAB 1: PERSONALIZED DAILY ACTION PLANNER & SMART EXPOSURE REDUCTION ENGINE */}
        {activeTab === 'planner' && (
          <section aria-labelledby="planner-heading" className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id="planner-heading" className="text-lg font-bold text-slate-900">
                    {hi
                      ? 'व्यक्तिगत दैनिक कार्य योजना और स्मार्ट एक्सपोज़र रिडक्शन इंजन'
                      : 'Personalized Daily Action Planner & Smart Exposure Reduction Engine'}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {hi
                      ? `${report.city} (NAQI ${report.naqi}) और आपके परिवार (${profile.name}) के लिए 7 समय-आधारित सुरक्षा निर्णय।`
                      : `Generated from deterministic CPCB safety thresholds for ${report.city} (NAQI ${report.naqi}) and ${profile.name} (${profile.budgetTier === 'limited_budget' ? 'Low-Cost Resource Mode' : 'Standard Equipment Mode'}).`}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800">
                  {hi ? 'पूरे किए गए कार्य:' : 'Actions Completed Today:'}{' '}
                  <strong>{completedActions.length}</strong>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {dailyPlan.map((slot) => {
                const isDone = completedActions.some((a) => a.actionId === slot.id);
                const basisTag = getBasisLabel(slot.basis, lang);
                return (
                  <article
                    key={slot.id}
                    data-testid={`daily-slot-${slot.slotKey}`}
                    className={`rounded-xl border bg-white p-5 shadow-sm transition ${
                      isDone
                        ? 'border-emerald-500 bg-emerald-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white">
                            {slot.timeWindow}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase ${
                              slot.priority === 'critical'
                                ? 'bg-rose-100 text-rose-950 border border-rose-300'
                                : slot.priority === 'high'
                                  ? 'bg-orange-100 text-orange-950 border border-orange-300'
                                  : 'bg-teal-100 text-teal-950 border border-teal-300'
                            }`}
                          >
                            {slot.priority} priority
                          </span>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${basisTag.cls}`}
                          >
                            {basisTag.text}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                            {slot.ruleId}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 pt-1">
                          {slot.title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        data-testid={`complete-btn-${slot.id}`}
                        onClick={() =>
                          toggleCompleteAction(
                            slot.id,
                            slot.impactActionType,
                            slot.title
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                          isDone
                            ? 'bg-emerald-800 text-white'
                            : 'border border-teal-800 bg-teal-50 text-teal-950 hover:bg-teal-100'
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {isDone
                            ? hi
                              ? 'पूरा किया गया (ट्रैक में जुड़ा)'
                              : 'Completed (Logged in Tracker)'
                            : hi
                              ? 'इस कार्य को पूरा चिह्नित करें'
                              : 'Mark Action Completed'}
                        </span>
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                      <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                        <div className="font-bold text-slate-900 uppercase tracking-wide mb-1">
                          {hi ? '1. क्या करें (What to do)' : '1. What To Do'}
                        </div>
                        <p className="text-slate-800 leading-relaxed">{slot.whatToDo}</p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                        <div className="font-bold text-slate-900 uppercase tracking-wide mb-1">
                          {hi ? '2. यह क्यों महत्वपूर्ण है (Why it matters)' : '2. Why It Matters'}
                        </div>
                        <p className="text-slate-800 leading-relaxed">{slot.whyItMatters}</p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                        <div className="font-bold text-slate-900 uppercase tracking-wide mb-1">
                          {hi ? '3. कब करें (When to do it)' : '3. When To Do It'}
                        </div>
                        <p className="text-slate-800 leading-relaxed font-semibold">
                          {slot.whenToDoIt}
                        </p>
                        <p className="mt-1 text-teal-900 font-semibold">
                          ~{slot.estimatedExposureReductionPct}% exposure reduction potential
                        </p>
                      </div>

                      <div className="rounded-lg bg-teal-50/70 p-3 border border-teal-200">
                        <div className="font-bold text-teal-950 uppercase tracking-wide mb-1">
                          {hi ? '4. सुरक्षित विकल्प (Safer Alternative)' : '4. Safer Alternative'}
                        </div>
                        <p className="text-teal-950 leading-relaxed">{slot.alternative}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 2: INDOOR AIR PROTECTION ASSISTANT */}
        {activeTab === 'indoor' && (
          <section aria-labelledby="indoor-heading" className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 id="indoor-heading" className="text-lg font-bold text-slate-900">
                {hi
                  ? 'इनडोर वायु सुरक्षा सहायक (वैज्ञानिक सीमाओं और किफायती विकल्पों सहित)'
                  : 'Indoor Air Protection Assistant — Evidence-Based Guidance & Explicit Limitations'}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                {hi
                  ? 'वेंटिलेशन समय, दरवाजे/खिड़की सीलिंग, रसोई धुआं, गीली सफाई, HEPA फिल्टर और कम बजट वाले परिवारों के लिए व्यावहारिक उपाय।'
                  : 'Covers ventilation timing, building envelope sealing, cooking emissions, wet dust suppression, respirator fit, and budget-friendly protections without false product claims.'}
              </p>
            </div>

            {/* Scientific Myth vs Reality Callout */}
            <div className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-xs text-amber-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <Info className="h-4 w-4 text-amber-800" aria-hidden="true" />
                <span>
                  {hi
                    ? 'वैज्ञानिक सत्यता सूचना: क्या काम करता है और क्या नहीं'
                    : 'Scientific Honesty Notice: What Works vs. Common Household Myths'}
                </span>
              </div>
              <p>
                {hi
                  ? '• इनडोर पौधे (Houseplants), पानी के कटोरे, हिमालयन सॉल्ट लैंप या कपूर जलाने से कमरे का PM2.5 कम नहीं होता (कपूर/अगरबत्ती जलाने से PM2.5 और बढ़ता है)।'
                  : '• Indoor houseplants, bowls of water, salt lamps, or essential oil diffusers DO NOT meaningfully reduce acute winter PM2.5 (their Clean Air Delivery Rate is nearly zero compared to room leakage).'}
              </p>
              <p>
                {hi
                  ? '• गैस चूल्हा, गीजर या कोयले की अंगीठी जलते समय कमरे को कभी भी पूरी तरह एयर-टाइट बंद न करें — इससे जानलेवा कार्बन मोनोऑक्साइड (CO) जमा हो सकती है।'
                  : '• NEVER seal ventilation completely in a room with an operating LPG stove, gas geyser, or coal/wood brazier (angithi) due to lethal Carbon Monoxide (CO) poisoning risk.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {indoorGuidance.map((item) => {
                const basisTag = getBasisLabel(item.basis, lang);
                return (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-md bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-900 border border-teal-200 uppercase">
                          {item.category.replace('_', ' ')}
                        </span>
                        <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${basisTag.cls}`}>
                          {basisTag.text}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-800 leading-relaxed">
                        <strong>{hi ? 'क्या करें:' : 'Action:'}</strong> {item.recommendation}
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        <strong>{hi ? 'यह कैसे काम करता है:' : 'How it reduces exposure:'}</strong>{' '}
                        {item.mechanism}
                      </p>
                    </div>

                    <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-950">
                      <strong>{hi ? 'सीमा (Limitation):' : 'Known Limitation:'}</strong>{' '}
                      {item.limitation}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 3: LOW-EMISSION LIFESTYLE PLANNER */}
        {activeTab === 'lifestyle' && (
          <section aria-labelledby="lifestyle-heading" className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h2 id="lifestyle-heading" className="text-lg font-bold text-slate-900">
                {hi
                  ? 'कम-उत्सर्जन जीवनशैली योजनाकार (Low-Emission Lifestyle Planner)'
                  : 'Low-Emission Lifestyle Planner & Sustainable Alternatives'}
              </h2>

              {/* Mandatory Distinction Explainer Box */}
              <div
                data-testid="outcome-distinction-card"
                className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1 text-xs"
              >
                <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-3">
                  <div className="font-bold text-teal-950">
                    {hi
                      ? '1. व्यक्तिगत संपर्क कम करना (Reducing Personal Exposure)'
                      : '1. Reducing Personal Exposure'}
                  </div>
                  <p className="mt-1 text-teal-900">
                    {hi
                      ? 'आपके परिवार के फेफड़ों में जाने वाले PM2.5 की मात्रा घटाना (जैसे N95 मास्क पहनना, सुबह की दौड़ टालना)। यह बाहरी प्रदूषण नहीं घटाता, पर आपको बचाता है।'
                      : 'Protects your family’s lungs today (e.g., wearing an N95 mask, shifting workouts indoors). Does not lower outdoor smog, but cuts inhaled dose.'}
                  </p>
                </div>

                <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3">
                  <div className="font-bold text-sky-950">
                    {hi
                      ? '2. इनडोर वायु सुधारना (Improving Indoor Air Quality)'
                      : '2. Improving Indoor Air Quality'}
                  </div>
                  <p className="mt-1 text-sky-900">
                    {hi
                      ? 'घर के अंदर बनने या घुसने वाले धुएं को रोकना (रसोई एग्जॉस्ट, गीला पोछा, खिड़की सीलिंग, HEPA प्यूरीफायर)।'
                      : 'Lowers particulate levels inside your home sanctuary (e.g., kitchen exhaust capture, wet mopping, window draft sealing, HEPA filtration).'}
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                  <div className="font-bold text-emerald-950">
                    {hi
                      ? '3. उत्सर्जन कम करना (Reducing Outdoor Emissions)'
                      : '3. Reducing Outdoor Emissions'}
                  </div>
                  <p className="mt-1 text-emerald-900">
                    {hi
                      ? 'वातावरण में छोड़े जाने वाले नए धुएं को घटाना (कारपूलिंग, मेट्रो, ज़ीरो-आइडलिंग, कचरा/अलाव न जलाना)।'
                      : 'Shrinks the pollution generated by your household and community (e.g., carpooling, Metro switch, zero vehicle idling, stopping biomass burning).'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {lowEmissionAlternatives.map((alt) => {
                const isLogged = completedActions.some((a) => a.actionId === alt.id);
                return (
                  <article
                    key={alt.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="inline-block rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-950 border border-emerald-300">
                          {alt.outcomeDistinction}
                        </span>
                        <h3 className="mt-1.5 text-base font-bold text-slate-900">
                          {hi ? 'उच्च-उत्सर्जन गतिविधि:' : 'Instead of:'}{' '}
                          <span className="line-through text-slate-600 font-normal">
                            {alt.highEmissionActivity}
                          </span>
                        </h3>
                        <p className="text-sm font-bold text-teal-900 mt-0.5">
                          {hi ? 'सतत विकल्प:' : 'Choose:'} {alt.sustainableAlternative}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toggleCompleteAction(
                            alt.id,
                            alt.impactActionType,
                            alt.sustainableAlternative
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                          isLogged
                            ? 'bg-emerald-800 text-white'
                            : 'border border-teal-800 bg-teal-50 text-teal-950 hover:bg-teal-100'
                        }`}
                      >
                        <Car className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {isLogged
                            ? hi
                              ? 'ट्रैकर में दर्ज'
                              : 'Logged in Impact Tracker'
                            : hi
                              ? 'आज यह विकल्प अपनाया'
                              : 'Log Sustainable Choice'}
                        </span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed">
                      <strong>{hi ? 'प्रभाव तंत्र:' : 'Mechanism:'}</strong> {alt.mechanism}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-900">
                        Est. CO₂e Avoided: ~{alt.co2SavedGramsPerAction} g
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-900">
                        Est. Direct PM2.5 Emission Avoided: ~{alt.pm25TailpipeSavedMgPerAction} mg
                      </span>
                      <span className="rounded-lg bg-teal-50 px-2.5 py-1 font-semibold text-teal-950 border border-teal-200">
                        Personal Exposure Reduction: ~{alt.personalExposureDeltaPct}%
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {alt.methodologyAndAssumptions}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 4: GENAI FAMILY ASSISTANT */}
        {activeTab === 'assistant' && (
          <section aria-labelledby="assistant-heading" className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 id="assistant-heading" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-teal-800" aria-hidden="true" />
                    <span>
                      {hi
                        ? 'जेन-एआई परिवार सहायक (हिंदी और अंग्रेजी)'
                        : 'GenAI Family Protection Assistant (Bilingual EN / HI)'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {hi
                      ? `${report.city} (NAQI ${report.naqi}, PM2.5 ${report.pollutants.pm25 ?? 'N/A'} µg/m³) और आपके परिवार प्रोफ़ाइल से जुड़ा संदर्भ-जागरूक सहायक।`
                      : `Context-grounded in ${report.city} (${report.stationName}, NAQI ${report.naqi}) and ${profile.name}. Enforces deterministic safety guardrails.`}
                  </p>
                </div>
              </div>

              {/* Quick Prompt Chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  hi
                    ? 'क्या आज बाहर व्यायाम या दौड़ना उचित है?'
                    : 'Is it sensible to exercise outdoors today?',
                  hi
                    ? 'आज बच्चों के स्कूल जाने की योजना कैसे बनाएं?'
                    : "How should I plan my child's school commute today?",
                  hi
                    ? 'अगर मैं एयर प्यूरीफायर नहीं खरीद सकता तो क्या करूं?'
                    : 'What can I do if I cannot afford an air purifier?',
                  hi
                    ? 'हमारा मोहल्ला और सोसाइटी प्रदूषण कैसे कम कर सकते हैं?'
                    : 'How can our neighbourhood reduce winter pollution?',
                  hi
                    ? 'अस्थमा और खांसी के लक्षणों में क्या सावधानी बरतें?'
                    : 'What precautions should we take for asthma or coughing symptoms?',
                ].map((promptText) => (
                  <button
                    key={promptText}
                    type="button"
                    onClick={() => void handleSendAssistantQuestion(promptText)}
                    disabled={isSendingChat}
                    className="rounded-full border border-teal-300 bg-teal-50/70 px-3 py-1.5 text-xs font-semibold text-teal-950 hover:bg-teal-100 disabled:opacity-50"
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages Container */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div
                aria-live="polite"
                data-testid="assistant-messages"
                className="space-y-4 max-h-[520px] overflow-y-auto pr-1"
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl p-4 text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'ml-auto max-w-2xl bg-teal-900 text-white'
                        : 'mr-auto max-w-4xl border border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 text-[11px] opacity-85">
                      <span className="font-bold uppercase">
                        {msg.role === 'user'
                          ? hi
                            ? 'आपका प्रश्न'
                            : 'Your Household Question'
                          : 'SmogShield AI'}
                      </span>
                      {msg.role === 'assistant' && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-white px-2 py-0.5 font-semibold text-slate-800 border border-slate-300">
                            {msg.providerMode === 'gemini_live'
                              ? 'Gemini Live + Safety Guardrails'
                              : 'Deterministic Rule-Grounded Engine'}
                          </span>
                          {msg.sourceAttribution && (
                            <span className="rounded bg-teal-100 px-2 py-0.5 font-semibold text-teal-950">
                              {msg.sourceAttribution}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="whitespace-pre-line">{msg.content}</div>
                  </div>
                ))}
              </div>

              {chatError && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-950"
                >
                  {chatError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendAssistantQuestion();
                }}
                className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200"
              >
                <label htmlFor={`${uid}-chat-input`} className="sr-only">
                  {hi ? 'अपना प्रश्न लिखें' : 'Ask SmogShield AI a question'}
                </label>
                <input
                  id={`${uid}-chat-input`}
                  data-testid="assistant-input"
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    hi
                      ? 'हिंदी या अंग्रेजी में पूछें (जैसे: क्या आज बच्चों को पार्क भेजना सुरक्षित है?)...'
                      : 'Ask in English or Hindi (e.g., Is it safe to open windows right now?)...'
                  }
                  maxLength={600}
                  disabled={isSendingChat}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-teal-700"
                />
                <button
                  type="submit"
                  data-testid="assistant-send-btn"
                  disabled={isSendingChat || !chatInput.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {isSendingChat
                      ? hi
                        ? 'विश्लेषण जारी...'
                        : 'Analyzing...'
                      : hi
                        ? 'पूछें'
                        : 'Ask Assistant'}
                  </span>
                </button>
              </form>
            </div>
          </section>
        )}

        {/* TAB 5: POLLUTION IMPACT & PROGRESS TRACKER */}
        {activeTab === 'impact' && (
          <section aria-labelledby="impact-heading" className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 id="impact-heading" className="text-lg font-bold text-slate-900">
                {hi
                  ? 'प्रदूषण प्रभाव और प्रगति ट्रैकर (पारदर्शी गणना एवं सीमाएं)'
                  : 'Honest Pollution Impact & Household Protection Tracker'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {hi
                  ? 'कोई काल्पनिक संख्या नहीं — केवल आपके द्वारा पूरे किए गए कार्यों और प्रकाशित वैज्ञानिक सूत्रों पर आधारित अनुमान।'
                  : 'Zero manufactured numbers. Every estimated benefit is computed directly from actions you mark completed, with full formula and assumption disclosure.'}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-600">
                    {hi ? 'कुल पूरे किए गए कार्य' : 'Total Actions Completed'}
                  </div>
                  <div
                    data-testid="impact-total-actions"
                    className="mt-1 text-2xl font-extrabold text-slate-900"
                  >
                    {impactSummary.totalActionsCompleted}
                  </div>
                </div>

                <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
                  <div className="text-xs font-semibold text-teal-900">
                    {hi ? 'अनुमानित PM2.5 श्वसन बचाव' : 'Est. Inhaled PM2.5 Dose Avoided'}
                  </div>
                  <div
                    data-testid="impact-pm25-avoided"
                    className="mt-1 text-2xl font-extrabold text-teal-950"
                  >
                    {impactSummary.estimatedInhaledPm25AvoidedUg} µg
                  </div>
                  <div className="text-[11px] text-teal-800 mt-0.5">
                    Personal Exposure Reduction
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="text-xs font-semibold text-emerald-900">
                    {hi ? 'अनुमानित CO₂e उत्सर्जन बचत' : 'Est. Tailpipe CO₂e Avoided'}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-emerald-950">
                    {impactSummary.estimatedCo2AvoidedGrams} g
                  </div>
                  <div className="text-[11px] text-emerald-800 mt-0.5">
                    Outdoor Emission Reduction
                  </div>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                  <div className="text-xs font-semibold text-sky-900">
                    {hi ? 'अनुमानित वाहन PM2.5 उत्सर्जन बचत' : 'Est. Tailpipe PM2.5 Avoided'}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-sky-950">
                    {impactSummary.estimatedTailpipePm25AvoidedMg} mg
                  </div>
                  <div className="text-[11px] text-sky-800 mt-0.5">
                    ARAI Urban Cycle Factor
                  </div>
                </div>
              </div>
            </div>

            {/* Completed Actions List or Empty State */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                {hi ? 'दर्ज किए गए पारिवारिक कार्य' : 'Completed Household Actions Ledger'}
              </h3>
              {completedActions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-600">
                  {hi
                    ? 'अभी तक कोई कार्य पूरा चिह्नित नहीं किया गया है। "दैनिक कार्य योजना" या "कम-उत्सर्जन जीवनशैली" टैब में जाकर किसी कार्य को पूरा चिह्नित करें।'
                    : 'No actions marked completed yet. Visit the "Daily Action Planner" or "Low-Emission Lifestyle" tab and mark an action completed to see real-time physics calculations.'}
                </div>
              ) : (
                <ul className="divide-y divide-slate-200 text-xs">
                  {completedActions.map((act) => (
                    <li
                      key={act.id}
                      className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{act.title}</span>
                        <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                          {act.actionType.replace(/_/g, ' ')} • NAQI {act.aqiAtCompletion}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          toggleCompleteAction(act.actionId, act.actionType, act.title)
                        }
                        className="text-rose-800 underline hover:text-rose-950 font-semibold"
                      >
                        {hi ? 'हटाएं' : 'Remove'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Methodology & Limitations Disclosure */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {hi ? 'गणना पद्धति (Methodology & Equations)' : 'Documented Calculation Methodology'}
                </h3>
                <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700">
                  {impactSummary.methodologyDisclosures.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-5 shadow-sm space-y-2">
                <h3 className="text-sm font-bold text-amber-950">
                  {hi ? 'सीमाएं और मान्यताएं (Assumptions & Limitations)' : 'Assumptions & Scientific Limitations'}
                </h3>
                <ul className="list-disc pl-4 space-y-1.5 text-xs text-amber-950">
                  {impactSummary.limitations.map((lim) => (
                    <li key={lim}>{lim}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* TAB 6: COMMUNITY ACTION HUB */}
        {activeTab === 'community' && (
          <section aria-labelledby="community-heading" className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 id="community-heading" className="text-lg font-bold text-slate-900">
                {hi
                  ? 'सामुदायिक पहल केंद्र (Community Action Hub)'
                  : 'Community Action Hub — Practical Neighborhood Smog Initiatives'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {hi
                  ? 'स्कूलों, RWA सोसाइटियों और पड़ोसियों के साथ मिलकर स्थानीय प्रदूषण स्रोतों को कम करने के व्यावहारिक कदम।'
                  : 'Actionable, low-friction initiatives for Resident Welfare Associations (RWAs), school gates, and commuter blocks.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {initiatives.map((init) => {
                const hasPledged = pledgedIds.includes(init.id);
                const steps = hi ? init.actionStepsHi : init.actionStepsEn;
                return (
                  <article
                    key={init.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-md bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-900 border border-teal-200">
                          {init.targetGroup}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          {init.householdsPledged} {hi ? 'परिवार जुड़े' : 'households participating'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">
                        {hi ? init.titleHi : init.titleEn}
                      </h3>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {hi ? init.summaryHi : init.summaryEn}
                      </p>
                      <div className="pt-1">
                        <div className="text-xs font-bold text-slate-900 mb-1">
                          {hi ? 'कैसे शुरू करें:' : 'How Your Household Can Participate:'}
                        </div>
                        <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-800">
                          {steps.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-teal-900">
                        {init.impactMetricLabel}
                      </span>
                      <button
                        type="button"
                        data-testid={`pledge-btn-${init.id}`}
                        onClick={() => void handleCommunityPledge(init.id)}
                        disabled={hasPledged}
                        className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                          hasPledged
                            ? 'bg-emerald-800 text-white'
                            : 'bg-teal-900 text-white hover:bg-teal-800'
                        }`}
                      >
                        {hasPledged
                          ? hi
                            ? '✓ आपका परिवार शामिल है'
                            : '✓ Household Joined'
                          : hi
                            ? 'इस पहल में शामिल हों'
                            : 'Join Initiative'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 7: FAMILY PROTECTION PROFILE CONFIGURATOR */}
        {activeTab === 'profile' && (
          <section aria-labelledby="profile-heading" className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <div>
                <h2 id="profile-heading" className="text-lg font-bold text-slate-900">
                  {hi
                    ? 'परिवार सुरक्षा प्रोफ़ाइल (कोई व्यक्तिगत पहचान डेटा आवश्यक नहीं)'
                    : 'Family Protection Profile (Privacy-First — Zero PII Required)'}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {hi
                    ? 'केवल वे विवरण जो आपकी दैनिक कार्य योजना और सुरक्षा नियमों को बेहतर बनाते हैं। कोई खाता या ईमेल आवश्यक नहीं।'
                    : 'Captures only household characteristics needed to tailor exposure and low-emission recommendations. Stored locally in your browser with instant guest/preset support.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                {/* Profile Name */}
                <div>
                  <label
                    htmlFor={`${uid}-prof-name`}
                    className="block font-bold text-slate-800 mb-1"
                  >
                    {hi ? 'प्रोफ़ाइल लेबल' : 'Household Profile Label'}
                  </label>
                  <input
                    id={`${uid}-prof-name`}
                    type="text"
                    value={profile.name}
                    onChange={(e) =>
                      saveProfile({ ...profile, name: e.target.value.slice(0, 70) })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                {/* Household Size */}
                <div>
                  <label
                    htmlFor={`${uid}-prof-size`}
                    className="block font-bold text-slate-800 mb-1"
                  >
                    {hi ? 'परिवार के सदस्यों की संख्या' : 'Household Size'}
                  </label>
                  <input
                    id={`${uid}-prof-size`}
                    type="number"
                    min={1}
                    max={20}
                    value={profile.householdSize}
                    onChange={(e) =>
                      saveProfile({
                        ...profile,
                        householdSize: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                {/* Budget / Resource Tier */}
                <div>
                  <label
                    htmlFor={`${uid}-prof-budget`}
                    className="block font-bold text-slate-800 mb-1"
                  >
                    {hi ? 'संसाधन / बजट स्तर' : 'Household Resource Mode'}
                  </label>
                  <select
                    id={`${uid}-prof-budget`}
                    data-testid="profile-budget-tier"
                    value={profile.budgetTier}
                    onChange={(e) =>
                      saveProfile({
                        ...profile,
                        budgetTier: e.target.value as BudgetTier,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="standard">
                      {hi ? 'मानक (प्यूरीफायर / N95 उपलब्ध)' : 'Standard (Purifier / N95 Capable)'}
                    </option>
                    <option value="limited_budget">
                      {hi
                        ? 'सीमित बजट (कम लागत वाले घरेलू उपाय)'
                        : 'Limited Budget (Low-Cost Non-Purifier Solutions)'}
                    </option>
                  </select>
                </div>

                {/* Primary Commute Mode */}
                <div>
                  <label
                    htmlFor={`${uid}-prof-commute`}
                    className="block font-bold text-slate-800 mb-1"
                  >
                    {hi ? 'मुख्य यात्रा माध्यम' : 'Primary Commute / School Transport'}
                  </label>
                  <select
                    id={`${uid}-prof-commute`}
                    value={profile.primaryCommuteMode}
                    onChange={(e) =>
                      saveProfile({
                        ...profile,
                        primaryCommuteMode: e.target.value as CommuteMode,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="two_wheeler">Two-Wheeler (Bike / Scooter)</option>
                    <option value="auto_bus">Auto-Rickshaw / City Bus</option>
                    <option value="metro">Metro Rail / Suburban Train</option>
                    <option value="car">Enclosed Car</option>
                    <option value="walk_cycle">Walking / Cycling</option>
                    <option value="work_from_home">Work / Study From Home</option>
                  </select>
                </div>

                {/* Commute Start Hour */}
                <div>
                  <label
                    htmlFor={`${uid}-prof-hour`}
                    className="block font-bold text-slate-800 mb-1"
                  >
                    {hi ? 'स्कूल/ऑफिस निकलने का समय (घंटा 0-23)' : 'Morning Departure Hour (0–23)'}
                  </label>
                  <input
                    id={`${uid}-prof-hour`}
                    type="number"
                    min={5}
                    max={22}
                    value={profile.schoolOrWorkStartHour}
                    onChange={(e) =>
                      saveProfile({
                        ...profile,
                        schoolOrWorkStartHour: Math.max(
                          0,
                          Math.min(23, Number(e.target.value) || 8)
                        ),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                {/* Cooking Setup */}
                <div>
                  <label
                    htmlFor={`${uid}-prof-cooking`}
                    className="block font-bold text-slate-800 mb-1"
                  >
                    {hi ? 'रसोई ईंधन और वेंटिलेशन' : 'Kitchen Fuel & Ventilation'}
                  </label>
                  <select
                    id={`${uid}-prof-cooking`}
                    value={profile.cookingSetup}
                    onChange={(e) =>
                      saveProfile({
                        ...profile,
                        cookingSetup: e.target.value as CookingSetup,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="lpg_exhaust">LPG Stove + Exhaust Fan / Vented Chimney</option>
                    <option value="lpg_no_exhaust">LPG Stove (No Exhaust Fan)</option>
                    <option value="electric_induction">Electric Induction / Low-Smoke</option>
                    <option value="biomass_coal">Biomass / Wood / Coal Chulha</option>
                  </select>
                </div>
              </div>

              {/* Age Groups Checkboxes */}
              <div className="pt-2">
                <div className="text-xs font-bold text-slate-800 mb-2">
                  {hi ? 'परिवार में शामिल आयु वर्ग:' : 'Age Groups Present in Household:'}
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  {(
                    [
                      { id: 'infants', label: 'Infants / Toddlers (<5 yrs)' },
                      { id: 'children', label: 'School-Age Children (5–16 yrs)' },
                      { id: 'adults', label: 'Adults (17–59 yrs)' },
                      { id: 'elderly', label: 'Elderly / Seniors (60+ yrs)' },
                    ] as { id: AgeGroup; label: string }[]
                  ).map((ag) => {
                    const checked = profile.ageGroups.includes(ag.id);
                    return (
                      <label
                        key={ag.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-medium cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? profile.ageGroups.filter((x) => x !== ag.id)
                              : [...profile.ageGroups, ag.id];
                            if (next.length > 0) {
                              saveProfile({ ...profile, ageGroups: next });
                            }
                          }}
                          className="rounded border-slate-400 text-teal-800"
                        />
                        <span>{ag.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Protective Equipment Checkboxes */}
              <div className="pt-2">
                <div className="text-xs font-bold text-slate-800 mb-2">
                  {hi ? 'उपलब्ध सुरक्षा उपकरण:' : 'Available Protective Equipment:'}
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  {(
                    [
                      { id: 'n95_masks', label: 'N95 / FFP2 / KN95 Respirators' },
                      { id: 'hepa_purifier', label: 'HEPA Room Air Purifier' },
                      { id: 'exhaust_fan', label: 'Kitchen / Bathroom Exhaust Fan' },
                      { id: 'wet_mop_cleaning', label: 'Wet Mop & Microfiber Cleaning' },
                      { id: 'cloth_masks_only', label: 'Cloth / Surgical Masks Only' },
                    ] as { id: ProtectiveEquipment; label: string }[]
                  ).map((eq) => {
                    const checked = profile.equipment.includes(eq.id);
                    return (
                      <label
                        key={eq.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-medium cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? profile.equipment.filter((x) => x !== eq.id)
                              : [...profile.equipment, eq.id];
                            saveProfile({ ...profile, equipment: next });
                          }}
                          className="rounded border-slate-400 text-teal-800"
                        />
                        <span>{eq.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Respiratory sensitivity toggle */}
              <div className="pt-2">
                <label className="inline-flex items-center gap-2.5 text-xs font-bold text-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.hasRespiratorySensitivity}
                    onChange={(e) =>
                      saveProfile({
                        ...profile,
                        hasRespiratorySensitivity: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-slate-400 text-teal-800"
                  />
                  <span>
                    {hi
                      ? 'परिवार के किसी सदस्य को अस्थमा, ब्रोंकाइटिस, एलर्जी या हृदय संबंधी संवेदनशीलता है (+35 NAQI सुरक्षा बफर जोड़ता है)'
                      : 'Household member has asthma, bronchitis, sinus allergy, or cardiovascular sensitivity (Activates +35 NAQI deterministic safety buffer)'}
                  </span>
                </label>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Semantic Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-xs text-slate-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-teal-800" aria-hidden="true" />
            <span>
              <strong>SmogShield AI</strong> • Indian CPCB NAQI Deterministic Decision Engine & Family Assistant
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
