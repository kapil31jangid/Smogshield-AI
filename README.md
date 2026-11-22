# SmogShield AI (`स्मॉगशील्ड एआई`)

**From Air-Quality Awareness to Actionable Family Protection.**

SmogShield AI is a family-focused, deterministic + generative AI environmental intelligence platform engineered to help Indian households and communities navigate severe winter smog and urban air pollution.

- **Public Deployment Link:** [https://smogshield-ai.vercel.app](https://smogshield-ai.vercel.app) *(also supports Firebase / self-hosted Node.js 20+ / 24+ deployments)*
- **Repository:** [https://github.com/kapil31jangid/Smogshield-AI](https://github.com/kapil31jangid/Smogshield-AI)

---

## 1. Project Name and Problem Statement

Every winter across Northern and Central India (and increasingly across major urban corridors nationwide), thermal inversions, vehicular cold-start emissions, biomass heating, and atmospheric stagnation trap hazardous levels of $\text{PM}_{2.5}$, $\text{PM}_{10}$, and $\text{NO}_2$ close to ground level.

Families face a daily decision gap:
- Standard AQI apps display raw numbers (often using US-EPA scales rather than India's official CPCB National Air Quality Index) without explaining **what a family should actually do differently at 07:00 AM vs. 02:00 PM vs. 10:00 PM**.
- Generic AI chatbots offer vague advice (*"buy an air purifier, stay indoors"*) that fails low-budget households, commuters who must travel to work or school, and communities trying to stop local pollution sources like nighttime guard bonfires or school-gate vehicle idling.

**SmogShield AI** bridges this gap by transforming validated environmental telemetry and household context into a prioritized, traceable, 7-slot daily protection plan, honest indoor-air guidance, low-emission lifestyle alternatives, and a safety-guarded bilingual (`English` / `हिन्दी`) GenAI Family Assistant.

---

## 2. Product Vertical

**Climate Tech, Environmental Public-Health Intelligence & Sustainable Household Decision Support** (PromptWars Winter Smog & Urban Air Pollution Challenge).

---

## 3. What SmogShield AI Does

SmogShield AI answers five essential daily questions for every household:
1. **What is the current air-quality situation where I live?** (Module A: Live Air Intelligence with official CPCB NAQI sub-indices, dominant pollutant, WHO 2021 daily multiple, thermal inversion risk, 24-hour diurnal curve, and explicit data freshness badges).
2. **How does it affect my household's daily activities?** (Module B: Privacy-first Family Protection Profiles capturing age groups, respiratory sensitivity, commute modes, cooking setup, equipment, and resource/budget tier without collecting PII).
3. **What should my family do differently today?** (Modules C & D: Personalized 7-Slot Daily Action Planner & Smart Exposure Reduction Engine covering Morning Routine, School/Work Commute, Exercise, Shopping/Errands, Cooking/Indoor Air, Evening Routine, and Overnight Sleep Sanctuary).
4. **How can we reduce our pollution exposure and environmental impact?** (Modules E, F & G: Evidence-based Indoor Air Protection Assistant with scientific limitation disclosures, Low-Emission Lifestyle Planner distinguishing exposure vs. indoor air vs. emissions, and a Bilingual GenAI Family Assistant).
5. **What practical changes can we sustain over the coming days?** (Modules H & I: Honest Pollution Impact Tracker with transparent physics equations and a Community Action Hub for RWA and school-gate initiatives).

---

## 4. Approach and Underlying Logic (The 9-Step Recommendation Pipeline)

Unlike static AQI dashboards or ungrounded LLM wrappers, SmogShield AI executes a strict **9-step deterministic + contextual pipeline**:

1. **Collect Environmental Data:** Queries Tier 1 official station feeds (`CPCB` / `WAQI`) or Tier 2 atmospheric models (`Open-Meteo Copernicus CAMS`) or Tier 3 explicitly labeled offline winter baselines.
2. **Validate Source, Timestamp & Freshness:** Classifies telemetry into `live` (<75 min), `delayed` (75–240 min), `stale` (>240 min), `estimated` (atmospheric model with CPCB NAQI formula), or `unavailable` (degraded offline snapshot).
3. **Evaluate Household Context:** Inspects household vulnerability (`infants`, `children`, `elderly`, respiratory sensitivity), commute distance/mode, kitchen ventilation, and budget tier (`standard` vs. `limited_budget`).
4. **Apply Deterministic Safety Rules:** Computes an **Effective Safety NAQI** (adding a `+50 NAQI` conservative buffer when data is stale/unavailable and `+35 NAQI` when vulnerable members are present) and evaluates pure TypeScript rules (`RULE_MORNING_INVERSION_LOCKDOWN`, `RULE_EXERCISE_INDOOR_MANDATORY`, `RULE_NIGHT_LOW_COST_DRAFT_SEAL`, etc.).
5. **Generate Prioritized Recommendations:** Outputs chronological daily slots with `critical`, `high`, `moderate`, or `routine` priority.
6. **Explain Reasoning & Evidence Basis:** Every card displays **What to do**, **Why it matters**, **When to do it**, **Safer alternative**, the exact **Rule ID**, and an **Evidence Basis badge** (`Based on Measured Data`, `Deterministic Safety Rule`, or `Atmospheric Model Estimate`).
7. **Enable Family Action:** Interactive completion toggles allow families to log actions taken.
8. **Track Honest Impact:** Computes inhaled $\text{PM}_{2.5}$ dose avoided ($\mu\text{g}$) and tailpipe emissions saved ($\text{g}\ \text{CO}_2\text{e}$, $\text{mg}\ \text{PM}_{2.5}$) with full formula disclosure.
9. **Recalculate Dynamically:** Any change to location, telemetry condition, language, or family profile immediately re-evaluates all modules.

---

## 5. How the Application Operates

- **Zero-Friction Instant Access:** Users land directly in the functional SmogShield AI workspace—no mandatory account wall or OAuth spinner blocks access.
- **Instant Family Scenario Presets:** One-click presets let evaluators and families test:
  1. *Delhi Joint Family (Children & Grandparents)*
  2. *Budget Commuter Family (No Purifier / Two-Wheeler)*
  3. *Young Parents with Infant (Remote / Car Commute)*
  4. *Active Metro Commuters (Hindi / दिल्ली मेट्रो परिवार)*
- **Telemetry Condition Inspector:** Includes an interactive selector to verify behavior under **Live/Standard Feed**, **Stale Telemetry (>4h)**, **No Local Ground Station**, and **Provider Offline (Degraded)** conditions.

---

## 6. Data Sources and Their Limitations

| Tier | Source | Role & Methodology | Known Limitations |
|---|---|---|---|
| **Tier 1** | Official CPCB / State PCB CAAQMS Stations (via `CPCB_DATA_GOV_API_KEY` or `WAQI_API_TOKEN`) | Ground-truth continuous ambient monitoring stations across Indian cities. | Station coverage is sparse in peri-urban and rural districts; individual sensors occasionally experience maintenance delays. |
| **Tier 2** | Open-Meteo Air Quality & Weather API (Copernicus CAMS + WMO) | Provides key-free real-time & 24-hour hourly raw concentrations ($\mu\text{g/m}^3$) for $\text{PM}_{2.5}, \text{PM}_{10}, \text{NO}_2, \text{SO}_2, \text{CO}, \text{O}_3$ plus temperature, wind speed, and humidity. SmogShield AI applies the official Indian CPCB NAQI sub-index breakpoint equations to these raw concentrations. | Gridded atmospheric model (~11–40 km resolution) can smooth out hyper-local street-canyon or intersection spikes; explicitly badged as `Atmospheric Model Estimate`. |
| **Tier 3** | CPCB Historical Winter Reference Baseline | Guarantees deterministic safety guidance when outbound network connectivity is down. | Explicitly badged as `Live Feed Unavailable (Offline Reference Baseline)` with a prominent warning banner; never presented as live telemetry. |

---

## 7. AI Functionality and Safeguards

- **Context-Grounded Prompting:** `/api/assistant` injects the validated station reading, NAQI category, freshness status, afternoon dispersion window, and active family profile into the system context.
- **Strict Separation of Deterministic Safety Rules vs. AI:**
  - The LLM **never** decides AQI thresholds or safety categories.
  - A post-generation deterministic safety validator (`enforceDeterministicSafetyGuardrail`) inspects AI output before delivery; if an LLM response ever suggests outdoor running/jogging or unmasked exertion when $\text{NAQI} \ge 201$, it is automatically intercepted and overridden by the deterministic safety rule.
- **Prompt-Injection Defense:** User inputs are validated via `zod` (length-bounded to 600 chars) and scrubbed of instruction-override or HTML/script tokens via `sanitizeUserPrompt`.
- **Public-Health Medical Guardrails:** Queries mentioning symptoms, asthma, inhalers, pregnancy, infants, or medication automatically append a conservative public-health notice advising consultation with a qualified medical professional.
- **100% Resilient Deterministic Fallback:** If `GEMINI_API_KEY` is not configured or the upstream AI service is rate-limited/unreachable, `/api/assistant` seamlessly responds using the built-in bilingual deterministic rule-grounded responder (`providerMode: "deterministic_fallback"`).

---

## 8. Key Assumptions and Scientific Disclosures

1. **Inhaled $\text{PM}_{2.5}$ Dose Calculation:**
   $$\text{Dose Avoided (\mu g)} = \left(V_{\text{activity}} \times C_{\text{outdoor}} - V_{\text{alternative}} \times C_{\text{protected}}\right) \times t$$
   where respiratory minute ventilation rates ($V$) follow US EPA / ICMR exposure handbooks ($0.008\text{–}0.009\ \text{m}^3/\text{min}$ resting indoors vs. $0.022\text{–}0.035\ \text{m}^3/\text{min}$ moderate outdoor exercise).
2. **Transport Emission Factors:** Derived from ARAI (Automotive Research Association of India) and CPCB urban driving cycle baselines ($\sim 155\ \text{g CO}_2\text{e/km}$ and $\sim 35\ \text{mg PM}_{2.5}\text{/km}$ for solo passenger vehicles; $\sim 26\ \text{g CO}_2\text{e/min}$ for idling).
3. **Indoor Air Honesty:** Houseplants, water bowls, and salt lamps are explicitly flagged as ineffective for acute $\text{PM}_{2.5}$ removal. Room sealing guidance explicitly warns against sealing spaces with unvented combustion appliances (LPG stoves, gas geysers, coal braziers) due to Carbon Monoxide ($\text{CO}$) risks.

---

## 9. Technology Stack

- **Framework:** Next.js 15 (App Router) with React 18 & Server API Routes
- **Language:** TypeScript 5 (`strict: true`)
- **Styling & Accessibility:** Tailwind CSS 3.4 + Lucide React Icons + Semantic WCAG AA HTML5 Landmarks
- **Validation:** Zod 3.23 runtime schemas at all API trust boundaries
- **AI SDK:** `@google/generative-ai` (Server-side only) + Deterministic Rule-Grounded Bilingual Engine
- **Code Quality Discipline:** **Ponytail by DietrichGebert** (`AGENTS.md` + `.agents/skills/ponytail*`)
- **Testing:** Vitest (Unit & API Integration) + Playwright (End-to-End Chromium Browser & Accessibility Suite)

---

## 10. Local Setup Instructions

### Prerequisites
- **Node.js:** `>= 20.0.0` (tested on Node.js `v24.22.1`)
- **npm:** `>= 10.0.0`

### Installation & Development
```bash
# 1. Install dependencies
npm install

# 2. (Optional) Copy environment template
cp .env.example .env.local

# 3. Start development server on http://localhost:3000
npm run dev
```

---

## 11. Environment Variables

All secrets are strictly **server-side only** (no `NEXT_PUBLIC_` secret variables exist). Copy `.env.example` to `.env.local`:

| Variable | Required? | Description |
|---|---|---|
| `OPENAQ_API_KEY` | Optional | OpenAQ v3 API key (`X-API-Key`) for querying official Indian CPCB / State PCB monitoring stations (Tier 1A). |
| `CPCB_DATA_GOV_API_KEY` | Optional | Official Open Government Data Platform India (`data.gov.in`) CPCB station API key (Tier 1). |
| `WAQI_API_TOKEN` | Optional | World Air Quality Index token relaying CPCB/DPCC continuous monitoring stations (Tier 1). |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for live LLM generation in `/api/assistant`. When omitted, the assistant automatically runs in `deterministic_fallback` mode with full bilingual context support. |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-2.0-flash`. |
| `NEXT_PUBLIC_APP_URL` | Optional | Defaults to `http://localhost:3000`. |

> **Note:** Even with **zero** environment variables set, SmogShield AI runs out-of-the-box using **Tier 2 Open-Meteo Copernicus CAMS** (with official Indian CPCB NAQI sub-index math), **Tier 3 Offline Reference Baselines**, and the **Deterministic Bilingual Family Assistant**.

---

## 12. Testing and Verification Instructions

```bash
# 1. TypeScript strict type checking
npm run typecheck

# 2. Unit & integration tests (NAQI math, recommendations, impact equations, Zod validation, AI safety guardrails)
npm test

# 3. Production build check
npm run build

# 4. Automated production HTTP server & security headers verification
node scripts/verify-http.mjs

# 5. End-to-End browser & accessibility tests (Playwright across all 10 competition scenarios)
npm run e2e
```

---

## 13. Public Deployment Link

- **Live Application:** [https://smogshield-ai.vercel.app](https://smogshield-ai.vercel.app)
