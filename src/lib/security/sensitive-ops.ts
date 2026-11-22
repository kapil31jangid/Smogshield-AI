import { NextRequest, NextResponse } from 'next/server';
import { ISensitiveOperationGuardResult } from '@/lib/contracts/interfaces';
import { checkRateLimit } from './rate-limit';

/**
 * @security Sensitive Operation Protection Layer
 * Centralizes origin/CSRF boundary checks, payload size enforcement (413),
 * Content-Type validation (415), sliding-window IP rate limiting (429), and
 * anti-caching headers (Cache-Control: no-store) for all API routes.
 */

export interface SensitiveOperationPolicy {
  routeKey: string;
  maxRequestsPerWindow: number;
  windowMs: number;
  maxPayloadBytes?: number;
  requireJsonContentType?: boolean;
  enforceSameOriginOnMutation?: boolean;
}

export function extractClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  return realIp || 'local-client';
}

export function validateSameOriginBoundary(req: NextRequest): boolean {
  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'same-site' && secFetchSite !== 'none') {
    return false;
  }

  const origin = req.headers.get('origin');
  if (!origin) return true; // Direct server/CLI/test calls without browser Origin header

  const host = req.headers.get('host');
  if (!host) return true;

  try {
    const parsedOrigin = new URL(origin);
    return parsedOrigin.host === host;
  } catch {
    return false;
  }
}

export function evaluateSensitiveOperationGuard(
  req: NextRequest,
  policy: SensitiveOperationPolicy
): ISensitiveOperationGuardResult {
  if (policy.enforceSameOriginOnMutation && !validateSameOriginBoundary(req)) {
    return {
      allowed: false,
      status: 403,
      errorCode: 'FORBIDDEN_CROSS_ORIGIN',
      message: 'Cross-origin state-mutating request rejected by CSRF boundary policy.',
    };
  }

  if (policy.requireJsonContentType) {
    const contentType = req.headers.get('content-type') ?? '';
    if (contentType && !contentType.toLowerCase().includes('application/json')) {
      return {
        allowed: false,
        status: 415,
        errorCode: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Expected application/json request payload.',
      };
    }
  }

  if (typeof policy.maxPayloadBytes === 'number') {
    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > policy.maxPayloadBytes) {
      return {
        allowed: false,
        status: 413,
        errorCode: 'PAYLOAD_TOO_LARGE',
        message: `Request payload exceeds maximum safe size (${policy.maxPayloadBytes} bytes).`,
      };
    }
  }

  const ip = extractClientIp(req);
  const rate = checkRateLimit(
    `${policy.routeKey}:${ip}`,
    policy.maxRequestsPerWindow,
    policy.windowMs
  );

  if (!rate.allowed) {
    return {
      allowed: false,
      status: 429,
      errorCode: 'RATE_LIMITED',
      message: 'Too many requests. Please wait before retrying.',
      retryAfterSeconds: rate.retryAfterSeconds,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: rate.remaining,
  };
}

export function buildGuardErrorResponse(
  result: ISensitiveOperationGuardResult
): NextResponse {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
  };
  if (result.retryAfterSeconds) {
    headers['Retry-After'] = String(result.retryAfterSeconds);
  }
  return NextResponse.json(
    {
      error: result.errorCode ?? 'REQUEST_REJECTED',
      message: result.message ?? 'Request rejected by security policy.',
    },
    { status: result.status ?? 403, headers }
  );
}
