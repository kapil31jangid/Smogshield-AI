'use client';

import React from 'react';
import { Car, Info } from 'lucide-react';
import {
  CompletedActionRecord,
  ImpactActionType,
  IndoorGuidanceItem,
  Language,
  LifestyleAlternative,
} from '@/types/smogshield';
import { getBasisLabel } from './badges';

interface IndoorModuleProps {
  indoorGuidance: IndoorGuidanceItem[];
  lang: Language;
}

export function IndoorProtectionModule({
  indoorGuidance,
  lang,
}: IndoorModuleProps) {
  const hi = lang === 'hi';

  return (
    <section
      id="tabpanel-indoor"
      role="tabpanel"
      aria-labelledby="tab-indoor"
      className="space-y-4"
    >
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
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${basisTag.cls}`}
                  >
                    {basisTag.text}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-800 leading-relaxed">
                  <strong>{hi ? 'क्या करें:' : 'Action:'}</strong>{' '}
                  {item.recommendation}
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>
                    {hi ? 'यह कैसे काम करता है:' : 'How it reduces exposure:'}
                  </strong>{' '}
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
  );
}

interface LifestyleModuleProps {
  lowEmissionAlternatives: LifestyleAlternative[];
  completedActions: CompletedActionRecord[];
  lang: Language;
  onToggleCompleteAction: (
    actionId: string,
    actionType: ImpactActionType,
    title: string
  ) => void;
}

export function LowEmissionLifestyleModule({
  lowEmissionAlternatives,
  completedActions,
  lang,
  onToggleCompleteAction,
}: LifestyleModuleProps) {
  const hi = lang === 'hi';

  return (
    <section
      id="tabpanel-lifestyle"
      role="tabpanel"
      aria-labelledby="tab-lifestyle"
      className="space-y-4"
    >
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h2 id="lifestyle-heading" className="text-lg font-bold text-slate-900">
          {hi
            ? 'कम-उत्सर्जन जीवनशैली योजनाकार (Low-Emission Lifestyle Planner)'
            : 'Low-Emission Lifestyle Planner & Sustainable Alternatives'}
        </h2>

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
                    onToggleCompleteAction(
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
                  Modeled Personal Exposure Reduction: ~{Math.max(10, alt.personalExposureDeltaPct - 10)}–
                  {Math.min(90, alt.personalExposureDeltaPct + 10)}%
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
  );
}
