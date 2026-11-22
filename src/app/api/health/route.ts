import { NextResponse } from 'next/server';

export async function GET() {
  const hasGeminiKey =
    Boolean(process.env.GEMINI_API_KEY) &&
    !process.env.GEMINI_API_KEY!.includes('your_');
  const hasWaqiToken =
    Boolean(process.env.WAQI_API_TOKEN) &&
    !process.env.WAQI_API_TOKEN!.includes('your_');
  const hasCpcbKey =
    Boolean(process.env.CPCB_DATA_GOV_API_KEY) &&
    !process.env.CPCB_DATA_GOV_API_KEY!.includes('your_');

  return NextResponse.json(
    {
      status: 'ok',
      service: 'smogshield-ai',
      timestamp: new Date().toISOString(),
      capabilities: {
        tier1StationConfigured: hasWaqiToken || hasCpcbKey,
        tier2OpenMeteoCamsEnabled: true,
        tier3OfflineReferenceEnabled: true,
        genAiLiveConfigured: hasGeminiKey,
        deterministicSafetyGuardrailsActive: true,
      },
    },
    { status: 200 }
  );
}
