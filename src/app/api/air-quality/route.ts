import { NextRequest, NextResponse } from 'next/server';
import { AirQualityQuerySchema } from '@/lib/validators/schemas';
import { getAirQualityReport, INDIAN_MONITORING_LOCATIONS } from '@/lib/aqi/provider';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawCity = searchParams.get('city') ?? 'delhi-anand-vihar';
  const rawSimulate = searchParams.get('simulate') ?? 'normal';

  const parsed = AirQualityQuerySchema.safeParse({
    city: rawCity,
    simulate: rawSimulate,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'INVALID_QUERY_PARAMETERS',
        message: 'Invalid city or simulation mode parameter.',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const report = await getAirQualityReport(
    parsed.data.city,
    parsed.data.simulate
  );

  return NextResponse.json(
    {
      report,
      availableLocations: INDIAN_MONITORING_LOCATIONS.map((loc) => ({
        id: loc.id,
        city: loc.city,
        state: loc.state,
        stationName: loc.stationName,
        hasLocalOfficialStation: loc.hasLocalOfficialStation,
      })),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
