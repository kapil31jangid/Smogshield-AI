import { NextRequest, NextResponse } from 'next/server';
import { AssistantRequestSchema } from '@/lib/validators/schemas';
import { generateContextualAssistantReply } from '@/lib/ai/assistant';
import {
  buildGuardErrorResponse,
  evaluateSensitiveOperationGuard,
} from '@/lib/security/sensitive-ops';

/**
 * @security Sensitive Operation: GenAI Assistant Invocation
 * Protected by Same-Origin CSRF boundary, Content-Type verification (415),
 * 16 KB payload ceiling (413), sliding-window IP rate limiting (429),
 * Zod runtime schema validation (400), and post-generation deterministic guardrails.
 */
export async function POST(request: NextRequest) {
  const guard = evaluateSensitiveOperationGuard(request, {
    routeKey: 'assistant',
    maxRequestsPerWindow: 25,
    windowMs: 60_000,
    maxPayloadBytes: 16_384,
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
      {
        error: 'INVALID_JSON_PAYLOAD',
        message: 'Request body must be valid JSON.',
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const parsed = AssistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'VALIDATION_FAILED',
        message: 'Assistant request failed input validation.',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const { question, language, profile, airQualityContext } = parsed.data;
  const responsePayload = await generateContextualAssistantReply(
    question,
    language,
    profile,
    airQualityContext
  );

  return NextResponse.json(responsePayload, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
