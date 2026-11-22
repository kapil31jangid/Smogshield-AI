import { NextRequest, NextResponse } from 'next/server';
import { CommunityPledgeRequestSchema } from '@/lib/validators/schemas';
import { INITIAL_COMMUNITY_INITIATIVES } from '@/lib/engine/impact';
import {
  buildGuardErrorResponse,
  evaluateSensitiveOperationGuard,
} from '@/lib/security/sensitive-ops';

// shortcut: in-memory pledge counter per serverless instance, upgrade to SQLite/Postgres if cross-instance pledge durability is required.
const pledgeCounts = new Map<string, number>(
  INITIAL_COMMUNITY_INITIATIVES.map((item) => [item.id, item.householdsPledged])
);

export async function GET(request: NextRequest) {
  const guard = evaluateSensitiveOperationGuard(request, {
    routeKey: 'community-read',
    maxRequestsPerWindow: 60,
    windowMs: 60_000,
  });
  if (!guard.allowed) {
    return buildGuardErrorResponse(guard);
  }

  const initiatives = INITIAL_COMMUNITY_INITIATIVES.map((item) => ({
    ...item,
    householdsPledged: pledgeCounts.get(item.id) ?? item.householdsPledged,
  }));
  return NextResponse.json(
    { initiatives },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * @security Sensitive Operation: State-Mutating Community Pledge
 * Protected by Same-Origin CSRF boundary, Content-Type verification (415),
 * 8 KB payload ceiling (413), sliding-window IP rate limiting (429), and Zod validation.
 */
export async function POST(request: NextRequest) {
  const guard = evaluateSensitiveOperationGuard(request, {
    routeKey: 'community-write',
    maxRequestsPerWindow: 20,
    windowMs: 60_000,
    maxPayloadBytes: 8_192,
    requireJsonContentType: true,
    enforceSameOriginOnMutation: true,
  });

  if (!guard.allowed) {
    return buildGuardErrorResponse(guard);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'INVALID_JSON', message: 'Invalid JSON payload.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
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
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const { initiativeId } = parsed.data;
  if (!pledgeCounts.has(initiativeId)) {
    return NextResponse.json(
      { error: 'NOT_FOUND', message: 'Community initiative not found.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
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
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
