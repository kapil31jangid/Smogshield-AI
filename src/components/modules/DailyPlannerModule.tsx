'use client';

import React, { useState } from 'react';
import { CheckCircle2, FileSearch, Scale } from 'lucide-react';
import {
  AirQualityReport,
  CompletedActionRecord,
  DailyActionSlot,
  FamilyProfile,
  ImpactActionType,
  Language,
  WhatIfScenarioComparison,
} from '@/types/smogshield';
import { getBasisLabel } from './badges';

interface DailyPlannerModuleProps {
  report: AirQualityReport;
  profile: FamilyProfile;
  dailyPlan: DailyActionSlot[];
  whatIfScenarios: WhatIfScenarioComparison[];
  completedActions: CompletedActionRecord[];
  lang: Language;
  onToggleCompleteAction: (
    actionId: string,
    actionType: ImpactActionType,
    title: string
  ) => void;
}

export default function DailyPlannerModule({
  report,
  profile,
  dailyPlan,
  whatIfScenarios,
  completedActions,
  lang,
  onToggleCompleteAction,
}: DailyPlannerModuleProps) {
  const hi = lang === 'hi';
  const [selectedWhatIfId, setSelectedWhatIfId] = useState<string>(
    whatIfScenarios[0]?.id ?? 'whatif-exercise'
  );
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(
    null
  );

  const activeWhatIf =
    whatIfScenarios.find((w) => w.id === selectedWhatIfId) ??
    whatIfScenarios[0];

  return (
    <section
      id="tabpanel-planner"
      role="tabpanel"
      aria-labelledby="tab-planner"
      className="space-y-4"
    >
      {/* Header Summary */}
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
                : `Generated from deterministic CPCB safety thresholds for ${report.city} (Measured NAQI ${report.naqi}) and ${profile.name} (${profile.budgetTier === 'limited_budget' ? 'Low-Cost Resource Mode' : 'Standard Equipment Mode'}).`}
            </p>
          </div>
          <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800">
            {hi ? 'पूरे किए गए कार्य:' : 'Actions Completed Today:'}{' '}
            <strong>{completedActions.length}</strong>
          </div>
        </div>
      </div>

      {/* HIGH-VALUE DIFFERENTIATOR 1: WHAT-IF FAMILY DECISION SIMULATOR */}
      {activeWhatIf && (
        <div
          data-testid="what-if-simulator"
          className="rounded-xl border border-teal-300 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-teal-800" aria-hidden="true" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {hi
                    ? 'इंटरैक्टिव "क्या-अगर" निर्णय सिम्युलेटर (What-If Family Decision Simulator)'
                    : 'Interactive What-If Family Decision Simulator (Modeled Dosimetry Comparison)'}
                </h3>
                <p className="text-xs text-slate-600">
                  {hi
                    ? `${report.city} के वर्तमान PM2.5 (${report.pollutants.pm25 ?? 160} µg/m³) पर दो विकल्पों के श्वसन प्रभाव की तुलना करें।`
                    : `Compare expected inhaled PM2.5 dose (µg) across realistic choices at ${report.city}'s current PM2.5 (${report.pollutants.pm25 ?? 160} µg/m³).`}
                </p>
              </div>
            </div>
            <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-950 border border-teal-200">
              {activeWhatIf.reductionRangeLabel}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {whatIfScenarios.map((sc) => (
              <button
                key={sc.id}
                type="button"
                data-testid={`whatif-btn-${sc.id}`}
                onClick={() => setSelectedWhatIfId(sc.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  sc.id === activeWhatIf.id
                    ? 'bg-teal-900 text-white'
                    : 'border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
                }`}
              >
                {hi ? sc.titleHi : sc.titleEn}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3.5">
              <div className="font-bold text-rose-950 uppercase">
                {hi ? 'विकल्प A: उच्च जोखिम (Baseline)' : 'Option A: Unprotected / Baseline Choice'}
              </div>
              <p className="mt-1 text-rose-900 font-medium">
                {hi ? activeWhatIf.baselineOptionHi : activeWhatIf.baselineOptionEn}
              </p>
              <div className="mt-2 text-lg font-extrabold text-rose-950">
                ~{activeWhatIf.baselineDoseUg} µg PM2.5 inhaled
              </div>
            </div>

            <div className="rounded-lg border border-emerald-300 bg-emerald-50/60 p-3.5">
              <div className="font-bold text-emerald-950 uppercase">
                {hi ? 'विकल्प B: सुरक्षित विकल्प (Recommended)' : 'Option B: Protected SmogShield Choice'}
              </div>
              <p className="mt-1 text-emerald-900 font-medium">
                {hi ? activeWhatIf.saferOptionHi : activeWhatIf.saferOptionEn}
              </p>
              <div className="mt-2 text-lg font-extrabold text-emerald-950">
                ~{activeWhatIf.saferDoseUg} µg PM2.5 inhaled
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex flex-col justify-between">
              <div>
                <div className="font-bold text-slate-900 uppercase">
                  {hi ? 'अनुमानित बचाव और सीमाएं' : 'Estimated Dose Avoided & Limitations'}
                </div>
                <div
                  data-testid="whatif-avoided-dose"
                  className="mt-1 text-lg font-extrabold text-teal-900"
                >
                  ~{activeWhatIf.avoidedDoseUg} µg PM2.5 avoided
                </div>
                <p className="mt-1 text-slate-700">
                  {hi ? activeWhatIf.mechanismHi : activeWhatIf.mechanismEn}
                </p>
              </div>
              <p className="mt-2 text-[11px] text-amber-950 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                <strong>{hi ? 'सीमा:' : 'Limitation:'}</strong>{' '}
                {hi ? activeWhatIf.limitationHi : activeWhatIf.limitationEn}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7 Chronological Daily Slots */}
      <div className="grid grid-cols-1 gap-4">
        {dailyPlan.map((slot) => {
          const isDone = completedActions.some((a) => a.actionId === slot.id);
          const basisTag = getBasisLabel(slot.basis, lang);
          const isEvidenceOpen = expandedEvidenceId === slot.id;

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

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid={`evidence-btn-${slot.id}`}
                    aria-expanded={isEvidenceOpen}
                    onClick={() =>
                      setExpandedEvidenceId(isEvidenceOpen ? null : slot.id)
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    <FileSearch className="h-3.5 w-3.5 text-teal-800" aria-hidden="true" />
                    <span>{hi ? 'साक्ष्य और नियम ट्रेस' : 'Inspect Rule Evidence'}</span>
                  </button>

                  <button
                    type="button"
                    data-testid={`complete-btn-${slot.id}`}
                    onClick={() =>
                      onToggleCompleteAction(
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
                    Modeled range: ~{Math.max(15, slot.estimatedExposureReductionPct - 10)}–
                    {Math.min(95, slot.estimatedExposureReductionPct + 8)}% exposure reduction potential
                  </p>
                </div>

                <div className="rounded-lg bg-teal-50/70 p-3 border border-teal-200">
                  <div className="font-bold text-teal-950 uppercase tracking-wide mb-1">
                    {hi ? '4. सुरक्षित विकल्प (Safer Alternative)' : '4. Safer Alternative'}
                  </div>
                  <p className="text-teal-950 leading-relaxed">{slot.alternative}</p>
                </div>
              </div>

              {/* HIGH-VALUE DIFFERENTIATOR 2: EXPLAINABLE RECOMMENDATION EVIDENCE DRAWER */}
              {isEvidenceOpen && (
                <div
                  data-testid={`evidence-drawer-${slot.id}`}
                  className="mt-3 rounded-lg border border-slate-300 bg-slate-100/80 p-3.5 text-xs text-slate-800 grid grid-cols-1 gap-2 sm:grid-cols-3"
                >
                  <div>
                    <strong>{hi ? 'पर्यावरणीय ट्रिगर:' : 'Environmental Trigger:'}</strong>{' '}
                    Measured CPCB NAQI {report.naqi} ({report.category}), Dominant:{' '}
                    {report.dominantPollutant} (PM2.5: {report.pollutants.pm25 ?? 'N/A'} µg/m³),
                    Inversion Risk: {report.weather.inversionRisk.toUpperCase()}.
                  </div>
                  <div>
                    <strong>{hi ? 'परिवार प्रोफ़ाइल कारक:' : 'Household Profile Factors:'}</strong>{' '}
                    Age groups: {profile.ageGroups.join(', ')} • Commute:{' '}
                    {profile.primaryCommuteMode.replace('_', '/')} • Resource tier:{' '}
                    {profile.budgetTier} • Rule ID: <code>{slot.ruleId}</code>.
                  </div>
                  <div>
                    <strong>{hi ? 'डेटा स्रोत और सीमा:' : 'Telemetry Provenance & Limit:'}</strong>{' '}
                    {report.sourceName} (Freshness: {report.freshness.toUpperCase()}). Percentage range is a modeled physical estimate, not personal sensor spirometry.
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
