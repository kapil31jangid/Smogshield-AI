'use client';

import React from 'react';
import {
  Cloud,
  Languages,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Language } from '@/types/smogshield';
import { SimulateMode } from '../hooks/useSmogShieldController';

export interface LocationSummary {
  id: string;
  city: string;
  state: string;
  stationName: string;
  hasLocalOfficialStation: boolean;
}

interface WorkspaceHeaderProps {
  uid: string;
  lang: Language;
  locations: LocationSummary[];
  selectedCity: string;
  simulateMode: SimulateMode;
  isLoadingAqi: boolean;
  authUser: { uid: string; displayName: string | null; email: string | null } | null;
  cloudSynced: boolean;
  isSigningIn: boolean;
  onCityChange: (cityId: string) => void;
  onSimulateChange: (mode: SimulateMode) => void;
  onRefresh: () => void;
  onToggleLanguage: () => void;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onExitGuestMode: () => void;
}

/**
 * @architecture SOLID (Single Responsibility Principle)
 * Top sticky navigation bar handling location/telemetry controls, language switch,
 * and Firebase Auth / Guest session indicators.
 */
export default function WorkspaceHeader({
  uid,
  lang,
  locations,
  selectedCity,
  simulateMode,
  isLoadingAqi,
  authUser,
  cloudSynced,
  isSigningIn,
  onCityChange,
  onSimulateChange,
  onRefresh,
  onToggleLanguage,
  onGoogleSignIn,
  onSignOut,
  onExitGuestMode,
}: WorkspaceHeaderProps) {
  const hi = lang === 'hi';

  return (
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
              onChange={(e) => onCityChange(e.target.value)}
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
              onChange={(e) => onSimulateChange(e.target.value as SimulateMode)}
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
            onClick={onRefresh}
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
            onClick={onToggleLanguage}
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
                onClick={onSignOut}
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
                onClick={onGoogleSignIn}
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
                onClick={onExitGuestMode}
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
  );
}
