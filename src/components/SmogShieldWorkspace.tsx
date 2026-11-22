'use client';

import React, { useId } from 'react';
import {
  Activity,
  AlertTriangle,
  HeartPulse,
  Home,
  Leaf,
  MessageSquare,
  ShieldAlert,
  Sliders,
  Users,
  Wind,
} from 'lucide-react';
import { AirQualityReport } from '@/types/smogshield';
import { HOUSEHOLD_PRESETS } from '@/lib/engine/recommendations';
import {
  ActiveTab,
  useSmogShieldController,
} from './hooks/useSmogShieldController';
import AuthGateScreen from './modules/AuthGateScreen';
import WorkspaceHeader, { LocationSummary } from './modules/WorkspaceHeader';
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

interface Props {
  initialReport: AirQualityReport;
  locations: LocationSummary[];
}

/**
 * @architecture SOLID (Single Responsibility & Composition)
 * Thin top-level workspace shell coordinating the Auth Gate, Header, Hero Telemetry,
 * WAI-ARIA Tablist with full keyboard navigation (Left/Right/Home/End), and 7 module panels.
 */
export default function SmogShieldWorkspace({ initialReport, locations }: Props) {
  const uid = useId();
  const ctrl = useSmogShieldController(initialReport);
  const hi = ctrl.lang === 'hi';

  if (ctrl.authInitializing) {
    return (
      <div
        id="main-workspace"
        role="status"
        aria-live="polite"
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

  if (!ctrl.authUser && !ctrl.guestSessionActive) {
    return (
      <AuthGateScreen
        report={ctrl.report}
        lang={ctrl.lang}
        isSigningIn={ctrl.isSigningIn}
        authError={ctrl.authError}
        onToggleLanguage={ctrl.toggleLanguage}
        onGoogleSignIn={() => void ctrl.handleGoogleSignIn()}
        onEnterGuestMode={() => {
          ctrl.setAuthError(null);
          ctrl.setGuestSessionActive(true);
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
      labelEn: `5. Impact Tracker (${ctrl.completedActions.length})`,
      labelHi: `5. प्रभाव ट्रैकर (${ctrl.completedActions.length})`,
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

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = tabs[(index + 1) % tabs.length];
      if (next) ctrl.setActiveTab(next.id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = tabs[(index - 1 + tabs.length) % tabs.length];
      if (prev) ctrl.setActiveTab(prev.id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      const first = tabs[0];
      if (first) ctrl.setActiveTab(first.id);
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = tabs[tabs.length - 1];
      if (last) ctrl.setActiveTab(last.id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <WorkspaceHeader
        uid={uid}
        lang={ctrl.lang}
        locations={locations}
        selectedCity={ctrl.selectedCity}
        simulateMode={ctrl.simulateMode}
        isLoadingAqi={ctrl.isLoadingAqi}
        authUser={ctrl.authUser}
        cloudSynced={ctrl.cloudSynced}
        isSigningIn={ctrl.isSigningIn}
        onCityChange={ctrl.handleCityChange}
        onSimulateChange={ctrl.handleSimulateChange}
        onRefresh={() => void ctrl.fetchAirQuality(ctrl.selectedCity, ctrl.simulateMode)}
        onToggleLanguage={ctrl.toggleLanguage}
        onGoogleSignIn={() => void ctrl.handleGoogleSignIn()}
        onSignOut={() => void ctrl.handleFirebaseSignOut()}
        onExitGuestMode={() => ctrl.setGuestSessionActive(false)}
      />

      <main
        id="main-workspace"
        aria-busy={ctrl.isLoadingAqi}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 space-y-6"
      >
        {ctrl.authError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle
                className="h-4 w-4 text-amber-800 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{ctrl.authError}</span>
            </div>
            <button
              type="button"
              onClick={() => ctrl.setAuthError(null)}
              className="font-bold underline"
            >
              {hi ? 'बंद करें' : 'Dismiss'}
            </button>
          </div>
        )}

        {ctrl.aqiError && (
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
              <p>{ctrl.aqiError}</p>
            </div>
          </div>
        )}

        {ctrl.report.degradedReason && (
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
              <p className="mt-0.5">{ctrl.report.degradedReason}</p>
            </div>
          </div>
        )}

        <LiveAirHeroPanel
          report={ctrl.report}
          profile={ctrl.profile}
          lang={ctrl.lang}
          safetyMeta={ctrl.safetyMeta}
          onCustomizeProfile={() => ctrl.setActiveTab('profile')}
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
              const isSelected = ctrl.profile.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`preset-${preset.id}`}
                  aria-pressed={isSelected}
                  onClick={() => ctrl.saveProfile(preset)}
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

        <div
          role="tablist"
          aria-label={hi ? 'मुख्य मॉड्यूल नेविगेशन' : 'Primary Module Navigation'}
          className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm gap-1"
        >
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const active = ctrl.activeTab === tab.id;
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
                onClick={() => ctrl.setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
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

        {ctrl.activeTab === 'planner' && (
          <DailyPlannerModule
            report={ctrl.report}
            profile={ctrl.profile}
            dailyPlan={ctrl.dailyPlan}
            whatIfScenarios={ctrl.whatIfScenarios}
            completedActions={ctrl.completedActions}
            lang={ctrl.lang}
            onToggleCompleteAction={ctrl.toggleCompleteAction}
          />
        )}

        {ctrl.activeTab === 'indoor' && (
          <IndoorProtectionModule indoorGuidance={ctrl.indoorGuidance} lang={ctrl.lang} />
        )}

        {ctrl.activeTab === 'lifestyle' && (
          <LowEmissionLifestyleModule
            lowEmissionAlternatives={ctrl.lowEmissionAlternatives}
            completedActions={ctrl.completedActions}
            lang={ctrl.lang}
            onToggleCompleteAction={ctrl.toggleCompleteAction}
          />
        )}

        {ctrl.activeTab === 'assistant' && (
          <AssistantModule
            uid={uid}
            report={ctrl.report}
            profile={ctrl.profile}
            lang={ctrl.lang}
            messages={ctrl.messages}
            chatInput={ctrl.chatInput}
            isSendingChat={ctrl.isSendingChat}
            chatError={ctrl.chatError}
            onChatInputChange={ctrl.setChatInput}
            onSendQuestion={(qText) => void ctrl.handleSendAssistantQuestion(qText)}
          />
        )}

        {ctrl.activeTab === 'impact' && (
          <ImpactTrackerModule
            impactSummary={ctrl.impactSummary}
            completedActions={ctrl.completedActions}
            lang={ctrl.lang}
            onToggleCompleteAction={ctrl.toggleCompleteAction}
          />
        )}

        {ctrl.activeTab === 'community' && (
          <CommunityActionModule
            initiatives={ctrl.initiatives}
            pledgedIds={ctrl.pledgedIds}
            lang={ctrl.lang}
            onPledge={(id) => void ctrl.handleCommunityPledge(id)}
          />
        )}

        {ctrl.activeTab === 'profile' && (
          <ProfileConfiguratorModule
            uid={uid}
            profile={ctrl.profile}
            lang={ctrl.lang}
            onSaveProfile={ctrl.saveProfile}
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
