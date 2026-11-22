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
  const hasOpenAqKey =
    Boolean(process.env.OPENAQ_API_KEY) &&
    !process.env.OPENAQ_API_KEY!.includes('your_');

  const hasFirebaseProject = Boolean(
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );

  return NextResponse.json(
    {
      status: 'ok',
      service: 'smogshield-ai',
      timestamp: new Date().toISOString(),
      firebaseProject:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        'smogshield-ai-kapil',
      capabilities: {
        firebaseConfigured: hasFirebaseProject,
        openAqConfigured: hasOpenAqKey,
        tier1StationConfigured: hasOpenAqKey || hasWaqiToken || hasCpcbKey,
        tier2OpenMeteoCamsEnabled: true,
        tier3OfflineReferenceEnabled: true,
        genAiLiveConfigured: hasGeminiKey,
        deterministicSafetyGuardrailsActive: true,
      },
    },
    { status: 200 }
  );
}
