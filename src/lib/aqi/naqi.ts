import {
  FreshnessStatus,
  NAQICategory,
  PollutantReading,
  PollutantSubIndex,
} from '@/types/smogshield';

interface BreakpointBand {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
  category: NAQICategory;
}

/**
 * Official Indian CPCB National Air Quality Index (NAQI) Breakpoint Table.
 * Reference: Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change, Govt. of India.
 */
const CPCB_BREAKPOINTS: Record<keyof PollutantReading, BreakpointBand[]> = {
  pm25: [
    { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50, category: 'Good' },
    { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100, category: 'Satisfactory' },
    { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200, category: 'Moderate' },
    { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300, category: 'Poor' },
    { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400, category: 'Very Poor' },
    { cLow: 251, cHigh: 1000, iLow: 401, iHigh: 500, category: 'Severe' },
  ],
  pm10: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50, category: 'Good' },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100, category: 'Satisfactory' },
    { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200, category: 'Moderate' },
    { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300, category: 'Poor' },
    { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400, category: 'Very Poor' },
    { cLow: 431, cHigh: 1500, iLow: 401, iHigh: 500, category: 'Severe' },
  ],
  no2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50, category: 'Good' },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100, category: 'Satisfactory' },
    { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200, category: 'Moderate' },
    { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300, category: 'Poor' },
    { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400, category: 'Very Poor' },
    { cLow: 401, cHigh: 1000, iLow: 401, iHigh: 500, category: 'Severe' },
  ],
  so2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50, category: 'Good' },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100, category: 'Satisfactory' },
    { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200, category: 'Moderate' },
    { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300, category: 'Poor' },
    { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400, category: 'Very Poor' },
    { cLow: 1601, cHigh: 2500, iLow: 401, iHigh: 500, category: 'Severe' },
  ],
  co: [
    { cLow: 0, cHigh: 1.0, iLow: 0, iHigh: 50, category: 'Good' },
    { cLow: 1.1, cHigh: 2.0, iLow: 51, iHigh: 100, category: 'Satisfactory' },
    { cLow: 2.1, cHigh: 10, iLow: 101, iHigh: 200, category: 'Moderate' },
    { cLow: 10.1, cHigh: 17, iLow: 201, iHigh: 300, category: 'Poor' },
    { cLow: 17.1, cHigh: 34, iLow: 301, iHigh: 400, category: 'Very Poor' },
    { cLow: 34.1, cHigh: 100, iLow: 401, iHigh: 500, category: 'Severe' },
  ],
  o3: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50, category: 'Good' },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100, category: 'Satisfactory' },
    { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200, category: 'Moderate' },
    { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300, category: 'Poor' },
    { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400, category: 'Very Poor' },
    { cLow: 749, cHigh: 1500, iLow: 401, iHigh: 500, category: 'Severe' },
  ],
};

const POLLUTANT_META: Record<
  keyof PollutantReading,
  { label: string; unit: string; safeLimit: number }
> = {
  pm25: { label: 'PM2.5', unit: 'µg/m³', safeLimit: 60 },
  pm10: { label: 'PM10', unit: 'µg/m³', safeLimit: 100 },
  no2: { label: 'NO₂', unit: 'µg/m³', safeLimit: 80 },
  so2: { label: 'SO₂', unit: 'µg/m³', safeLimit: 80 },
  co: { label: 'CO', unit: 'mg/m³', safeLimit: 2.0 },
  o3: { label: 'O₃', unit: 'µg/m³', safeLimit: 100 },
};

export function classifyNaqiScore(naqi: number): NAQICategory {
  const score = Math.max(0, Math.round(naqi));
  if (score <= 50) return 'Good';
  if (score <= 100) return 'Satisfactory';
  if (score <= 200) return 'Moderate';
  if (score <= 300) return 'Poor';
  if (score <= 400) return 'Very Poor';
  return 'Severe';
}

export function calculatePollutantSubIndex(
  pollutant: keyof PollutantReading,
  concentration: number | null | undefined
): { subIndex: number | null; category: NAQICategory | null } {
  if (concentration === null || concentration === undefined || Number.isNaN(concentration) || concentration < 0) {
    return { subIndex: null, category: null };
  }

  const bands = CPCB_BREAKPOINTS[pollutant];
  const firstBand = bands[0];
  if (!firstBand) {
    return { subIndex: null, category: null };
  }
  if (concentration <= firstBand.cHigh) {
    const idx = Math.round(
      ((firstBand.iHigh - firstBand.iLow) / (firstBand.cHigh - firstBand.cLow)) *
        (concentration - firstBand.cLow) +
        firstBand.iLow
    );
    return { subIndex: idx, category: firstBand.category };
  }

  for (let i = 1; i < bands.length; i++) {
    const prev = bands[i - 1];
    const band = bands[i];
    if (!prev || !band) continue;
    if (concentration <= band.cHigh) {
      const clampedC = Math.max(band.cLow, concentration);
      const spanC = band.cHigh - prev.cHigh;
      const spanI = band.iHigh - band.iLow;
      const idx = Math.round(
        (spanI / spanC) * (clampedC - prev.cHigh) + band.iLow
      );
      const bounded = Math.min(500, Math.max(band.iLow, idx));
      return { subIndex: bounded, category: classifyNaqiScore(bounded) };
    }
  }

  return { subIndex: 500, category: 'Severe' };
}

export function computeOverallNaqi(pollutants: PollutantReading): {
  naqi: number;
  category: NAQICategory;
  dominantPollutant: string;
  subIndices: PollutantSubIndex[];
  whoPm25Multiple: number;
} {
  const keys: (keyof PollutantReading)[] = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];
  let maxIndex = 0;
  let dominant = 'PM2.5';

  const subIndices: PollutantSubIndex[] = keys.map((key) => {
    const meta = POLLUTANT_META[key];
    const val = pollutants[key];
    const { subIndex, category } = calculatePollutantSubIndex(key, val);
    if (subIndex !== null && subIndex > maxIndex) {
      maxIndex = subIndex;
      dominant = meta.label;
    }
    return {
      pollutant: key,
      label: meta.label,
      unit: meta.unit,
      value: val !== null && val !== undefined ? Math.round(val * 10) / 10 : null,
      subIndex,
      category,
      safeLimit: meta.safeLimit,
    };
  });

  const category = classifyNaqiScore(maxIndex);
  // WHO 2021 24-hour guideline for PM2.5 is 15 ug/m3
  const pm25Val = pollutants.pm25 ?? 0;
  const whoPm25Multiple = Math.round((pm25Val / 15) * 10) / 10;

  return {
    naqi: maxIndex,
    category,
    dominantPollutant: dominant,
    subIndices,
    whoPm25Multiple,
  };
}

export function getHealthSummaryForCategory(
  category: NAQICategory,
  naqi: number,
  whoMultiple: number
): { en: string; hi: string } {
  switch (category) {
    case 'Good':
      return {
        en: `Air quality is Good (NAQI ${naqi}). Minimal health impact. Ideal conditions for outdoor family activities and natural home ventilation.`,
        hi: `वायु गुणवत्ता अच्छी है (NAQI ${naqi})। स्वास्थ्य पर न्यूनतम प्रभाव। बाहरी पारिवारिक गतिविधियों और घर के प्राकृतिक वेंटिलेशन के लिए उपयुक्त।`,
      };
    case 'Satisfactory':
      return {
        en: `Air quality is Satisfactory (NAQI ${naqi}, ${whoMultiple}× WHO daily PM2.5 guideline). Minor breathing discomfort possible for extremely sensitive individuals.`,
        hi: `वायु गुणवत्ता संतोषजनक है (NAQI ${naqi}, WHO दैनिक मानक से ${whoMultiple} गुना)। अत्यधिक संवेदनशील व्यक्तियों को हल्की सांस की तकलीफ हो सकती है।`,
      };
    case 'Moderate':
      return {
        en: `Air quality is Moderate (NAQI ${naqi}, ${whoMultiple}× WHO guideline). Breathing discomfort possible for children, elderly family members, and those with asthma or heart conditions.`,
        hi: `वायु गुणवत्ता मध्यम है (NAQI ${naqi}, WHO मानक से ${whoMultiple} गुना)। बच्चों, बुजुर्गों और अस्थमा या हृदय रोगियों को सांस लेने में तकलीफ हो सकती है।`,
      };
    case 'Poor':
      return {
        en: `Air quality is Poor (NAQI ${naqi}, ${whoMultiple}× WHO guideline). Prolonged outdoor exposure causes breathing discomfort for most people. Shift strenuous exercise indoors and use N95 masks during commutes.`,
        hi: `वायु गुणवत्ता खराब है (NAQI ${naqi}, WHO मानक से ${whoMultiple} गुना)। लंबे समय तक बाहर रहने पर अधिकांश लोगों को सांस लेने में परेशानी हो सकती है। भारी व्यायाम घर के अंदर करें और बाहर N95 मास्क पहनें।`,
      };
    case 'Very Poor':
      return {
        en: `Air quality is Very Poor (NAQI ${naqi}, ${whoMultiple}× WHO guideline). High risk of respiratory illness on prolonged exposure. Keep children and elderly indoors during morning/night smog traps and seal indoor air leaks.`,
        hi: `वायु गुणवत्ता बहुत खराब है (NAQI ${naqi}, WHO मानक से ${whoMultiple} गुना)। लंबे समय तक संपर्क में रहने से सांस की बीमारी का उच्च जोखिम है। सुबह और रात के स्मॉग के दौरान बच्चों और बुजुर्गों को अंदर रखें।`,
      };
    case 'Severe':
      return {
        en: `SEVERE WINTER SMOG ALERT (NAQI ${naqi}, ${whoMultiple}× WHO daily guideline). Affects healthy individuals and seriously impacts anyone with existing respiratory or cardiac conditions. Avoid outdoor physical activity, wear fitted N95/FFP2 masks if stepping out, and keep windows sealed.`,
        hi: `गंभीर शीतकालीन स्मॉग चेतावनी (NAQI ${naqi}, WHO मानक से ${whoMultiple} गुना)। यह स्वस्थ व्यक्तियों को भी प्रभावित करता है और सांस या हृदय रोगियों पर गंभीर असर डालता है। बाहरी शारीरिक गतिविधि से बचें, बाहर निकलने पर N95 मास्क पहनें और खिड़कियां बंद रखें।`,
      };
  }
}

export function evaluateFreshness(
  observedAtIso: string | null | undefined,
  nowMs: number,
  sourceTier: 'tier1_official_station' | 'tier2_secondary_model' | 'tier3_offline_reference',
  forceMode?: 'normal' | 'stale' | 'offline' | 'no_station'
): { freshness: FreshnessStatus; dataAgeMinutes: number } {
  if (forceMode === 'offline' || sourceTier === 'tier3_offline_reference') {
    return { freshness: 'unavailable', dataAgeMinutes: 0 };
  }
  if (forceMode === 'stale') {
    return { freshness: 'stale', dataAgeMinutes: 360 };
  }
  if (!observedAtIso) {
    return {
      freshness: sourceTier === 'tier2_secondary_model' ? 'estimated' : 'unavailable',
      dataAgeMinutes: 0,
    };
  }

  const parsedMs = Date.parse(observedAtIso);
  if (Number.isNaN(parsedMs)) {
    return {
      freshness: sourceTier === 'tier2_secondary_model' ? 'estimated' : 'unavailable',
      dataAgeMinutes: 0,
    };
  }

  const ageMin = Math.max(0, Math.round((nowMs - parsedMs) / 60000));

  if (sourceTier === 'tier2_secondary_model') {
    if (ageMin > 240) return { freshness: 'stale', dataAgeMinutes: ageMin };
    return { freshness: 'estimated', dataAgeMinutes: ageMin };
  }

  if (ageMin <= 75) return { freshness: 'live', dataAgeMinutes: ageMin };
  if (ageMin <= 240) return { freshness: 'delayed', dataAgeMinutes: ageMin };
  return { freshness: 'stale', dataAgeMinutes: ageMin };
}
