'use client';

import React from 'react';
import {
  Clock,
  Compass,
  ExternalLink,
  Thermometer,
  Users,
} from 'lucide-react';
import {
  AirQualityReport,
  FamilyProfile,
  Language,
} from '@/types/smogshield';
import { getCategoryStyles, getFreshnessBadge } from './badges';

interface LiveAirHeroPanelProps {
  report: AirQualityReport;
  profile: FamilyProfile;
  lang: Language;
  safetyMeta: {
    measuredNaqi: number;
    effectiveNaqi: number;
    precautionTierLabel: string;
    conservatismNote: string;
  };
  onCustomizeProfile: () => void;
}

export default function LiveAirHeroPanel({
  report,
  profile,
  lang,
  safetyMeta,
  onCustomizeProfile,
}: LiveAirHeroPanelProps) {
  const hi = lang === 'hi';
  const catStyle = getCategoryStyles(report.category);
  const freshnessBadge = getFreshnessBadge(report.freshness, lang);
  const isModelCurve =
    report.hourlyForecastSource !== 'cams_model_forecast';

  return (
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

      <div className="p-5 sm:p-6 space-y-5">
        <div
          role="list"
          aria-label={hi ? 'प्रदूषक उप-सूचकांक' : 'Pollutant sub-indices'}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        >
          {report.subIndices.map((sub) => (
            <div
              key={sub.pollutant}
              role="listitem"
              aria-label={`${sub.label}: ${sub.value ?? 'unavailable'} ${sub.unit}, NAQI sub-index ${sub.subIndex ?? 'N/A'}`}
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
              <span>🌡️ {report.weather.temperatureC ?? '—'}°C</span>
              <span>💨 {report.weather.windSpeedKmh ?? '—'} km/h</span>
              <span>💧 {report.weather.humidityPct ?? '—'}% RH</span>
            </div>
            <p className="mt-2 text-xs text-slate-700 leading-relaxed">
              {report.weather.inversionExplanation}
            </p>
          </div>

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

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-teal-800" aria-hidden="true" />
                  {hi ? 'सक्रिय परिवार प्रोफ़ाइल' : 'Active Household Context'}
                </h2>
                <button
                  type="button"
                  onClick={onCustomizeProfile}
                  className="text-xs font-semibold text-teal-800 underline hover:text-teal-950"
                >
                  {hi ? 'बदलें' : 'Customize'}
                </button>
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                {profile.name} ({profile.householdSize} {hi ? 'सदस्य' : 'members'})
              </div>
              <p className="mt-1 text-xs text-slate-700">
                {hi ? 'मापा गया NAQI:' : 'Measured CPCB NAQI:'}{' '}
                <strong>{safetyMeta.measuredNaqi}</strong> •{' '}
                <span className="font-semibold text-teal-900">
                  {safetyMeta.precautionTierLabel}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-600">
                {safetyMeta.conservatismNote}
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {hi
                ? '24-घंटे का प्रदूषण चक्र (सुबह/रात स्मॉग ट्रैप बनाम दोपहर का फैलाव)'
                : '24-Hour Diurnal Smog Curve (Morning/Night Inversion vs. Midday Solar Dispersion)'}
            </h2>
            <span className="text-xs text-slate-600">
              {isModelCurve
                ? hi
                  ? 'स्रोत: सीमा-परत (Boundary-Layer) मॉडल अनुमान • हरा बॉर्डर = दोपहर की खिड़की'
                  : 'Provenance: Modeled Diurnal Boundary-Layer Trend • Teal = Midday window'
                : hi
                  ? 'स्रोत: Copernicus CAMS 24h पूर्वानुमान • हरा बॉर्डर = दोपहर की खिड़की'
                  : 'Provenance: Copernicus CAMS 24h Forecast • Teal = Midday window'}
            </span>
          </div>
          <div
            role="list"
            aria-label={hi ? '24-घंटे का प्रदूषण पूर्वानुमान' : '24-hour diurnal pollution curve'}
            className="grid grid-cols-6 sm:grid-cols-12 gap-1.5"
          >
            {report.hourlyForecast
              .filter((_, idx) => idx % 2 === 0)
              .map((slot) => (
                <div
                  key={slot.hourLabel}
                  role="listitem"
                  aria-label={`${slot.hourLabel}: NAQI ${slot.naqi} (${slot.category}), PM2.5 ${slot.pm25} micrograms per cubic meter${slot.isSaferWindow ? ', lowest relative exposure window' : ''}`}
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
  );
}
