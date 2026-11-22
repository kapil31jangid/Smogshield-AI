import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { checkRateLimit } from './rate-limit';
import {
  evaluateSensitiveOperationGuard,
  validateSameOriginBoundary,
} from './sensitive-ops';

describe('Security Layer: Rate Limiter & Sensitive Operation Protection', () => {
  it('allows requests up to threshold and blocks excess with retryAfterSeconds', () => {
    const key = `unit-rl-${Date.now()}`;
    expect(checkRateLimit(key, 2, 30_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 30_000).allowed).toBe(true);
    const blocked = checkRateLimit(key, 2, 30_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it('rejects cross-origin state-mutating requests with HTTP 403', () => {
    const req = new NextRequest('http://localhost:3000/api/community', {
      method: 'POST',
      headers: {
        host: 'smogshield-ai-woad.vercel.app',
        origin: 'https://evil-attacker.example.com',
        'sec-fetch-site': 'cross-site',
        'content-type': 'application/json',
      },
    });
    expect(validateSameOriginBoundary(req)).toBe(false);
    const res = evaluateSensitiveOperationGuard(req, {
      routeKey: 'test-csrf',
      maxRequestsPerWindow: 10,
      windowMs: 60_000,
      enforceSameOriginOnMutation: true,
    });
    expect(res.allowed).toBe(false);
    expect(res.status).toBe(403);
  });

  it('rejects non-JSON content types with HTTP 415 and oversized bodies with HTTP 413', () => {
    const badTypeReq = new NextRequest('http://localhost:3000/api/assistant', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
    });
    const res415 = evaluateSensitiveOperationGuard(badTypeReq, {
      routeKey: 'test-415',
      maxRequestsPerWindow: 10,
      windowMs: 60_000,
      requireJsonContentType: true,
    });
    expect(res415.status).toBe(415);

    const largeReq = new NextRequest('http://localhost:3000/api/assistant', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '99999',
      },
    });
    const res413 = evaluateSensitiveOperationGuard(largeReq, {
      routeKey: 'test-413',
      maxRequestsPerWindow: 10,
      windowMs: 60_000,
      maxPayloadBytes: 16_384,
    });
    expect(res413.status).toBe(413);
  });
});
