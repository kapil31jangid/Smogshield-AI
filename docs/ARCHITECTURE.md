# SmogShield AI — Technical Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js App Router                         │
├─────────────────────────────────────────────────────────────────┤
│  UI Layer (React + Tailwind)                                    │
│  ├── Components: Dashboard, Profiles, Assistant, Planner, etc. │
│  ├── Hooks: useAQI, useProfiles, useRecommendations            │
│  └── i18n: next-intl (Hindi + English)                          │
├─────────────────────────────────────────────────────────────────┤
│  API Routes (Server Actions + Route Handlers)                   │
│  ├── /api/aqi/[location]          → AQI data aggregation       │
│  ├── /api/recommendations         → Deterministic engine       │
│  ├── /api/assistant               → GenAI conversation         │
│  ├── /api/profiles                → Family CRUD                │
│  ├── /api/impact                  → Action tracking            │
│  └── /api/challenges              → Community features         │
├─────────────────────────────────────────────────────────────────┤
│  Domain Services (Pure TypeScript, Testable)                    │
│  ├── aqi-provider.ts              → Multi-provider adapter     │
│  ├── recommendation-engine.ts     → Rules-based logic          │
│  ├── indoor-advisor.ts            → HEPA/ventilation guidance  │
│  ├── emission-planner.ts          → Low-emission alternatives  │
│  ├── impact-calculator.ts         → Emissions estimation       │
│  └── ai-orchestrator.ts           → GenAI with fallback        │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer                                                      │
│  ├── Firebase Auth                 → Google OAuth               │
│  ├── Firestore                     → Profiles, actions, challenges│
│  ├── Local JSON (dev)              → Demo data fallback        │
│  └── Provider Cache (in-memory)    → 15-min TTL                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Specifications

### 1. AQI Provider Adapter (`src/lib/aqi/providers/`)

**Interface** (`AQIProvider`):
```typescript
interface AQIProvider {
  readonly name: string;
  readonly attribution: string;
  fetchCurrent(location: Location): Promise<AQIReading | null>;
  fetchHistorical(location: Location, days: number): Promise<AQIReading[]>;
  isConfigured(): boolean;
}
```

**Implementations**:
- `OpenAQProvider` — Primary, global coverage, free tier
- `WAQIProvider` — Secondary, better Indian coverage
- `DemoProvider` — Static curated dataset for Indian metros

**Aggregation Logic** (`aqi-aggregator.ts`):
1. Try providers in priority order
2. Return first successful response
3. Cache result (15 min current, 1 hr historical)
4. Include `dataFreshness: 'live' | 'cached' | 'stale' | 'demo'` in response

**Data Models**:
```typescript
interface AQIReading {
  aqi: number;           // US EPA AQI scale
  pm25?: number;         // μg/m³
  pm10?: number;
  no2?: number;
  o3?: number;
  so2?: number;
  co?: number;
  timestamp: string;     // ISO 8601
  source: string;        // Provider name
  location: Location;
  dataFreshness: 'live' | 'cached' | 'stale' | 'demo';
}

interface Location {
  id: string;            // e.g., "delhi-in"
  name: string;          // "Delhi, India"
  lat: number;
  lon: number;
  timezone: string;      // "Asia/Kolkata"
}
```

---

### 2. Recommendation Engine (`src/lib/recommendations/engine.ts`)

**Core Principle**: Deterministic, rules-based, zero AI dependency for safety-critical logic.

**Input**:
```typescript
interface RecommendationContext {
  aqi: AQIReading;
  profiles: HouseholdProfile[];
  plannedActivities: PlannedActivity[];
  indoorConditions?: IndoorConditions;
  travelPatterns?: TravelPattern[];
}
```

**Output**:
```typescript
interface Recommendation {
  id: string;
  action: string;                    // "Postpone outdoor exercise"
  reason: string;                    // "PM2.5 at 85 μg/m³ exceeds WHO 24-hr guideline of 15 μg/m³"
  supportingData: string;            // "Current AQI: 156 (Unhealthy), PM2.5: 85 μg/m³"
  priority: 'critical' | 'high' | 'medium' | 'low';
  timeWindow: string;                // "Next 4 hours"
  limitations: string[];             // ["Based on outdoor AQI only; indoor may differ"]
  category: 'outdoor' | 'indoor' | 'travel' | 'community' | 'lifestyle';
}
```

**Rule Categories**:

| AQI Category | PM2.5 (μg/m³) | Outdoor Activity | Ventilation | Purifier |
|--------------|---------------|------------------|-------------|----------|
| Good (0-50) | 0-12 | Normal | Normal | Optional |
| Moderate (51-100) | 12-35 | Sensitive groups limit | Normal | Recommended |
| Unhealthy for Sensitive (101-150) | 35-55 | Limit all | Limit | Strongly recommended |
| Unhealthy (151-200) | 55-150 | Avoid | Avoid | Essential |
| Very Unhealthy (201-300) | 150-250 | Avoid all | Avoid | Essential + seal |
| Hazardous (301+) | 250+ | Emergency only | Emergency only | Maximum |

**Special Rules**:
- Children/older adults: Downgrade one category
- Asthma/respiratory: Downgrade two categories
- Essential travel: N95/KN95 + minimize duration
- Indoor sources: No smoking, no incense, exhaust fans for cooking
- Purifier sizing: CADR ≥ 2/3 × room volume (ft³) for 5 ACH

---

### 3. Indoor Air Protection Advisor (`src/lib/indoor/advisor.ts`)

**Guidance Areas**:
1. **Source Control**: Smoking, incense, candles, gas cooking without ventilation
2. **Filtration**: HEPA selection (CADR rating), filter replacement schedule
3. **Ventilation**: When to open windows (outdoor AQI < indoor AQI), cross-ventilation
4. **Monitoring**: Low-cost sensor limitations, placement guidance
5. **Myths**: Plants (negligible), ionizers (ozone risk), UV (limited evidence)

**Never Recommends**: Ozone generators, sealing homes without CO monitoring.

---

### 4. Low-Emission Planner (`src/lib/planner/emissions.ts`)

**Alternatives Matrix**:
| Trip Type | Default | Cleaner Alternative | AQI Condition |
|-----------|---------|---------------------|---------------|
| Commute | Solo car | Metro/bus/carpool | Any |
| Short errand | Car | Walk/cycle | AQI < 100 |
| School run | Car | Walking bus/carpool | AQI < 150 |
| Weekend | Car | Public transit | Any |

**Environmental Reasoning**: Shows CO₂e saved per trip (based on Indian grid/vehicle averages), with assumptions documented.

---

### 5. GenAI Assistant (`src/lib/ai/orchestrator.ts`)

**Architecture**:
```
User Message
    ↓
Input Validation + Sanitization
    ↓
Context Assembly (AQI + Profiles + History)
    ↓
System Prompt (Grounded, Constrained)
    ↓
Gemini API Call (Structured Output)
    ↓
Output Validation + Safety Filter
    ↓
Response + Citations
```

**Fallback**: If AI fails → deterministic response from recommendation engine + "AI unavailable" notice.

**System Prompt Principles**:
- Never invent AQI readings
- Never give medical advice
- Cite data sources
- Defer to deterministic engine for recommendations
- Hindi/English bilingual

---

### 6. Data Models (Firestore)

**Collections**:
```
users/{uid}
  ├── profiles/{profileId}          // Household members
  ├── actions/{actionId}            // Tracked low-emission actions
  ├── challenges/{challengeId}      // Community participation
  └── preferences/{prefId}          // Language, notifications, units

cities/{cityId}                     // Cached AQI (optional, for demo)
  ├── current                       // Latest reading
  └── historical/{date}             // Daily aggregates
```

**Security Rules**:
- Users read/write only own data
- Challenges: read all, write own participation
- No direct browser access to admin operations

---

## API Route Design

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/aqi/[location]` | GET | Current + historical AQI | Optional |
| `/api/recommendations` | POST | Generate personalized recs | Required |
| `/api/assistant` | POST | GenAI conversation | Required |
| `/api/profiles` | GET/POST/PATCH/DELETE | Family profiles CRUD | Required |
| `/api/impact` | GET/POST | Action tracking | Required |
| `/api/challenges` | GET/POST | Community challenges | Required |
| `/api/scheduler/tick` | GET | Daily refresh (cron) | CRON_SECRET |

---

## Caching Strategy

| Data Type | Cache TTL | Invalidation |
|-----------|-----------|--------------|
| Current AQI | 15 minutes | Time-based + manual refresh |
| Historical AQI | 1 hour | Time-based |
| Recommendations | 15 minutes | On AQI change or profile update |
| Demo Data | 24 hours | Build-time |
| AI Responses | No cache | N/A |

**Implementation**: In-memory Map with TTL (serverless-friendly) + `Cache-Control` headers.

---

## Deployment Architecture

**Vercel Configuration** (`vercel.ts`):
- Framework: Next.js
- Functions: Node.js 24 LTS (Fluid Compute)
- Cron: Daily AQI refresh at 6 AM IST
- Regions: Mumbai (sin1) for Indian users
- Env: Validated at build + runtime

**Environment Variables**:
```bash
# Required
NEXT_PUBLIC_FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_JSON=  # Base64 encoded
NEXT_PUBLIC_GEMINI_API_KEY=     # Or server-side only
OPENAQ_API_KEY=                 # Optional, higher rate limits
WAQI_API_KEY=                   # Optional

# Optional
BREVO_API_KEY=                  # Email notifications
NEXT_PUBLIC_APP_URL=            # Production URL
CRON_SECRET=                    # Scheduler auth
```

---

## Security Checklist

- [ ] All API keys server-side only (except Firebase config)
- [ ] Input validation with Zod on every route
- [ ] Rate limiting: 60 req/min per IP on AI, 120 on AQI
- [ ] Firestore rules deny unauthorized access
- [ ] HttpOnly, Secure, SameSite=Strict cookies
- [ ] CSP headers via Next.js middleware
- [ ] Dependency scanning in CI
- [ ] No secrets in repo (`.env.example` only)

---

## Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3s |
| AQI API Response (cached) | < 200ms |
| AQI API Response (live) | < 2s |
| AI Response (streaming) | First token < 1s |
| Bundle Size (gzipped) | < 150 KB |

---

## Testing Strategy

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit | Vitest | 90% on pure logic (recs, calculations, parsing) |
| Integration | Vitest + MSW | API routes, provider adapters, auth |
| E2E | Playwright | 5 critical journeys |
| Accessibility | axe-core + Playwright | WCAG 2.1 AA |
| Type Safety | tsc --noEmit | Zero errors |

---

## Future Extensibility

- **Additional Providers**: Add new `AQIProvider` implementation
- **New Languages**: Add locale files to `next-intl`
- **New Pollutants**: Extend `AQIReading` + recommendation rules
- **Wearable Integration**: Add `IndoorConditions` from sensors
- **Municipal Data**: Official government AQI endpoints
- **Satellite Data**: Complement ground stations