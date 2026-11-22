import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  EvidenceBasis,
  FamilyProfile,
  FreshnessStatus,
  Language,
  NAQICategory,
} from '@/types/smogshield';
import { sanitizeUserPrompt } from '@/lib/validators/schemas';
import { isVulnerableHousehold } from '@/lib/engine/recommendations';

export interface AssistantEnvironmentalContext {
  city: string;
  stationName: string;
  naqi: number;
  category: NAQICategory;
  dominantPollutant: string;
  pm25: number | null;
  pm10: number | null;
  freshness: FreshnessStatus;
  sourceName: string;
  saferWindowLabel: string;
  inversionRisk: 'low' | 'moderate' | 'high';
}

export interface AssistantResponsePayload {
  answer: string;
  basis: EvidenceBasis;
  sourceAttribution: string;
  safetyOverrideApplied: boolean;
  providerMode: 'gemini_live' | 'deterministic_fallback';
  medicalDisclaimerIncluded: boolean;
}

const MEDICAL_KEYWORDS_EN =
  /\b(asthma|inhaler|chest pain|breathless|wheez|cough|coughing|doctor|hospital|medicine|medication|pregnant|infant|baby|fever|infection|symptom|symptoms|clinic|emergency)\b/i;

const MEDICAL_KEYWORDS_HI =
  /(दमा|अस्थमा|सांस|खांसी|दवा|डॉक्टर|अस्पताल|बुखार|गर्भवती|सीने में दर्द)/;

export function requiresMedicalDisclaimer(question: string): boolean {
  return MEDICAL_KEYWORDS_EN.test(question) || MEDICAL_KEYWORDS_HI.test(question);
}

export function getPublicHealthDisclaimer(lang: Language): string {
  if (lang === 'hi') {
    return '\n\n⚠️ **सार्वजनिक स्वास्थ्य अस्वीकरण (Public Health Notice):** यह जानकारी केवल वायु प्रदूषण से बचाव और सामान्य जागरूकता के लिए है, यह किसी डॉक्टर की चिकित्सीय सलाह या निदान (diagnosis) का विकल्प नहीं है। यदि परिवार में किसी को सांस फूलने, सीने में जकड़न, लगातार खांसी या अस्थमा के लक्षण हैं, तो तुरंत योग्य चिकित्सक या नजदीकी अस्पताल से संपर्क करें।';
  }
  return '\n\n⚠️ **Public Health Guidance Notice:** This guidance provides conservative environmental exposure protection and is not medical diagnosis or treatment. If any household member experiences shortness of breath, wheezing, chest tightness, or worsening asthma/cardiac symptoms, consult a qualified medical professional or official public-health emergency service immediately.';
}

/**
 * Post-generation deterministic safety validator.
 * Ensures an LLM response never encourages unprotected outdoor exercise when NAQI > 200.
 */
export function enforceDeterministicSafetyGuardrail(
  rawAnswer: string,
  env: AssistantEnvironmentalContext,
  lang: Language
): { safeAnswer: string; safetyOverrideApplied: boolean } {
  const unsafeOutdoorAdvicePattern =
    /\b(safe to run outdoors|go for a morning jog|good day for outdoor running|no mask needed|open all windows all day)\b/i;

  if (env.naqi >= 201 && unsafeOutdoorAdvicePattern.test(rawAnswer)) {
    const prefix =
      lang === 'hi'
        ? `🛡️ **[सुरक्षा नियम ओवरराइड — NAQI ${env.naqi} (${env.category})]:** वर्तमान वायु गुणवत्ता खतरनाक स्तर पर है। बाहरी व्यायाम या बिना N95 मास्क के बाहर जाना सुरक्षित नहीं है।\n\n`
        : `🛡️ **[Deterministic Safety Rule Enforcement — NAQI ${env.naqi} (${env.category})]:** Outdoor strenuous exercise or unmasked exposure is unsafe at current CPCB NAQI levels.\n\n`;
    return {
      safeAnswer: prefix + buildDeterministicFallbackAnswer('exercise', env, null, lang),
      safetyOverrideApplied: true,
    };
  }

  return { safeAnswer: rawAnswer, safetyOverrideApplied: false };
}

export function buildDeterministicFallbackAnswer(
  question: string,
  env: AssistantEnvironmentalContext,
  profile: FamilyProfile | null,
  lang: Language
): string {
  const q = question.toLowerCase();
  const hi = lang === 'hi' || /[\u0900-\u097F]/.test(question);
  const pm25Str = env.pm25 !== null ? `${env.pm25} µg/m³` : 'N/A';
  const vulnerable = profile ? isVulnerableHousehold(profile) : true;
  const freshnessNoteEn =
    env.freshness === 'live'
      ? `Live measurement from ${env.stationName}`
      : env.freshness === 'estimated'
        ? `Modelled atmospheric estimate (${env.sourceName})`
        : `Degraded/stale baseline (${env.freshness}) — applying +50 NAQI conservative safety margin`;
  const freshnessNoteHi =
    env.freshness === 'live'
      ? `${env.stationName} से लाइव डेटा`
      : env.freshness === 'estimated'
        ? `मॉडल आधारित अनुमान (${env.sourceName})`
        : `पुराना/ऑफ़लाइन डेटा (${env.freshness}) — अतिरिक्त सुरक्षा नियम लागू`;

  // Topic 1: Exercise / Running / Park / Walk
  if (
    /exercise|run|jog|walk|workout|gym|yoga|play|park|sport|व्यायाम|दौड़|सैर|पार्क|खेल|योग/i.test(q)
  ) {
    if (env.naqi >= 201) {
      return hi
        ? `**निर्णय: आज बाहर व्यायाम या सैर करना सुरक्षित नहीं है।**\n\n- **स्थान-विशिष्ट स्थिति (${env.city}):** वर्तमान NAQI **${env.naqi} (${env.category})** है और PM2.5 **${pm25Str}** है (${freshnessNoteHi})।\n- **क्यों (Why it matters):** तेज व्यायाम या दौड़ते समय हमारी सांस की गति 4 से 6 गुना बढ़ जाती है और हवा नाक के फिल्टर के बजाय सीधे मुंह से फेफड़ों की गहराई में जाती है।\n- **आज क्या करें (Action):** सभी कार्डियो, योग या बच्चों के खेल घर के अंदर (गीला पोछा लगाने के बाद) करें। यदि आवश्यक काम से बाहर जाना पड़े, तो केवल दोपहर के समय (**${env.saferWindowLabel}**) में फिटेड **N95/FFP2 मास्क** पहनकर जाएं।`
        : `**Decision: Avoid outdoor exercise today — shift workouts strictly indoors.**\n\n- **Location-Specific Context (${env.city}):** Current NAQI is **${env.naqi} (${env.category})** with PM2.5 at **${pm25Str}** (${freshnessNoteEn}).\n- **Why It Matters:** Aerobic exercise increases respiratory minute ventilation 4× to 6× and causes oral breathing, bypassing nasal filtration and driving sub-micron PM2.5 deep into alveoli.\n- **What To Do Instead:** Perform bodyweight circuits, yoga, or indoor skipping in a wet-mopped room. If you must step outside for non-strenuous errands, use the relative afternoon dip (**${env.saferWindowLabel}**) while wearing a fitted **N95/FFP2 respirator**.`;
    }
    return hi
      ? `**निर्णय: दोपहर के सुरक्षित समय में हल्का बाहरी व्यायाम किया जा सकता है।**\n\n- **स्थान-विशिष्ट स्थिति (${env.city}):** वर्तमान NAQI **${env.naqi} (${env.category})** और PM2.5 **${pm25Str}** है (${freshnessNoteHi})।\n- **सही समय:** सुबह के कोहरे (06:00–08:30) से बचें और दोपहर **${env.saferWindowLabel}** का उपयोग करें जब धूप से प्रदूषक फैल जाते हैं। संवेदनशील सदस्यों (${vulnerable ? 'बच्चे/बुजुर्ग' : 'अस्थमा रोगी'}) को मुख्य सड़क के ट्रैफिक से दूर पार्क के अंदरूनी हिस्से में ही रहना चाहिए।`
      : `**Decision: Moderate outdoor activity is permissible during midday dispersion hours.**\n\n- **Location-Specific Context (${env.city}):** Current NAQI is **${env.naqi} (${env.category})** with PM2.5 at **${pm25Str}** (${freshnessNoteEn}).\n- **Optimal Timing:** Avoid early morning thermal inversion (06:00–08:30). Schedule outdoor walks or light exercise during **${env.saferWindowLabel}** away from arterial diesel traffic corridors.`;
  }

  // Topic 2: Low-cost / No Air Purifier / Budget Protection
  if (
    /afford|cheap|budget|low cost|no purifier|without purifier|poor|plant|किफायती|सस्ता|प्यूरीफायर नहीं|बजट|पौधे|जुगाड़/i.test(
      q
    )
  ) {
    return hi
      ? `**बिना महंगे एयर प्यूरीफायर के घर की हवा बचाने के 5 व्यावहारिक और वैज्ञानिक तरीके:**\n\n1. **दरवाजों और खिड़कियों की सीलिंग (Draft Sealing — लागत <₹100):** बाहरी स्मॉग का 40–60% हिस्सा दरवाजों के नीचे और खिड़कियों की दरारों से अंदर आता है। दरवाजे के नीचे मुड़ा हुआ गीला तौलिया/कपड़ा लगाएं और खिड़की के गैप पर पेपर मास्किंग टेप चिपकाएं।\n2. **सूखी झाड़ू बंद करें, केवल गीला पोछा लगाएं (लागत ₹0):** सूखी झाड़ू फर्श पर जमे PM10 और PM2.5 कणों को वापस हवा में उड़ा देती है। दिन में दो बार गीले पोछे और नम कपड़े से सफाई करें।\n3. **रसोई और इनडोर धुएं पर पूर्ण नियंत्रण (लागत ₹0):** तड़का लगाते समय रसोई का दरवाजा बेडरूम से बंद रखें और एग्जॉस्ट फैन चलाएं। घर के अंदर अगरबत्ती, धूप, मच्छर कॉइल या मोमबत्ती बिल्कुल न जलाएं।\n4. **किफायती N95 मास्क का रोटेशन उपयोग (लागत ₹40–₹60):** बाहर जाते समय सूती रुमाल (जो <20% कण रोकता है) के बजाय BIS/NIOSH प्रमाणित N95/FFP2 मास्क पहनें। इसे पेपर बैग में रखकर 35–40 घंटे तक सुरक्षित रूप से दोबारा इस्तेमाल किया जा सकता है।\n5. **वैज्ञानिक सीमा (Important Limitation):** कमरे में इनडोर पौधे (Houseplants), पानी के कटोरे या नमक के लैंप रखने से गंभीर PM2.5 स्मॉग साफ **नहीं** होता। यदि संभव हो तो ₹1,500 के बॉक्स-फैन के पीछे HEPA फिल्टर बांधकर DIY प्यूरीफायर बनाया जा सकता है।`
      : `**Practical, High-Impact Indoor Air Protection When You Cannot Afford an Air Purifier:**\n\n1. **Block Infiltration Gaps (Cost: ₹0–₹100):** Up to 50% of overnight outdoor smog enters through window frames and door thresholds. Press rolled cotton towels against balcony/front door bottoms and apply removable paper masking tape over rattling window seams.\n2. **Eliminate Dry Sweeping — Wet Mop Only (Cost: ₹0):** Dry brooms resuspend settled PM2.5/PM10 directly into children's breathing zones. Damp-mop floors and wipe window sills with a wet cloth twice daily.\n3. **Strict Kitchen Isolation & Zero Indoor Smoke (Cost: ₹0):** Close the kitchen door before cooking, turn on the exhaust fan prior to heating oil, prefer pressure-cooking over open pan frying, and strictly stop burning incense, dhoop, candles, or mosquito coils indoors.\n4. **₹50 N95/FFP2 Respirator Rotation (vs. Cloth Masks):** When stepping outdoors in ${env.city} (NAQI **${env.naqi}**), a ₹50 N95/FFP2 mask filters >95% of airborne particulates when sealed around the nose clip, whereas cloth handkerchiefs block <20%. Rotate 2–3 N95 masks in breathable paper bags for weeks of safe reuse.\n5. **Honest Scientific Limitation:** Do **not** rely on indoor houseplants, bowls of water, or essential oil diffusers—controlled chamber studies prove plants provide virtually zero CADR against winter PM2.5. Also, never seal a room tightly while an unvented gas stove or coal heater is burning (carbon monoxide risk).`;
  }

  // Topic 3: School Commute / Children / Office Travel
  if (/school|child|kid|commute|bus|metro|car|bike|two-wheeler|स्कूल|बच्चे|यात्रा|बस|मेट्रो|गाड़ी/i.test(q)) {
    const mode = profile?.primaryCommuteMode ?? 'auto_bus';
    return hi
      ? `**${env.city} (NAQI ${env.naqi} — ${env.category}) के लिए स्कूल और ऑफिस यात्रा योजना:**\n\n- **मास्क सुरक्षा:** घर से निकलने से पहले बच्चों (2 वर्ष से बड़े) और बड़ों को नोज़-क्लिप दबाकर **N95/KN95/FFP2 मास्क** पहनाएं। साधारण कपड़े का मास्क ट्रैफिक के धुएं (PM2.5: ${pm25Str}) को नहीं रोक पाता।\n- **वाहन का चयन (${mode}):** खुले दुपहिया या ऑटो रिक्शा में सीधा टेलपाइप धुआं लगता है। संभव हो तो बंद **मेट्रो कोच** या **कार/बस (खिड़कियां बंद, AC इंटरनल रीसर्कुलेशन मोड पर)** चुनें।\n- **स्कूल गेट नियम:** स्कूल पिकअप/ड्रॉप लाइन में खड़े वाहनों का इंजन बंद करवाएं ("ज़ीरो आइडलिंग") क्योंकि बच्चों की ऊंचाई (1 मीटर) पर सीधा एग्जॉस्ट धुआं जमा होता है।`
      : `**School & Work Commute Plan for ${env.city} (NAQI ${env.naqi} — ${env.category}):**\n\n- **Respirator Fit First:** Ensure commuters and children (aged 2+) wear a well-fitted **N95/FFP2/KN95 mask** with the metal nose-bridge pinched prior to stepping out (current PM2.5 is **${pm25Str}**).\n- **Transport Mode Optimization (Current: ${mode.replace('_', '/')}):** Open two-wheelers and auto-rickshaws expose riders to road-corridor concentrations 1.5–2× higher than station averages. Whenever feasible, shift to enclosed **Metro rail** or a shared carpool with windows shut and **AC set to Internal Recirculation**.\n- **School Gate & Route Hygiene:** Use quieter residential side streets 100m away from heavy diesel traffic, and practice strict **Zero-Idling** at school drop-off gates where exhaust plumes collect at children's breathing height.`;
  }

  // Topic 4: Neighborhood / Community / Emissions reduction
  if (
    /neighbourhood|neighborhood|community|society|rwa|emission|reduce pollution|मोहल्ला|सोसाइटी|समुदाय|प्रदूषण कम/i.test(
      q
    )
  ) {
    return hi
      ? `**आपका परिवार और मोहल्ला (RWA) प्रदूषण कम करने के लिए ये 4 ठोस कदम उठा सकते हैं:**\n\n1. **रात्रि गार्ड्स को इलेक्ट्रिक हीटर देना (सबसे बड़ा प्रभाव):** रात में ठंड से बचने के लिए जलाए जाने वाले लकड़ी, कोयले या पत्तियों के अलाव से प्रति किलो 12,000 मिलीग्राम सीधा PM2.5 निकलता है। सोसाइटी के गार्ड्स को इलेक्ट्रिक हीटर दें।\n2. **स्कूल गेट और सोसाइटी में ज़ीरो-आइडलिंग:** 30 सेकंड से अधिक रुकने पर वाहन का इंजन बंद रखें।\n3. **ट्रिप समेकन और मेट्रो/कारपूल:** सुबह के ठंडे इंजन (Cold Start) से सबसे ज्यादा धुआं निकलता है। पड़ोसियों के साथ कारपूल करें या मेट्रो लें।\n4. **महत्वपूर्ण अंतर (Key Distinction):** कारपूल करने से **बाहरी उत्सर्जन (Emissions)** घटता है, जबकि N95 पहनने से **व्यक्तिगत संपर्क (Personal Exposure)** घटता है और गीला पोछा लगाने से **इनडोर वायु गुणवत्ता (Indoor Air)** सुधरती है—परिवार को तीनों पर काम करना चाहिए।`
      : `**How Your Family & Neighborhood Can Meaningfully Cut Winter Smog:**\n\n1. **Replace Nighttime Guard Bonfires with Electric Heaters (Highest Local PM2.5 Impact):** Smoldering 1 kg of wood, leaves, or waste at night releases ~12,000 mg of direct PM2.5 into the stagnant inversion layer. RWAs pooling ₹150/flat for electric heaters immediately stops overnight smoke infiltration.\n2. **Eliminate Cold-Start Short Trips & Vehicle Idling:** Consolidate separate market errands into a single midday trip (**${env.saferWindowLabel}**) and enforce a 30-second engine-off rule at school gates.\n3. **Neighborhood Carpool & Metro Feeder Pools:** Sharing 1 enclosed vehicle among 3 commuters cuts morning cold-start emissions by 66%.\n4. **Distinguishing the Three Outcomes:**\n   - *Reducing Emissions* (carpooling, stopping waste burning) lowers your community footprint.\n   - *Reducing Personal Exposure* (N95 masks, avoiding morning outdoor workouts) protects your lungs today.\n   - *Improving Indoor Air* (kitchen exhaust, draft sealing, wet mopping) keeps your home sanctuary safe.`;
  }

  // Default comprehensive weekly/daily family plan response
  return hi
    ? `**${env.city} के लिए स्मॉगशील्ड एआई पारिवारिक सुरक्षा सारांश:**\n\n- **वर्तमान वायु स्थिति:** NAQI **${env.naqi} (${env.category})**, मुख्य प्रदूषक **${env.dominantPollutant}** (PM2.5: **${pm25Str}**)। डेटा स्रोत: *${freshnessNoteHi}*।\n- **1. आज क्या अलग करें (Immediate Action):** सुबह (06:00–09:00) और रात (20:00 के बाद) थर्मल इनवर्जन के दौरान बाहरी व्यायाम व टहलना बंद रखें। बाहर निकलने पर **N95/FFP2 मास्क** पहनें।\n- **2. सुरक्षित समय (Safer Window):** आवश्यक बाहरी काम या संक्षिप्त वेंटिलेशन केवल दोपहर **${env.saferWindowLabel}** के बीच करें।\n- **3. घर के अंदर सुरक्षा (Indoor Protection):** सूखी झाड़ू के बजाय गीला पोछा लगाएं, रसोई में तड़का लगाते समय एग्जॉस्ट फैन चलाएं, और रात में बेडरूम की खिड़कियों के गैप बंद रखें।\n- **4. इस सप्ताह के स्थायी बदलाव:** छोटे कामों के लिए बार-बार गाड़ी निकालने के बजाय ट्रिप जोड़ें (Trip Consolidation) और पड़ोस में खुले कचरे/पत्तियों को जलाने से रोकें।`
    : `**SmogShield AI Contextual Family Guidance for ${env.city}:**\n\n- **Current Environmental Status:** CPCB NAQI is **${env.naqi} (${env.category})**, driven by **${env.dominantPollutant}** (PM2.5: **${pm25Str}**). Source attribution: *${freshnessNoteEn}*.\n- **1. Immediate Daily Adjustment:** Suspend early-morning and late-evening outdoor workouts due to ${env.inversionRisk} thermal inversion risk. Wear a fitted **N95/FFP2 respirator** for essential commutes.\n- **2. Best Time Window Today:** Schedule necessary errands or brief 15-minute air exchange during **${env.saferWindowLabel}** when solar mixing lowers particulate concentration.\n- **3. Indoor Air Sanctuary:** Replace dry sweeping with damp mopping, isolate kitchen cooking plumes with the exhaust fan on, and seal bedroom window gaps overnight.\n- **4. Sustainable Weekly Habit:** Consolidate cold-start vehicle errands into a single midday run and join neighborhood zero-idling and anti-waste-burning efforts.`;
}

export async function generateContextualAssistantReply(
  rawQuestion: string,
  language: Language,
  profile: FamilyProfile,
  env: AssistantEnvironmentalContext
): Promise<AssistantResponsePayload> {
  const cleanQuestion = sanitizeUserPrompt(rawQuestion);
  const needsDisclaimer = requiresMedicalDisclaimer(cleanQuestion);
  const disclaimerText = needsDisclaimer ? getPublicHealthDisclaimer(language) : '';

  const basis: EvidenceBasis =
    env.freshness === 'live' || env.freshness === 'delayed'
      ? 'measured_data'
      : env.freshness === 'estimated'
        ? 'model_estimate'
        : 'safety_rule';

  const sourceAttribution = `${env.stationName} • ${env.sourceName} (NAQI ${env.naqi} ${env.category}, Freshness: ${env.freshness.toUpperCase()})`;

  const apiKey = process.env.GEMINI_API_KEY;
  const hasValidKey =
    Boolean(apiKey) &&
    !apiKey!.includes('your_') &&
    apiKey!.trim().length > 15;

  if (hasValidKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey!.trim());
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
      const model = genAI.getGenerativeModel({ model: modelName });

      const systemPrompt = `You are SmogShield AI, an authoritative, practical winter-smog and indoor-air protection assistant for Indian families.
Respond strictly in ${language === 'hi' ? 'Hindi (हिन्दी)' : 'English'}.

VALIDATED ENVIRONMENTAL TELEMETRY (DO NOT INVENT OR ALTER THESE NUMBERS):
- Location: ${env.city} (${env.stationName})
- Official CPCB NAQI: ${env.naqi} (${env.category})
- Dominant Pollutant: ${env.dominantPollutant} (PM2.5: ${env.pm25 ?? 'N/A'} ug/m3, PM10: ${env.pm10 ?? 'N/A'} ug/m3)
- Data Freshness: ${env.freshness} (Source: ${env.sourceName})
- Thermal Inversion Risk: ${env.inversionRisk}
- Safer Afternoon Window: ${env.saferWindowLabel}

HOUSEHOLD CONTEXT:
- Household Size: ${profile.householdSize}, Age Groups: ${profile.ageGroups.join(', ')}
- Respiratory Sensitivity: ${profile.hasRespiratorySensitivity ? 'Yes' : 'No'}
- Primary Commute: ${profile.primaryCommuteMode} (${profile.commuteDistanceKm} km, starts ${profile.schoolOrWorkStartHour}:00)
- Cooking Setup: ${profile.cookingSetup}
- Available Equipment: ${profile.equipment.join(', ') || 'None'}
- Resource Tier: ${profile.budgetTier}

NON-NEGOTIABLE SAFETY RULES:
1. Never invent AQI readings, statistics, or external citations. Cite the validated NAQI (${env.naqi}) above.
2. Distinguish clearly between location-specific data (${env.city}) and general deterministic public-health rules.
3. If NAQI > 200, NEVER recommend outdoor running, jogging, or cycling; direct exercise indoors.
4. Never claim indoor plants, water bowls, or cloth masks eliminate PM2.5. Be honest about limitations.
5. Keep the answer concise, structured with bullet points, and directly actionable for this family.`;

      const result = await model.generateContent([
        { text: systemPrompt },
        { text: `Family Question: ${cleanQuestion}` },
      ]);
      const text = result.response.text().trim();

      if (text.length > 20) {
        const { safeAnswer, safetyOverrideApplied } =
          enforceDeterministicSafetyGuardrail(text, env, language);

        return {
          answer: safeAnswer + disclaimerText,
          basis,
          sourceAttribution,
          safetyOverrideApplied,
          providerMode: 'gemini_live',
          medicalDisclaimerIncluded: needsDisclaimer,
        };
      }
    } catch {
      // Fall through cleanly to deterministic rule-grounded responder
    }
  }

  const deterministicText = buildDeterministicFallbackAnswer(
    cleanQuestion,
    env,
    profile,
    language
  );
  const { safeAnswer, safetyOverrideApplied } =
    enforceDeterministicSafetyGuardrail(deterministicText, env, language);

  return {
    answer: safeAnswer + disclaimerText,
    basis,
    sourceAttribution,
    safetyOverrideApplied,
    providerMode: 'deterministic_fallback',
    medicalDisclaimerIncluded: needsDisclaimer,
  };
}
