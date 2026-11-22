import { PollutantReading } from '@/types/smogshield';

/**
 * @architecture SOLID (Single Responsibility Principle)
 * Authoritative Indian CPCB CAAQMS station catalog and offline winter reference
 * baselines, separated cleanly from live HTTP telemetry acquisition logic.
 */

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
