import { NextRequest, NextResponse } from 'next/server';
import { AssistantRequestSchema } from '@/lib/validators/schemas';
import { generateContextualAssistantReply } from '@/lib/ai/assistant';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1';

  const limit = checkRateLimit(`assistant:${clientIp}`, 25, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please wait ${limit.retryAfterSeconds} seconds before sending another question.`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSeconds) },
      }
    );
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
      { status: 400 }
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
      { status: 400 }
    );
  }

  const { question, language, profile, airQualityContext } = parsed.data;
  const responsePayload = await generateContextualAssistantReply(
    question,
    language,
    profile,
    airQualityContext
  );

  return NextResponse.json(responsePayload, { status: 200 });
}
