import { NextRequest, NextResponse } from 'next/server';
import { CommunityPledgeRequestSchema } from '@/lib/validators/schemas';
import { INITIAL_COMMUNITY_INITIATIVES } from '@/lib/engine/impact';
import { checkRateLimit } from '@/lib/security/rate-limit';

// shortcut: in-memory pledge counter per serverless instance, upgrade to SQLite/Postgres if cross-instance pledge durability is required.
const pledgeCounts = new Map<string, number>(
  INITIAL_COMMUNITY_INITIATIVES.map((item) => [item.id, item.householdsPledged])
);

export async function GET() {
  const initiatives = INITIAL_COMMUNITY_INITIATIVES.map((item) => ({
    ...item,
    householdsPledged: pledgeCounts.get(item.id) ?? item.householdsPledged,
  }));
  return NextResponse.json({ initiatives }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1';
  const limit = checkRateLimit(`community:${clientIp}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many community pledges submitted recently.',
      },
      { status: 429 }
    );
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 8_192) {
    return NextResponse.json(
      { error: 'PAYLOAD_TOO_LARGE', message: 'Request payload exceeds 8 KB limit.' },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'INVALID_JSON', message: 'Invalid JSON payload.' },
      { status: 400 }
    );
  }

  const parsed = CommunityPledgeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'VALIDATION_FAILED',
        message: 'Invalid initiative ID.',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { initiativeId } = parsed.data;
  if (!pledgeCounts.has(initiativeId)) {
    return NextResponse.json(
      { error: 'NOT_FOUND', message: 'Community initiative not found.' },
      { status: 404 }
    );
  }

  const nextCount = (pledgeCounts.get(initiativeId) ?? 100) + 1;
  pledgeCounts.set(initiativeId, nextCount);

  return NextResponse.json(
    {
      initiativeId,
      householdsPledged: nextCount,
      status: 'PLEDGED',
    },
    { status: 200 }
  );
}
