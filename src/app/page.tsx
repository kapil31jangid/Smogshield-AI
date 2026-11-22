import { getAirQualityReport, INDIAN_MONITORING_LOCATIONS } from '@/lib/aqi/provider';
import SmogShieldWorkspace from '@/components/SmogShieldWorkspace';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const initialReport = await getAirQualityReport('delhi-anand-vihar', 'normal');
  const locations = INDIAN_MONITORING_LOCATIONS.map((loc) => ({
    id: loc.id,
    city: loc.city,
    state: loc.state,
    stationName: loc.stationName,
    hasLocalOfficialStation: loc.hasLocalOfficialStation,
  }));

  return (
    <SmogShieldWorkspace
      initialReport={initialReport}
      locations={locations}
    />
  );
}
