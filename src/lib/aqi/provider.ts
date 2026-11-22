import {
  AirQualityReport,
  HourlyWindow,
  PollutantReading,
  WeatherContext,
} from '@/types/smogshield';
import {
  calculatePollutantSubIndex,
  classifyNaqiScore,
  computeOverallNaqi,
  evaluateFreshness,
  getHealthSummaryForCategory,
} from './naqi';

export interface CityStationConfig {
  id: string;
  city: string;
  state: string;
  stationName: string;
  waqiStationQuery: string;
  cpcbStationMatch: string;
  hasLocalOfficialStation: boolean;
  lat: number;
  lon: number;
  offlineReferencePollutants: PollutantReading;
  offlineWeather: {
    temperatureC: number;
    humidityPct: number;
    windSpeedKmh: number;
  };
}

export const INDIAN_MONITORING_LOCATIONS: CityStationConfig[] = [
  {
    id: 'delhi-anand-vihar',
    city: 'New Delhi (East)',
    state: 'Delhi NCR',
    stationName: 'Anand Vihar, Delhi - DPCC / CPCB CAAQMS',
    waqiStationQuery: '@2553',
    cpcbStationMatch: 'Anand Vihar',
    hasLocalOfficialStation: true,
    lat: 28.6476,
    lon: 77.3158,
    offlineReferencePollutants: {
      pm25: 298,
      pm10: 465,
      no2: 94,
      so2: 22,
      co: 2.6,
      o3: 38,
    },
    offlineWeather: { temperatureC: 14.2, humidityPct: 78, windSpeedKmh: 4.1 },
  },
  {
    id: 'delhi-rk-puram',
    city: 'New Delhi (South)',
    state: 'Delhi NCR',
    stationName: 'R.K. Puram, Delhi - DPCC / CPCB CAAQMS',
    waqiStationQuery: '@2554',
    cpcbStationMatch: 'R K Puram',
    hasLocalOfficialStation: true,
    lat: 28.5633,
    lon: 77.1869,
    offlineReferencePollutants: {
      pm25: 242,
      pm10: 388,
      no2: 78,
      so2: 18,
      co: 2.1,
      o3: 42,
    },
    offlineWeather: { temperatureC: 15.0, humidityPct: 74, windSpeedKmh: 5.2 },
  },
  {
    id: 'gurugram-sector-51',
    city: 'Gurugram',
    state: 'Haryana (NCR)',
    stationName: 'Sector-51, Gurugram - HSPCB / CPCB CAAQMS',
    waqiStationQuery: 'gurugram',
    cpcbStationMatch: 'Sector-51, Gurugram',
    hasLocalOfficialStation: true,
    lat: 28.4275,
    lon: 77.0667,
    offlineReferencePollutants: {
      pm25: 215,
      pm10: 342,
      no2: 68,
      so2: 16,
      co: 1.8,
      o3: 45,
    },
    offlineWeather: { temperatureC: 15.5, humidityPct: 70, windSpeedKmh: 6.0 },
  },
  {
    id: 'noida-sector-62',
    city: 'Noida',
    state: 'Uttar Pradesh (NCR)',
    stationName: 'Sector-62, Noida - IMD / CPCB CAAQMS',
    waqiStationQuery: 'noida',
    cpcbStationMatch: 'Sector - 62, Noida',
    hasLocalOfficialStation: true,
    lat: 28.6245,
    lon: 77.3577,
    offlineReferencePollutants: {
      pm25: 256,
      pm10: 410,
      no2: 82,
      so2: 19,
      co: 2.2,
      o3: 39,
    },
    offlineWeather: { temperatureC: 14.8, humidityPct: 76, windSpeedKmh: 4.8 },
  },
  {
    id: 'lucknow-lalbagh',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    stationName: 'Lalbagh, Lucknow - UPPCB / CPCB CAAQMS',
    waqiStationQuery: 'lucknow',
    cpcbStationMatch: 'Lalbagh, Lucknow',
    hasLocalOfficialStation: true,
    lat: 26.8467,
    lon: 80.9462,
    offlineReferencePollutants: {
      pm25: 178,
      pm10: 295,
      no2: 62,
      so2: 15,
      co: 1.7,
      o3: 48,
    },
    offlineWeather: { temperatureC: 16.4, humidityPct: 72, windSpeedKmh: 5.5 },
  },
  {
    id: 'patna-igsc',
    city: 'Patna',
    state: 'Bihar',
    stationName: 'IGSC Planetarium Complex, Patna - BSPCB / CPCB',
    waqiStationQuery: 'patna',
    cpcbStationMatch: 'IGSC Planetarium',
    hasLocalOfficialStation: true,
    lat: 25.611,
    lon: 85.134,
    offlineReferencePollutants: {
      pm25: 192,
      pm10: 325,
      no2: 58,
      so2: 14,
      co: 1.9,
      o3: 44,
    },
    offlineWeather: { temperatureC: 17.1, humidityPct: 77, windSpeedKmh: 4.5 },
  },
  {
    id: 'mumbai-bandra',
    city: 'Mumbai',
    state: 'Maharashtra',
    stationName: 'Bandra Kurla Complex, Mumbai - MPCB / CPCB',
    waqiStationQuery: 'mumbai',
    cpcbStationMatch: 'Bandra',
    hasLocalOfficialStation: true,
    lat: 19.0596,
    lon: 72.8295,
    offlineReferencePollutants: {
      pm25: 76,
      pm10: 158,
      no2: 44,
      so2: 12,
      co: 1.1,
      o3: 54,
    },
    offlineWeather: { temperatureC: 25.4, humidityPct: 64, windSpeedKmh: 11.2 },
  },
  {
    id: 'bengaluru-btm',
    city: 'Bengaluru',
    state: 'Karnataka',
    stationName: 'BTM Layout, Bengaluru - KSPCB / CPCB',
    waqiStationQuery: 'bangalore',
    cpcbStationMatch: 'BTM Layout',
    hasLocalOfficialStation: true,
    lat: 12.9166,
    lon: 77.6101,
    offlineReferencePollutants: {
      pm25: 38,
      pm10: 84,
      no2: 29,
      so2: 9,
      co: 0.8,
      o3: 46,
    },
    offlineWeather: { temperatureC: 22.1, humidityPct: 58, windSpeedKmh: 12.4 },
  },
  {
    id: 'tehri-rural-corridor',
    city: 'Tehri Garhwal (Peri-Urban / No CPCB Station)',
    state: 'Uttarakhand',
    stationName: 'Regional Atmospheric Grid (No Local CPCB CAAQMS Station)',
    waqiStationQuery: '',
    cpcbStationMatch: '',
    hasLocalOfficialStation: false,
    lat: 30.3753,
    lon: 78.4337,
    offlineReferencePollutants: {
      pm25: 44,
      pm10: 92,
      no2: 18,
      so2: 6,
      co: 0.6,
      o3: 52,
    },
    offlineWeather: { temperatureC: 12.0, humidityPct: 62, windSpeedKmh: 9.5 },
  },
];

export function resolveLocationConfig(cityId: string): CityStationConfig {
  const found = INDIAN_MONITORING_LOCATIONS.find((loc) => loc.id === cityId);
  return found ?? INDIAN_MONITORING_LOCATIONS[0]!;
}

/**
 * WAQI's `iaqi.pm25.v` and `iaqi.pm10.v` fields report US-EPA AQI sub-indices rather than raw ug/m3.
 * Converts WAQI US-EPA PM2.5 sub-index back into raw concentration (ug/m3) before applying Indian CPCB NAQI equations.
 */
export function convertWaqiPm25IaqiToUgM3(iaqi: number): number {
  if (iaqi <= 0) return 0;
  const bands: Array<[number, number, number, number]> = [
    [0, 50, 0, 12.0],
    [51, 100, 12.1, 35.4],
    [101, 150, 35.5, 55.4],
    [151, 200, 55.5, 150.4],
    [201, 300, 150.5, 250.4],
    [301, 500, 250.5, 500.4],
  ];
  for (const [iLow, iHigh, cLow, cHigh] of bands) {
    if (iaqi <= iHigh) {
      const ratio = (Math.max(iLow, iaqi) - iLow) / (iHigh - iLow);
      return Math.round((cLow + ratio * (cHigh - cLow)) * 10) / 10;
    }
  }
  return 320;
}

export function convertWaqiPm10IaqiToUgM3(iaqi: number): number {
  if (iaqi <= 0) return 0;
  const bands: Array<[number, number, number, number]> = [
    [0, 50, 0, 54],
    [51, 100, 55, 154],
    [101, 150, 155, 254],
    [151, 200, 255, 354],
    [201, 300, 355, 424],
    [301, 500, 425, 604],
  ];
  for (const [iLow, iHigh, cLow, cHigh] of bands) {
    if (iaqi <= iHigh) {
      const ratio = (Math.max(iLow, iaqi) - iLow) / (iHigh - iLow);
      return Math.round(cLow + ratio * (cHigh - cLow));
    }
  }
  return 480;
}

export function buildWeatherContext(
  temperatureC: number | null,
  humidityPct: number | null,
  windSpeedKmh: number | null
): WeatherContext {
  const temp = temperatureC ?? 16;
  const wind = windSpeedKmh ?? 6;
  const hum = humidityPct ?? 70;

  let inversionRisk: 'low' | 'moderate' | 'high' = 'low';
  let inversionExplanation =
    'Adequate wind dispersion and thermal mixing help prevent ground-level smog trapping.';

  if (temp <= 17 && wind <= 7) {
    inversionRisk = 'high';
    inversionExplanation =
      'Winter thermal inversion active: cold surface air (<17°C) and calm wind (<7 km/h) trap PM2.5 and toxic exhaust close to breathing height during morning and night hours.';
  } else if (temp <= 21 || wind <= 10 || hum >= 75) {
    inversionRisk = 'moderate';
    inversionExplanation =
      'Moderate dispersion conditions: pollutants accumulate during early morning and late evening but disperse partially during midday solar heating.';
  }

  return {
    temperatureC: temperatureC !== null ? Math.round(temperatureC * 10) / 10 : null,
    humidityPct: humidityPct !== null ? Math.round(humidityPct) : null,
    windSpeedKmh: windSpeedKmh !== null ? Math.round(windSpeedKmh * 10) / 10 : null,
    inversionRisk,
    inversionExplanation,
  };
}

export function generateDiurnalHourlyCurve(basePm25: number): HourlyWindow[] {
  // Modeled boundary-layer diurnal curve when 24h CAMS forecast is unavailable:
  // peaks at 06:00-09:00 and 20:00-23:00 due to radiative surface cooling; dips 25%-32% at 13:00-16:00.
  const multipliers = [
    1.12, 1.1, 1.08, 1.08, 1.12, 1.2, // 00-05
    1.26, 1.28, 1.22, 1.1, 0.98, 0.86, // 06-11
    0.76, 0.7, 0.68, 0.72, 0.82, 0.96, // 12-17
    1.08, 1.16, 1.22, 1.24, 1.18, 1.14, // 18-23
  ];

  return multipliers.map((mult, hour) => {
    const pm25 = Math.max(5, Math.round(basePm25 * mult));
    const pm25Sub = calculatePollutantSubIndex('pm25', pm25).subIndex ?? 50;
    const pm10Est = Math.round(pm25 * 1.55);
    const pm10Sub = calculatePollutantSubIndex('pm10', pm10Est).subIndex ?? 50;
    const naqi = Math.max(pm25Sub, pm10Sub);
    const category = classifyNaqiScore(naqi);
    const isSaferWindow = hour >= 12 && hour <= 16 && naqi < 350;

    return {
      hourLabel: `${String(hour).padStart(2, '0')}:00`,
      hour24: hour,
      pm25,
      naqi,
      category,
      isSaferWindow,
    };
  });
}

export function identifySaferOutdoorWindow(
  hourly: HourlyWindow[],
  currentNaqi: number
): AirQualityReport['saferOutdoorWindow'] {
  const middaySlots = hourly.filter((h) => h.hour24 >= 12 && h.hour24 <= 16);
  const pool = middaySlots.length > 0 ? middaySlots : hourly;
  const best = pool.reduce(
    (min, cur) => (cur.naqi < min.naqi ? cur : min),
    pool[0] ?? { hourLabel: '14:00', naqi: currentNaqi }
  );

  if (best.naqi > 300) {
    return {
      label: '13:30 – 15:30 (Relative Dip Only — Still Very Poor/Severe)',
      expectedNaqi: best.naqi,
      recommendationEn: `Even during peak afternoon solar mixing (13:30–15:30), NAQI remains ~${best.naqi} (Hazardous). Do NOT treat this window as safe for outdoor exercise; use it only for unavoidable short errands with a fitted N95 mask.`,
      recommendationHi: `दोपहर की धूप (13:30–15:30) में भी NAQI ~${best.naqi} (खतरनाक) रहता है। इसे बाहरी व्यायाम के लिए सुरक्षित न मानें; केवल अत्यंत आवश्यक कार्य के लिए N95 मास्क पहनकर ही बाहर निकलें।`,
    };
  }

  if (best.naqi > 200) {
    return {
      label: '13:00 – 16:00 (Lowest Relative Exposure — Still Poor Air)',
      expectedNaqi: best.naqi,
      recommendationEn: `Pollution drops to its daily minimum (~NAQI ${best.naqi}, Poor) between 13:00 and 16:00. Keep strenuous workouts indoors, and schedule brief 15-minute room ventilation or essential errands in this window.`,
      recommendationHi: `दोपहर 13:00 से 16:00 के बीच प्रदूषण अपने न्यूनतम स्तर (~NAQI ${best.naqi}, खराब) पर होता है। भारी व्यायाम घर के अंदर ही करें और संक्षिप्त वेंटिलेशन या आवश्यक काम इसी समय करें।`,
    };
  }

  return {
    label: '13:00 – 16:00 (Afternoon Solar Dispersion Window)',
    expectedNaqi: best.naqi,
    recommendationEn: `Pollution drops to its lowest daily level (~NAQI ${best.naqi}) between 13:00 and 16:00 as afternoon warmth lifts the inversion layer. Schedule home ventilation or outdoor errands in this window.`,
    recommendationHi: `दोपहर 13:00 से 16:00 के बीच धूप के कारण स्मॉग की परत ऊपर उठती है और NAQI घटकर ~${best.naqi} हो जाता है। आवश्यक बाहरी काम या वेंटिलेशन इसी समय करें।`,
  };
}

async function fetchWithTimeout(url: string, timeoutMs = 3800): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function tryFetchCpcbDataGovStation(
  loc: CityStationConfig
): Promise<{
  pollutants: PollutantReading;
  observedAt: string;
  stationName: string;
} | null> {
  const apiKey = process.env.CPCB_DATA_GOV_API_KEY;
  if (!apiKey || apiKey.includes('your_') || !loc.hasLocalOfficialStation || !loc.cpcbStationMatch) {
    return null;
  }

  try {
    const cityFilter = loc.city.split(' ')[0] || 'Delhi';
    const url = `https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key=${encodeURIComponent(
      apiKey.trim()
    )}&format=json&limit=40&filters%5Bcity%5D=${encodeURIComponent(cityFilter)}`;
    const res = await fetchWithTimeout(url, 3800);
    if (!res.ok) return null;
    const json = await res.json();
    const records: Array<{
      station?: string;
      pollutant_id?: string;
      pollutant_avg?: string;
    }> = Array.isArray(json?.records) ? json.records : [];
    if (records.length === 0) return null;

    const matchKey = loc.cpcbStationMatch.toLowerCase();
    const matched = records.filter((r) => (r.station ?? '').toLowerCase().includes(matchKey));
    const pool = matched.length > 0 ? matched : records;

    const reading: PollutantReading = {
      pm25: null,
      pm10: null,
      no2: null,
      so2: null,
      co: null,
      o3: null,
    };
    let stationLabel = loc.stationName;

    for (const row of pool) {
      if (row.station) stationLabel = `${row.station} (Official CPCB data.gov.in)`;
      const pid = (row.pollutant_id ?? '').toUpperCase();
      const val = Number(row.pollutant_avg);
      if (Number.isNaN(val) || val <= 0) continue;
      if (pid === 'PM2.5' && reading.pm25 === null) reading.pm25 = val;
      if (pid === 'PM10' && reading.pm10 === null) reading.pm10 = val;
      if (pid === 'NO2' && reading.no2 === null) reading.no2 = val;
      if (pid === 'SO2' && reading.so2 === null) reading.so2 = val;
      if (pid === 'CO' && reading.co === null) {
        reading.co = val > 15 ? Number((val / 10).toFixed(2)) : val;
      }
      if ((pid === 'OZONE' || pid === 'O3') && reading.o3 === null) reading.o3 = val;
    }

    if (reading.pm25 === null && reading.pm10 === null) return null;
    return {
      pollutants: reading,
      observedAt: new Date().toISOString(),
      stationName: stationLabel,
    };
  } catch {
    return null;
  }
}

async function tryFetchOpenAqOfficialStation(
  loc: CityStationConfig
): Promise<{
  pollutants: PollutantReading;
  observedAt: string;
  stationName: string;
} | null> {
  const apiKey = process.env.OPENAQ_API_KEY;
  if (!apiKey || apiKey.includes('your_') || !loc.hasLocalOfficialStation) {
    return null;
  }

  try {
    const url = `https://api.openaq.org/v3/locations?coordinates=${loc.lat},${loc.lon}&radius=15000&limit=5`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'X-API-Key': apiKey.trim() },
      next: { revalidate: 300 },
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const json = await res.json();
    const firstLoc = Array.isArray(json?.results) ? json.results[0] : null;
    if (!firstLoc?.id) return null;

    const latestRes = await fetchWithTimeout(
      `https://api.openaq.org/v3/locations/${firstLoc.id}/latest`,
      3500
    );
    if (!latestRes.ok) return null;
    const latestJson = await latestRes.json();
    const items: Array<{
      parameter?: { name?: string };
      value?: number;
      datetime?: { utc?: string };
    }> = Array.isArray(latestJson?.results) ? latestJson.results : [];
    if (items.length === 0) return null;

    const reading: PollutantReading = {
      pm25: null,
      pm10: null,
      no2: null,
      so2: null,
      co: null,
      o3: null,
    };
    let latestIso = new Date().toISOString();

    for (const item of items) {
      const pName = item.parameter?.name?.toLowerCase();
      const val = typeof item.value === 'number' && item.value >= 0 ? item.value : null;
      if (val === null) continue;
      if (pName === 'pm25') reading.pm25 = val;
      if (pName === 'pm10') reading.pm10 = val;
      if (pName === 'no2') reading.no2 = val;
      if (pName === 'so2') reading.so2 = val;
      if (pName === 'co') reading.co = val > 50 ? Number((val / 1000).toFixed(2)) : val;
      if (pName === 'o3') reading.o3 = val;
      if (item.datetime?.utc) latestIso = item.datetime.utc;
    }

    if (reading.pm25 === null && reading.pm10 === null) return null;
    return {
      pollutants: reading,
      observedAt: latestIso,
      stationName: firstLoc.name ? `${firstLoc.name} (CPCB / OpenAQ v3)` : loc.stationName,
    };
  } catch {
    return null;
  }
}

async function tryFetchWaqiOfficialStation(
  loc: CityStationConfig
): Promise<{
  pollutants: PollutantReading;
  observedAt: string;
  stationName: string;
  weather: { temperatureC: number | null; humidityPct: number | null; windSpeedKmh: number | null };
} | null> {
  const token = process.env.WAQI_API_TOKEN;
  if (!token || token.includes('your_') || !loc.hasLocalOfficialStation || !loc.waqiStationQuery) {
    return null;
  }

  try {
    const url = `https://api.waqi.info/feed/${encodeURIComponent(loc.waqiStationQuery)}/?token=${encodeURIComponent(token)}`;
    const res = await fetchWithTimeout(url, 3500);
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status !== 'ok' || !json?.data?.iaqi) return null;

    const iaqi = json.data.iaqi;
    const rawPm25Iaqi = typeof iaqi.pm25?.v === 'number' ? iaqi.pm25.v : null;
    const rawPm10Iaqi = typeof iaqi.pm10?.v === 'number' ? iaqi.pm10.v : null;
    if (rawPm25Iaqi === null && rawPm10Iaqi === null) return null;

    return {
      pollutants: {
        pm25: rawPm25Iaqi !== null ? convertWaqiPm25IaqiToUgM3(rawPm25Iaqi) : null,
        pm10: rawPm10Iaqi !== null ? convertWaqiPm10IaqiToUgM3(rawPm10Iaqi) : null,
        no2: typeof iaqi.no2?.v === 'number' ? iaqi.no2.v : null,
        so2: typeof iaqi.so2?.v === 'number' ? iaqi.so2.v : null,
        co: typeof iaqi.co?.v === 'number' ? Number((iaqi.co.v / 10).toFixed(1)) : null,
        o3: typeof iaqi.o3?.v === 'number' ? iaqi.o3.v : null,
      },
      observedAt: json.data?.time?.iso ?? new Date().toISOString(),
      stationName: json.data?.city?.name || loc.stationName,
      weather: {
        temperatureC: typeof iaqi.t?.v === 'number' ? iaqi.t.v : null,
        humidityPct: typeof iaqi.h?.v === 'number' ? iaqi.h.v : null,
        windSpeedKmh: typeof iaqi.w?.v === 'number' ? iaqi.w.v * 3.6 : null,
      },
    };
  } catch {
    return null;
  }
}

async function tryFetchOpenMeteoCams(
  loc: CityStationConfig
): Promise<{
  pollutants: PollutantReading;
  observedAt: string;
  hourly: HourlyWindow[];
  hourlySource: 'cams_model_forecast' | 'diurnal_boundary_layer_estimate';
  weather: { temperatureC: number | null; humidityPct: number | null; windSpeedKmh: number | null };
} | null> {
  try {
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=pm2_5,pm10&timezone=Asia%2FKolkata&forecast_days=1`;
    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=Asia%2FKolkata&forecast_days=1`;

    const [aqRes, wxRes] = await Promise.all([
      fetchWithTimeout(aqUrl, 3800),
      fetchWithTimeout(wxUrl, 3800).catch(() => null),
    ]);

    if (!aqRes.ok) return null;
    const aqJson = await aqRes.json();
    const cur = aqJson?.current;
    if (!cur || (typeof cur.pm2_5 !== 'number' && typeof cur.pm10 !== 'number')) {
      return null;
    }

    let temperatureC: number | null = loc.offlineWeather.temperatureC;
    let humidityPct: number | null = loc.offlineWeather.humidityPct;
    let windSpeedKmh: number | null = loc.offlineWeather.windSpeedKmh;

    if (wxRes && wxRes.ok) {
      const wxJson = await wxRes.json();
      if (wxJson?.current) {
        if (typeof wxJson.current.temperature_2m === 'number') {
          temperatureC = wxJson.current.temperature_2m;
        }
        if (typeof wxJson.current.relative_humidity_2m === 'number') {
          humidityPct = wxJson.current.relative_humidity_2m;
        }
        if (typeof wxJson.current.wind_speed_10m === 'number') {
          windSpeedKmh = wxJson.current.wind_speed_10m;
        }
      }
    }

    const pollutants: PollutantReading = {
      pm25: typeof cur.pm2_5 === 'number' ? cur.pm2_5 : null,
      pm10: typeof cur.pm10 === 'number' ? cur.pm10 : null,
      no2: typeof cur.nitrogen_dioxide === 'number' ? cur.nitrogen_dioxide : null,
      so2: typeof cur.sulphur_dioxide === 'number' ? cur.sulphur_dioxide : null,
      co:
        typeof cur.carbon_monoxide === 'number'
          ? Math.round((cur.carbon_monoxide / 1000) * 100) / 100
          : null,
      o3: typeof cur.ozone === 'number' ? cur.ozone : null,
    };

    let hourly: HourlyWindow[] = [];
    let hourlySource: 'cams_model_forecast' | 'diurnal_boundary_layer_estimate' =
      'diurnal_boundary_layer_estimate';

    if (
      Array.isArray(aqJson?.hourly?.time) &&
      Array.isArray(aqJson?.hourly?.pm2_5) &&
      aqJson.hourly.time.length >= 24
    ) {
      hourlySource = 'cams_model_forecast';
      hourly = aqJson.hourly.time.slice(0, 24).map((tStr: string, idx: number) => {
        const pm25 = Math.max(
          2,
          Math.round(Number(aqJson.hourly.pm2_5[idx] ?? pollutants.pm25 ?? 50))
        );
        const pm10 = Math.max(
          5,
          Math.round(Number(aqJson.hourly.pm10?.[idx] ?? pm25 * 1.5))
        );
        const s25 = calculatePollutantSubIndex('pm25', pm25).subIndex ?? 50;
        const s10 = calculatePollutantSubIndex('pm10', pm10).subIndex ?? 50;
        const naqi = Math.max(s25, s10);
        return {
          hourLabel: tStr.slice(11, 16) || `${String(idx).padStart(2, '0')}:00`,
          hour24: idx,
          pm25,
          naqi,
          category: classifyNaqiScore(naqi),
          isSaferWindow: idx >= 12 && idx <= 16 && naqi < 350,
        };
      });
    } else {
      hourly = generateDiurnalHourlyCurve(pollutants.pm25 ?? 120);
    }

    return {
      pollutants,
      observedAt: new Date().toISOString(),
      hourly,
      hourlySource,
      weather: { temperatureC, humidityPct, windSpeedKmh },
    };
  } catch {
    return null;
  }
}

interface AssembleReportParams {
  loc: CityStationConfig;
  stationName: string;
  pollutants: PollutantReading;
  weatherRaw: { temperatureC: number | null; humidityPct: number | null; windSpeedKmh: number | null };
  observedIso: string;
  now: Date;
  simulateMode: 'normal' | 'stale' | 'offline' | 'no_station';
  sourceName: string;
  sourceTier: 'tier1_official_station' | 'tier2_secondary_model' | 'tier3_offline_reference';
  sourceUrl: string;
  isOfficialStation: boolean;
  hourly?: HourlyWindow[];
  hourlyForecastSource?: 'cams_model_forecast' | 'diurnal_boundary_layer_estimate';
  degradedReason?: string;
}

function assembleAirQualityReport(params: AssembleReportParams): AirQualityReport {
  const computed = computeOverallNaqi(params.pollutants);
  const { freshness, dataAgeMinutes } = evaluateFreshness(
    params.observedIso,
    params.now.getTime(),
    params.sourceTier,
    params.simulateMode
  );
  const hourly =
    params.hourly ?? generateDiurnalHourlyCurve(params.pollutants.pm25 ?? 150);

  return {
    locationId: params.loc.id,
    city: params.loc.city,
    state: params.loc.state,
    stationName: params.stationName,
    coordinates: { lat: params.loc.lat, lon: params.loc.lon },
    observedAt: params.observedIso,
    fetchedAt: params.now.toISOString(),
    dataAgeMinutes,
    naqi: computed.naqi,
    category: computed.category,
    dominantPollutant: computed.dominantPollutant,
    whoPm25Multiple: computed.whoPm25Multiple,
    healthSummary: getHealthSummaryForCategory(
      computed.category,
      computed.naqi,
      computed.whoPm25Multiple
    ),
    pollutants: params.pollutants,
    subIndices: computed.subIndices,
    weather: buildWeatherContext(
      params.weatherRaw.temperatureC,
      params.weatherRaw.humidityPct,
      params.weatherRaw.windSpeedKmh
    ),
    hourlyForecast: hourly,
    hourlyForecastSource:
      params.hourlyForecastSource ?? 'diurnal_boundary_layer_estimate',
    saferOutdoorWindow: identifySaferOutdoorWindow(hourly, computed.naqi),
    freshness,
    sourceName: params.sourceName,
    sourceTier: params.sourceTier,
    sourceUrl: params.sourceUrl,
    isOfficialStation: params.isOfficialStation,
    degradedReason: params.degradedReason,
  };
}

export async function getAirQualityReport(
  cityId: string,
  simulateMode: 'normal' | 'stale' | 'offline' | 'no_station' = 'normal'
): Promise<AirQualityReport> {
  const baseLoc = resolveLocationConfig(cityId);
  const loc: CityStationConfig =
    simulateMode === 'no_station'
      ? {
          ...baseLoc,
          hasLocalOfficialStation: false,
          stationName: `${baseLoc.city} Regional Grid (No Local CPCB CAAQMS Station)`,
        }
      : baseLoc;

  const now = new Date();
  const staleIso = new Date(now.getTime() - 6 * 3600 * 1000).toISOString();
  const staleReason =
    'Station telemetry is older than 4 hours (Stale Reading). Applying conservative precautionary safety rules.';

  if (simulateMode !== 'offline') {
    const cpcbGovData = await tryFetchCpcbDataGovStation(loc);
    if (cpcbGovData) {
      return assembleAirQualityReport({
        loc,
        stationName: cpcbGovData.stationName,
        pollutants: cpcbGovData.pollutants,
        weatherRaw: loc.offlineWeather,
        observedIso: simulateMode === 'stale' ? staleIso : cpcbGovData.observedAt,
        now,
        simulateMode,
        sourceName: 'Official CPCB Open Government Data Platform India (api.data.gov.in)',
        sourceTier: 'tier1_official_station',
        sourceUrl: 'https://www.data.gov.in/resource/real-time-air-quality-index-various-locations',
        isOfficialStation: true,
        degradedReason: simulateMode === 'stale' ? staleReason : undefined,
      });
    }

    const openAqData = await tryFetchOpenAqOfficialStation(loc);
    if (openAqData) {
      return assembleAirQualityReport({
        loc,
        stationName: openAqData.stationName,
        pollutants: openAqData.pollutants,
        weatherRaw: loc.offlineWeather,
        observedIso: simulateMode === 'stale' ? staleIso : openAqData.observedAt,
        now,
        simulateMode,
        sourceName: 'CPCB / State PCB Continuous Monitoring Station (via OpenAQ v3 Official Feed)',
        sourceTier: 'tier1_official_station',
        sourceUrl: 'https://openaq.org/',
        isOfficialStation: true,
        degradedReason: simulateMode === 'stale' ? staleReason : undefined,
      });
    }

    const waqiData = await tryFetchWaqiOfficialStation(loc);
    if (waqiData) {
      return assembleAirQualityReport({
        loc,
        stationName: waqiData.stationName,
        pollutants: waqiData.pollutants,
        weatherRaw: waqiData.weather,
        observedIso: simulateMode === 'stale' ? staleIso : waqiData.observedAt,
        now,
        simulateMode,
        sourceName: 'CPCB / State PCB Continuous Monitoring Station (via WAQI Official Relay)',
        sourceTier: 'tier1_official_station',
        sourceUrl: 'https://airquality.cpcb.gov.in/',
        isOfficialStation: true,
        degradedReason: simulateMode === 'stale' ? staleReason : undefined,
      });
    }

    const meteoData = await tryFetchOpenMeteoCams(loc);
    if (meteoData) {
      const noStationNote = !loc.hasLocalOfficialStation
        ? 'No official CPCB ground monitoring station exists in this locality; showing regional atmospheric grid estimate.'
        : undefined;

      return assembleAirQualityReport({
        loc,
        stationName: loc.stationName,
        pollutants: meteoData.pollutants,
        weatherRaw: meteoData.weather,
        observedIso: simulateMode === 'stale' ? staleIso : meteoData.observedAt,
        now,
        simulateMode,
        sourceName: loc.hasLocalOfficialStation
          ? 'Open-Meteo / Copernicus CAMS Atmospheric Feed (CPCB NAQI Breakpoints Applied)'
          : 'Regional Copernicus CAMS Atmospheric Estimate (No Local CPCB Ground Station)',
        sourceTier: 'tier2_secondary_model',
        sourceUrl: 'https://open-meteo.com/en/docs/air-quality-api',
        isOfficialStation: false,
        hourly: meteoData.hourly,
        hourlyForecastSource: meteoData.hourlySource,
        degradedReason:
          simulateMode === 'stale'
            ? 'Atmospheric telemetry timestamp exceeds 4-hour freshness threshold. Conservative safety rules active.'
            : noStationNote,
      });
    }
  }

  return assembleAirQualityReport({
    loc,
    stationName: `${loc.stationName} [Offline Reference Baseline]`,
    pollutants: loc.offlineReferencePollutants,
    weatherRaw: loc.offlineWeather,
    observedIso: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
    now,
    simulateMode: 'offline',
    sourceName: 'CPCB Winter Smog Historical Reference Baseline (Live Telemetry Unreachable)',
    sourceTier: 'tier3_offline_reference',
    sourceUrl: 'https://cpcb.nic.in/National-Air-Quality-Index/',
    isOfficialStation: false,
    degradedReason:
      'Live environmental provider is currently unreachable or in offline test mode. Displaying clearly labeled historical winter baseline for this station so your household retains conservative protection guidance.',
  });
}
