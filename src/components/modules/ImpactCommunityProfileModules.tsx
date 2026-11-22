'use client';

import React from 'react';
import {
  AgeGroup,
  BudgetTier,
  CommuteMode,
  CommunityInitiative,
  CompletedActionRecord,
  CookingSetup,
  FamilyProfile,
  ImpactActionType,
  ImpactSummary,
  Language,
  ProtectiveEquipment,
} from '@/types/smogshield';

interface ImpactModuleProps {
  impactSummary: ImpactSummary;
  completedActions: CompletedActionRecord[];
  lang: Language;
  onToggleCompleteAction: (
    actionId: string,
    actionType: ImpactActionType,
    title: string
  ) => void;
}

export function ImpactTrackerModule({
  impactSummary,
  completedActions,
  lang,
  onToggleCompleteAction,
}: ImpactModuleProps) {
  const hi = lang === 'hi';

  return (
    <section
      id="tabpanel-impact"
      role="tabpanel"
      aria-labelledby="tab-impact"
      className="space-y-4"
    >
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
                    onToggleCompleteAction(act.actionId, act.actionType, act.title)
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <h3 className="text-sm font-bold text-slate-900">
            {hi
              ? 'गणना पद्धति (Methodology & Equations)'
              : 'Documented Calculation Methodology'}
          </h3>
          <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700">
            {impactSummary.methodologyDisclosures.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-5 shadow-sm space-y-2">
          <h3 className="text-sm font-bold text-amber-950">
            {hi
              ? 'सीमाएं और मान्यताएं (Assumptions & Limitations)'
              : 'Assumptions & Scientific Limitations'}
          </h3>
          <ul className="list-disc pl-4 space-y-1.5 text-xs text-amber-950">
            {impactSummary.limitations.map((lim) => (
              <li key={lim}>{lim}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

interface CommunityModuleProps {
  initiatives: CommunityInitiative[];
  pledgedIds: string[];
  lang: Language;
  onPledge: (initiativeId: string) => void;
}

export function CommunityActionModule({
  initiatives,
  pledgedIds,
  lang,
  onPledge,
}: CommunityModuleProps) {
  const hi = lang === 'hi';

  return (
    <section
      id="tabpanel-community"
      role="tabpanel"
      aria-labelledby="tab-community"
      className="space-y-4"
    >
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
                    {init.householdsPledged}{' '}
                    {hi ? 'परिवार जुड़े' : 'households participating'}
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
                    {hi
                      ? 'कैसे शुरू करें:'
                      : 'How Your Household Can Participate:'}
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
                  onClick={() => onPledge(init.id)}
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
  );
}

interface ProfileModuleProps {
  uid: string;
  profile: FamilyProfile;
  lang: Language;
  onSaveProfile: (next: FamilyProfile) => void;
}

export function ProfileConfiguratorModule({
  uid,
  profile,
  lang,
  onSaveProfile,
}: ProfileModuleProps) {
  const hi = lang === 'hi';

  return (
    <section
      id="tabpanel-profile"
      role="tabpanel"
      aria-labelledby="tab-profile"
      className="space-y-4"
    >
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
                onSaveProfile({ ...profile, name: e.target.value.slice(0, 70) })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

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
                onSaveProfile({
                  ...profile,
                  householdSize: Math.max(
                    1,
                    Math.min(20, Number(e.target.value) || 1)
                  ),
                })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

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
                onSaveProfile({
                  ...profile,
                  budgetTier: e.target.value as BudgetTier,
                })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              <option value="standard">
                {hi
                  ? 'मानक (प्यूरीफायर / N95 उपलब्ध)'
                  : 'Standard (Purifier / N95 Capable)'}
              </option>
              <option value="limited_budget">
                {hi
                  ? 'सीमित बजट (कम लागत वाले घरेलू उपाय)'
                  : 'Limited Budget (Low-Cost Non-Purifier Solutions)'}
              </option>
            </select>
          </div>

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
                onSaveProfile({
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

          <div>
            <label
              htmlFor={`${uid}-prof-hour`}
              className="block font-bold text-slate-800 mb-1"
            >
              {hi
                ? 'स्कूल/ऑफिस निकलने का समय (घंटा 0-23)'
                : 'Morning Departure Hour (0–23)'}
            </label>
            <input
              id={`${uid}-prof-hour`}
              type="number"
              min={5}
              max={22}
              value={profile.schoolOrWorkStartHour}
              onChange={(e) =>
                onSaveProfile({
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
                onSaveProfile({
                  ...profile,
                  cookingSetup: e.target.value as CookingSetup,
                })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              <option value="lpg_exhaust">
                LPG Stove + Exhaust Fan / Vented Chimney
              </option>
              <option value="lpg_no_exhaust">LPG Stove (No Exhaust Fan)</option>
              <option value="electric_induction">
                Electric Induction / Low-Smoke
              </option>
              <option value="biomass_coal">
                Biomass / Wood / Coal Chulha
              </option>
            </select>
          </div>
        </div>

        <fieldset className="pt-2 border-0 p-0 m-0">
          <legend className="text-xs font-bold text-slate-800 mb-2">
            {hi
              ? 'परिवार में शामिल आयु वर्ग:'
              : 'Age Groups Present in Household:'}
          </legend>
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
                        onSaveProfile({ ...profile, ageGroups: next });
                      }
                    }}
                    className="rounded border-slate-400 text-teal-800"
                  />
                  <span>{ag.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="pt-2 border-0 p-0 m-0">
          <legend className="text-xs font-bold text-slate-800 mb-2">
            {hi ? 'उपलब्ध सुरक्षा उपकरण:' : 'Available Protective Equipment:'}
          </legend>
          <div className="flex flex-wrap gap-3 text-xs">
            {(
              [
                { id: 'n95_masks', label: 'N95 / FFP2 / KN95 Respirators' },
                { id: 'hepa_purifier', label: 'HEPA Room Air Purifier' },
                {
                  id: 'exhaust_fan',
                  label: 'Kitchen / Bathroom Exhaust Fan',
                },
                {
                  id: 'wet_mop_cleaning',
                  label: 'Wet Mop & Microfiber Cleaning',
                },
                {
                  id: 'cloth_masks_only',
                  label: 'Cloth / Surgical Masks Only',
                },
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
                      onSaveProfile({ ...profile, equipment: next });
                    }}
                    className="rounded border-slate-400 text-teal-800"
                  />
                  <span>{eq.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="pt-2">
          <label className="inline-flex items-center gap-2.5 text-xs font-bold text-slate-900 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.hasRespiratorySensitivity}
              onChange={(e) =>
                onSaveProfile({
                  ...profile,
                  hasRespiratorySensitivity: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-slate-400 text-teal-800"
            />
            <span>
              {hi
                ? 'परिवार के किसी सदस्य को अस्थमा, ब्रोंकाइटिस, एलर्जी या हृदय संबंधी संवेदनशीलता है (उच्च सुरक्षा श्रेणी सक्रिय करता है)'
                : 'Household member has asthma, bronchitis, sinus allergy, or cardiovascular sensitivity (Activates escalated precautionary safety tier)'}
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
