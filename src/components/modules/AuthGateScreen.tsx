'use client';

import React from 'react';
import { Languages, LogIn, ShieldCheck, Users, Wind } from 'lucide-react';
import { AirQualityReport, Language } from '@/types/smogshield';
import { getCategoryStyles } from './badges';

interface AuthGateScreenProps {
  report: AirQualityReport;
  lang: Language;
  isSigningIn: boolean;
  authError: string | null;
  onToggleLanguage: () => void;
  onGoogleSignIn: () => void;
  onEnterGuestMode: () => void;
}

export default function AuthGateScreen({
  report,
  lang,
  isSigningIn,
  authError,
  onToggleLanguage,
  onGoogleSignIn,
  onEnterGuestMode,
}: AuthGateScreenProps) {
  const hi = lang === 'hi';
  const catStyle = getCategoryStyles(report.category);

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
            onClick={onToggleLanguage}
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
                onClick={onGoogleSignIn}
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
                onClick={onEnterGuestMode}
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
