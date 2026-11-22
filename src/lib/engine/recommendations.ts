import {
  AirQualityReport,
  DailyActionSlot,
  EvidenceBasis,
  FamilyProfile,
  IndoorGuidanceItem,
  LifestyleAlternative,
  WhatIfScenarioComparison,
} from '@/types/smogshield';

export const HOUSEHOLD_PRESETS: [
  FamilyProfile,
  FamilyProfile,
  FamilyProfile,
  FamilyProfile,
] = [
  {
    id: 'delhi-joint-family',
    name: 'Delhi Joint Family (Children & Grandparents)',
    householdSize: 5,
    ageGroups: ['children', 'adults', 'elderly'],
    hasRespiratorySensitivity: true,
    primaryCommuteMode: 'auto_bus',
    commuteDistanceKm: 8,
    schoolOrWorkStartHour: 8,
    outdoorExerciseMinutes: 45,
    cookingSetup: 'lpg_exhaust',
    equipment: ['n95_masks', 'hepa_purifier', 'exhaust_fan', 'wet_mop_cleaning'],
    budgetTier: 'standard',
    language: 'en',
  },
  {
    id: 'budget-commuter-household',
    name: 'Budget Commuter Family (No Purifier / Two-Wheeler)',
    householdSize: 4,
    ageGroups: ['children', 'adults'],
    hasRespiratorySensitivity: false,
    primaryCommuteMode: 'two_wheeler',
    commuteDistanceKm: 12,
    schoolOrWorkStartHour: 9,
    outdoorExerciseMinutes: 30,
    cookingSetup: 'lpg_no_exhaust',
    equipment: ['cloth_masks_only', 'wet_mop_cleaning'],
    budgetTier: 'limited_budget',
    language: 'en',
  },
  {
    id: 'infant-care-home',
    name: 'Young Parents with Infant (Remote / Car Commute)',
    householdSize: 3,
    ageGroups: ['infants', 'adults'],
    hasRespiratorySensitivity: true,
    primaryCommuteMode: 'car',
    commuteDistanceKm: 10,
    schoolOrWorkStartHour: 10,
    outdoorExerciseMinutes: 20,
    cookingSetup: 'electric_induction',
    equipment: ['n95_masks', 'hepa_purifier', 'exhaust_fan', 'wet_mop_cleaning'],
    budgetTier: 'standard',
    language: 'en',
  },
  {
    id: 'active-metro-household',
    name: 'Active Metro Commuters (Hindi / दिल्ली मेट्रो परिवार)',
    householdSize: 4,
    ageGroups: ['children', 'adults', 'elderly'],
    hasRespiratorySensitivity: false,
    primaryCommuteMode: 'metro',
    commuteDistanceKm: 14,
    schoolOrWorkStartHour: 8,
    outdoorExerciseMinutes: 60,
    cookingSetup: 'lpg_exhaust',
    equipment: ['n95_masks', 'exhaust_fan', 'wet_mop_cleaning'],
    budgetTier: 'standard',
    language: 'hi',
  },
];

export function isVulnerableHousehold(profile: FamilyProfile): boolean {
  return (
    profile.hasRespiratorySensitivity ||
    profile.ageGroups.includes('infants') ||
    profile.ageGroups.includes('children') ||
    profile.ageGroups.includes('elderly')
  );
}

/**
 * Evaluates household precautionary escalation tier while preserving the official measured CPCB NAQI unaltered.
 * Retains `effectiveNaqi` solely as an internal deterministic rule-trigger threshold so measured NAQI is never misrepresented.
 */
export function getEffectiveSafetyNaqi(
  report: AirQualityReport,
  profile: FamilyProfile
): {
  measuredNaqi: number;
  effectiveNaqi: number;
  precautionTierLabel: string;
  uncertaintyLevel: 'low' | 'moderate' | 'high';
  basis: EvidenceBasis;
  conservatismNote: string;
} {
  let buffer = 0;
  let uncertaintyLevel: 'low' | 'moderate' | 'high' =
    report.freshness === 'live'
      ? 'low'
      : report.freshness === 'delayed' || report.freshness === 'estimated'
        ? 'moderate'
        : 'high';

  let basis: EvidenceBasis =
    report.freshness === 'live' || report.freshness === 'delayed'
      ? 'measured_data'
      : report.freshness === 'estimated'
        ? 'model_estimate'
        : 'safety_rule';

  const notes: string[] = [];

  if (report.freshness === 'stale' || report.freshness === 'unavailable') {
    buffer += 50;
    basis = 'safety_rule';
    notes.push(
      'Telemetry is stale or offline (conservative precautionary safety buffer active).'
    );
  }

  if (isVulnerableHousehold(profile)) {
    buffer += 35;
    notes.push(
      'Escalated +1 precautionary protection tier for children, elderly, infants, or respiratory sensitivity (buffer active; official measured NAQI remains unaltered).'
    );
  }

  const precautionTierLabel =
    buffer >= 50
      ? 'Maximum Precautionary Tier (Stale/Offline + Vulnerable Household)'
      : buffer > 0
        ? 'Escalated Precautionary Tier (Vulnerable Household Protection)'
        : 'Standard CPCB Category Tier';

  return {
    measuredNaqi: report.naqi,
    effectiveNaqi: Math.min(500, report.naqi + buffer),
    precautionTierLabel,
    uncertaintyLevel,
    basis,
    conservatismNote:
      notes.join(' ') ||
      'Direct deterministic evaluation of measured CPCB NAQI and household schedule.',
  };
}

export function generatePersonalizedDailyPlan(
  report: AirQualityReport,
  profile: FamilyProfile
): DailyActionSlot[] {
  const { effectiveNaqi, basis } = getEffectiveSafetyNaqi(report, profile);
  const hi = profile.language === 'hi';
  const vulnerable = isVulnerableHousehold(profile);
  const hasPurifier = profile.equipment.includes('hepa_purifier');
  const hasN95 = profile.equipment.includes('n95_masks');
  const isBudget = profile.budgetTier === 'limited_budget' || !hasPurifier;
  const saferWindow = report.saferOutdoorWindow.label;

  const slots: DailyActionSlot[] = [];

  // 1. Morning Routine (06:00 - 08:30)
  if (effectiveNaqi >= 201) {
    slots.push({
      id: 'slot-morning',
      slotKey: 'morning_routine',
      timeWindow: '06:00 – 08:30',
      title: hi
        ? 'सुबह की दिनचर्या और खिड़की सीलिंग'
        : 'Morning Routine & Thermal Inversion Protection',
      priority: effectiveNaqi >= 301 ? 'critical' : 'high',
      whatToDo: hi
        ? `सुबह 8:30 बजे तक खिड़कियां और बालकनी के दरवाजे पूरी तरह बंद रखें। सुबह की सैर तुरंत रद्द करें (वर्तमान NAQI ${report.naqi})।`
        : `Keep all windows and balcony doors strictly closed until at least 12:30. Cancel early morning outdoor walks (current NAQI ${report.naqi}, PM2.5 ${report.pollutants.pm25 ?? 'N/A'} µg/m³).`,
      whyItMatters: hi
        ? 'सर्दियों की सुबह ठंडी हवा जमीन के पास PM2.5 को फंसा लेती है (थर्मल इनवर्जन), जिससे सुबह की हवा दिन में सबसे अधिक जहरीली होती है।'
        : 'Winter morning thermal inversion traps dense PM2.5 within 50 meters of ground level, making 06:00–08:30 outdoor air 25–40% more toxic than afternoon air.',
      whenToDoIt: '06:00 – 08:30',
      alternative: hi
        ? isBudget
          ? 'घर के अंदर स्ट्रेचिंग या प्राणायाम करें और फर्श पर गीला पोछा लगाएं ताकि धूल न उड़े।'
          : 'घर के अंदर HEPA प्यूरीफायर चलाकर योग/व्यायाम करें।'
        : isBudget
          ? 'Perform indoor stretching or room exercises after wet-mopping the floor to prevent indoor dust resuspension.'
          : 'Run the HEPA air purifier in the main living room and shift morning mobility exercises indoors.',
      basis,
      ruleId: 'RULE_MORNING_INVERSION_LOCKDOWN',
      outcomeCategory: 'exposure_reduction',
      estimatedExposureReductionPct: 68,
      impactActionType: 'outdoor_trip_rescheduled',
    });
  } else {
    slots.push({
      id: 'slot-morning',
      slotKey: 'morning_routine',
      timeWindow: '06:00 – 08:30',
      title: hi ? 'सुबह की दिनचर्या' : 'Morning Routine & Gentle Ventilation Check',
      priority: 'routine',
      whatToDo: hi
        ? `हवा की स्थिति (${report.category}, NAQI ${report.naqi}) सामान्य है, फिर भी संवेदनशील सदस्यों को सुबह के कोहरे में भारी व्यायाम से बचाएं।`
        : `With ${report.category} air (NAQI ${report.naqi}), brief morning walks are permissible for healthy adults, while sensitive members wait for late-morning sun.`,
      whyItMatters: hi
        ? 'धूप निकलने के बाद प्रदूषक तेजी से फैलते हैं।'
        : 'Waiting until solar heating lifts morning moisture reduces fine particulate inhalation.',
      whenToDoIt: '06:30 – 08:30',
      alternative: hi
        ? 'धूप निकलने के बाद (09:00 के बाद) पार्क जाएं।'
        : 'Shift intense jogging to post-09:00 or midday.',
      basis,
      ruleId: 'RULE_MORNING_MODERATE_CHECK',
      outcomeCategory: 'exposure_reduction',
      estimatedExposureReductionPct: 30,
      impactActionType: 'outdoor_trip_rescheduled',
    });
  }

  // 2. School & Work Commute (08:00 - 10:30)
  const commuteHourStr = `${String(profile.schoolOrWorkStartHour).padStart(2, '0')}:00 – ${String(Math.min(23, profile.schoolOrWorkStartHour + 2)).padStart(2, '0')}:00`;
  const isOpenCommute =
    profile.primaryCommuteMode === 'two_wheeler' ||
    profile.primaryCommuteMode === 'walk_cycle' ||
    profile.primaryCommuteMode === 'auto_bus';

  slots.push({
    id: 'slot-commute',
    slotKey: 'commute_school_work',
    timeWindow: commuteHourStr,
    title: hi
      ? 'स्कूल और ऑफिस यात्रा सुरक्षा'
      : 'School & Work Commute Exposure Shield',
    priority: effectiveNaqi >= 201 && isOpenCommute ? 'critical' : 'high',
    whatToDo: hi
      ? `यात्रा (${profile.commuteDistanceKm} किमी) के दौरान ${hasN95 ? 'फिटेड N95/FFP2 मास्क पहनें' : 'सूती कपड़े के मास्क की जगह तुरंत ₹40-₹60 वाला N95/FFP2 मास्क लें'}। ${profile.primaryCommuteMode === 'two_wheeler' ? 'दुपहिया वाहन पर फुल-फेस हेलमेट वाइज़र बंद रखें।' : ''}`
      : `For your ${profile.commuteDistanceKm} km ${profile.primaryCommuteMode.replace('_', '/')} commute, ${hasN95 ? 'wear a tightly sealed N95/FFP2 respirator before stepping out' : 'upgrade from cloth masks (which block <20% of PM2.5) to an affordable N95/FFP2 respirator'}. ${profile.primaryCommuteMode === 'car' ? 'Set car AC to inner recirculation mode.' : ''}`,
    whyItMatters: hi
      ? 'ट्रैफिक कॉरिडोर में PM2.5 और NO2 का स्तर सामान्य स्टेशन रीडिंग से 1.8 गुना अधिक होता है।'
      : 'Roadside traffic corridors carry 1.5× to 2× higher ultrafine PM2.5 and NO2 concentrations than ambient station readings.',
    whenToDoIt: commuteHourStr,
    alternative: hi
      ? 'खुले दुपहिया/ऑटो के बजाय बंद मेट्रो कोच, शेयर्ड कारपूल (AC रीसर्कुलेशन मोड) चुनें या मुख्य सड़क के बजाय अंदरूनी गली का रास्ता लें।'
      : 'Shift from open two-wheeler/auto to enclosed Metro rail, shared carpool (recirculation mode), or quiet side-street routes 100m away from arterial diesel traffic.',
    basis,
    ruleId: isOpenCommute
      ? 'RULE_COMMUTE_OPEN_VEHICLE_SHIELD'
      : 'RULE_COMMUTE_ENCLOSED_RECIRCULATE',
    outcomeCategory: 'exposure_reduction',
    estimatedExposureReductionPct: hasN95 ? 82 : 55,
    impactActionType: 'shared_journey_taken',
  });

  // 3. Outdoor Exercise & Children's Play
  slots.push({
    id: 'slot-exercise',
    slotKey: 'outdoor_exercise',
    timeWindow: saferWindow.split(' ')[0] || '13:00 – 16:00',
    title: hi
      ? 'व्यायाम और बच्चों के खेलने का निर्णय'
      : `Exercise & Children's Activity (${profile.outdoorExerciseMinutes} min planned)`,
    priority: effectiveNaqi >= 201 ? 'critical' : 'moderate',
    whatToDo:
      effectiveNaqi >= 201
        ? hi
          ? `बाहरी दौड़, क्रिकेट या पार्क में खेलना पूरी तरह बंद रखें। ${ profile.outdoorExerciseMinutes } मिनट का व्यायाम घर के अंदर करें।`
          : `Suspend all outdoor running, cycling, and school playground sports today. Move your ${profile.outdoorExerciseMinutes}-minute workout strictly indoors.`
        : hi
          ? `बाहरी व्यायाम केवल दोपहर के सुरक्षित समय (${saferWindow}) में करें।`
          : `Schedule outdoor exercise during the afternoon dispersion window (${saferWindow}) when NAQI dips to ~${report.saferOutdoorWindow.expectedNaqi}.`,
    whyItMatters: hi
      ? 'तेज व्यायाम के दौरान इंसान आराम की तुलना में 4 से 6 गुना अधिक हवा (और PM2.5 कण) फेफड़ों की गहराई तक खींचता है।'
      : 'Aerobic exercise increases respiratory minute ventilation 4× to 6× and shifts breathing from nasal filtration to deep oral inhalation.',
    whenToDoIt: '13:00 – 16:00',
    alternative: hi
      ? 'घर के अंदर बॉडीवेट वर्कआउट, योग, सीढ़ी चढ़ना (बंद कॉरिडोर में) या बच्चों के लिए इनडोर खेल चुनें।'
      : 'Substitute with indoor bodyweight circuits, yoga, skipping in a wet-mopped room, or structured indoor play for children.',
    basis: 'safety_rule',
    ruleId:
      effectiveNaqi >= 201
        ? 'RULE_EXERCISE_INDOOR_MANDATORY'
        : 'RULE_EXERCISE_MIDDAY_WINDOW',
    outcomeCategory: 'exposure_reduction',
    estimatedExposureReductionPct: 75,
    impactActionType: 'outdoor_trip_rescheduled',
  });

  // 4. Shopping & Errands (13:00 - 16:00)
  slots.push({
    id: 'slot-errands',
    slotKey: 'shopping_errands',
    timeWindow: '13:30 – 16:00',
    title: hi
      ? 'बाजार के काम और ट्रिप समेकन (Trip Consolidation)'
      : 'Shopping, Errands & Midday Window Utilization',
    priority: 'moderate',
    whatToDo: hi
      ? `छोटे-छोटे कामों के लिए बार-बार गाड़ी निकालने के बजाय दोपहर 13:30–16:00 के बीच एक ही बार में सभी काम पूरे करें।`
      : `Consolidate separate market runs into a single midday trip between 13:30 and 16:00 when expected NAQI is at its daily minimum (~${report.saferOutdoorWindow.expectedNaqi}).`,
    whyItMatters: hi
      ? 'ठंडे इंजन (Cold Start) को बार-बार चालू करने से सबसे अधिक PM2.5 और हाइड्रोकार्बन उत्सर्जित होते हैं, और दोपहर में स्मॉग सबसे कम होता है।'
      : 'Cold-start engine ignition emits up to 3× more unburned hydrocarbons and PM2.5 per km; midday solar mixing also minimizes your personal inhalation dose.',
    whenToDoIt: '13:30 – 16:00',
    alternative: hi
      ? '2 किमी से कम दूरी के कामों को एक साथ जोड़ें या पड़ोसियों के साथ साझा खरीदारी सूची बनाएं।'
      : 'Batch household errands into one non-idling trip or pool neighborhood grocery pickups.',
    basis,
    ruleId: 'RULE_ERRAND_CONSOLIDATION_MIDDAY',
    outcomeCategory: 'emission_reduction',
    estimatedExposureReductionPct: 45,
    impactActionType: 'vehicle_trip_avoided',
  });

  // 5. Cooking & Indoor Air Management (18:30 - 21:00)
  const highIndoorCookingRisk =
    profile.cookingSetup === 'biomass_coal' ||
    profile.cookingSetup === 'lpg_no_exhaust';

  slots.push({
    id: 'slot-cooking',
    slotKey: 'cooking_indoor',
    timeWindow: '18:30 – 21:00',
    title: hi
      ? 'रसोई धुआं नियंत्रण और इनडोर वायु सुरक्षा'
      : 'Cooking Emissions & Indoor Particulate Control',
    priority: highIndoorCookingRisk ? 'critical' : 'high',
    whatToDo: hi
      ? `खाना बनाते समय एग्जॉस्ट फैन/चिमनी चलाएं और रसोई का दरवाजा बेडरूम से बंद रखें। तेल को धुआं निकलने तक गर्म (Deep Frying) करने से बचें। अगरबत्ती या मच्छर कॉइल बिल्कुल न जलाएं।`
      : `Isolate the kitchen door from sleeping rooms while cooking, run the exhaust fan continuously, and prefer pressure-cooking/steaming over high-smoke pan frying. Strictly avoid burning incense, dhoop, or mosquito coils indoors.`,
    whyItMatters: hi
      ? 'बंद घर में तड़का लगाने या अगरबत्ती जलाने से घर के अंदर का PM2.5 तुरंत 300+ µg/m³ के पार जा सकता है।'
      : 'High-heat oil frying or burning a single mosquito coil inside a sealed winter home spikes indoor PM2.5 by 150–400 µg/m³ for hours.',
    whenToDoIt: '18:30 – 21:00',
    alternative: hi
      ? 'कुकर में भाप/उबालकर पकाना, इंडक्शन का उपयोग, और मच्छरों के लिए लिक्विड वेपोराइज़र या मच्छरदानी का प्रयोग।'
      : 'Use covered boiling/pressure cooking, electric kettle/induction where available, and bed nets instead of smoke-generating coils.',
    basis: 'safety_rule',
    ruleId: highIndoorCookingRisk
      ? 'RULE_INDOOR_UNVENTED_COOKING_CRITICAL'
      : 'RULE_INDOOR_PLUME_CAPTURE',
    outcomeCategory: 'indoor_air_quality',
    estimatedExposureReductionPct: 60,
    impactActionType: 'clean_cooking_ventilation',
  });

  // 6. Evening Routine & Dust Control (17:30 - 20:00)
  slots.push({
    id: 'slot-evening',
    slotKey: 'evening_routine',
    timeWindow: '17:30 – 20:00',
    title: hi
      ? 'शाम की सीलिंग और गीली सफाई प्रोटोकॉल'
      : 'Sunset Smog Lock & Wet-Cleaning Protocol',
    priority: 'high',
    whatToDo: hi
      ? 'शाम 5:00 बजे सूरज ढलते ही सभी बाहरी खिड़कियां बंद करें। सूखी झाड़ू लगाने के बजाय गीले कपड़े/पोछे से फर्श साफ करें।'
      : 'Seal all exterior windows before 17:15 sunset as the boundary layer collapses. Clean floors and window sills strictly with a damp mop—never dry-sweep.',
    whyItMatters: hi
      ? 'सूरज ढलते ही बाहरी स्मॉग तेजी से नीचे बैठता है, और सूखी झाड़ू फर्श पर जमे PM10/PM2.5 कणों को वापस सांस की हवा में उड़ा देती है।'
      : 'Dry sweeping resuspends settled coarse and fine dust directly into household breathing zones; sunset cooling rapidly traps outdoor vehicle exhaust.',
    whenToDoIt: '17:15 – 19:30',
    alternative: hi
      ? 'गीला माइक्रोफाइबर कपड़ा/पोछा और दरवाजे के नीचे कपड़े का ड्राफ्ट स्टॉपर लगाएं।'
      : 'Use two-bucket damp mopping and place rolled towels against leaky balcony door thresholds.',
    basis: 'safety_rule',
    ruleId: 'RULE_SUNSET_SEAL_AND_WET_MOP',
    outcomeCategory: 'indoor_air_quality',
    estimatedExposureReductionPct: 50,
    impactActionType: 'indoor_protection_completed',
  });

  // 7. High-Pollution Overnight Sleep Protection (21:30 - 06:00)
  slots.push({
    id: 'slot-night',
    slotKey: 'high_pollution_night',
    timeWindow: '21:30 – 06:00',
    title: hi
      ? 'रात्रि नींद सुरक्षा और स्वच्छ कमरा (Clean Sanctuary)'
      : 'Overnight Sleep Sanctuary & Peak Smog Defense',
    priority: vulnerable || effectiveNaqi >= 301 ? 'critical' : 'high',
    whatToDo: hi
      ? hasPurifier
        ? 'सोने से 30 मिनट पहले मुख्य बेडरूम का दरवाजा/खिड़की बंद कर HEPA प्यूरीफायर चलाएं। पूरे परिवार (विशेषकर बच्चों/बुजुर्गों) को एक ही स्वच्छ कमरे में सुलाने की कोशिश करें।'
        : 'बेडरूम की खिड़कियों के गैप में गीला तौलिया/टेप लगाएं ताकि रात में कचरा/अलाव जलने का धुआं अंदर न आए। सोने से पहले भाप (Steam) या गुनगुने पानी से गरारे करें।'
      : hasPurifier
        ? 'Create a single "Clean Air Sleep Sanctuary": close bedroom doors/windows 30 minutes before sleep and run your HEPA purifier continuously overnight, prioritizing children and elderly members.'
        : 'Seal leaky window frames with masking tape or damp towels to block overnight biomass/bonfire smoke infiltration, and keep a damp cloth over ventilator slits.',
    whyItMatters: hi
      ? 'परिवार के सदस्य दिन के 8 घंटे सोते समय लगातार सांस लेते हैं; रात 11 बजे से सुबह 6 बजे तक बाहरी स्मॉग उच्चतम स्तर पर होता है।'
      : 'Your family inhales ~3,500 liters of air during 8 hours of sleep while outdoor winter smog and night-time waste-burning smoke hit their 24-hour peak.',
    whenToDoIt: '21:30 – 06:00',
    alternative: hi
      ? isBudget
        ? 'किफायती DIY बॉक्स-फैन + HEPA फिल्टर या खिड़की की दरारों को पैक कर एक कमरे को सुरक्षित बनाएं।'
        : 'पूरे घर के बजाय एक बंद बेडरूम में प्यूरीफायर को ऑटो/मीडियम मोड पर केंद्रित करें।'
      : isBudget
        ? 'Focus draft-sealing on one shared sleeping room or use a low-cost DIY box-fan + MERV-13/HEPA filter setup.'
        : 'Consolidate sleeping into the best-sealed bedroom rather than running a single purifier across an open floor plan.',
    basis: 'safety_rule',
    ruleId: hasPurifier
      ? 'RULE_NIGHT_HEPA_SANCTUARY'
      : 'RULE_NIGHT_LOW_COST_DRAFT_SEAL',
    outcomeCategory: 'indoor_air_quality',
    estimatedExposureReductionPct: hasPurifier ? 78 : 42,
    impactActionType: 'indoor_protection_completed',
  });

  return slots;
}

/**
 * Interactive What-If Family Decision Simulator:
 * Compares 4 realistic household choices side-by-side using US-EPA / ICMR respiratory dosimetry
 * and current validated PM2.5 telemetry without inventing unsubstantiated point claims.
 */
export function generateWhatIfComparisons(
  report: AirQualityReport,
  profile: FamilyProfile
): WhatIfScenarioComparison[] {
  const pm25 = Math.max(15, report.pollutants.pm25 ?? 160);
  const middayPm25 = Math.max(10, Math.round(pm25 * 0.72));
  const morningPeakPm25 = Math.round(pm25 * 1.25);
  const exMin = Math.max(20, profile.outdoorExerciseMinutes || 30);
  const basis: EvidenceBasis =
    report.freshness === 'live' || report.freshness === 'delayed'
      ? 'measured_data'
      : report.freshness === 'estimated'
        ? 'model_estimate'
        : 'safety_rule';

  const outdoorExDose = Math.round(0.025 * exMin * morningPeakPm25);
  const indoorExDose = Math.round(0.014 * exMin * (pm25 * 0.52));

  const commuteMin = Math.max(20, Math.round((profile.commuteDistanceKm || 8) * 4));
  const openBikeDose = Math.round(0.015 * commuteMin * (pm25 * 1.45));
  const metroN95Dose = Math.round(0.011 * commuteMin * (pm25 * 0.25));

  const morningVentLoad = Math.round(0.009 * 120 * morningPeakPm25);
  const middayVentLoad = Math.round(0.009 * 120 * middayPm25);

  const unventedCookingDose = Math.round(0.01 * 60 * (pm25 * 0.55 + 220));
  const ventedCookingDose = Math.round(0.01 * 60 * (pm25 * 0.55 + 35));

  return [
    {
      id: 'whatif-exercise',
      titleEn: `Morning Outdoor Walk/Run vs. Indoor Exercise (${exMin} min)`,
      titleHi: `सुबह बाहरी दौड़/सैर बनाम इनडोर व्यायाम (${exMin} मिनट)`,
      durationMinutes: exMin,
      baselineOptionEn: `07:00 Outdoor Jog/Walk (~${morningPeakPm25} µg/m³ inversion peak, 0.025 m³/min breathing)`,
      baselineOptionHi: `07:00 बाहरी सैर/दौड़ (~${morningPeakPm25} µg/m³ इनवर्जन पीक)`,
      baselineDoseUg: outdoorExDose,
      saferOptionEn: `Indoor Mobility/Yoga in Wet-Mopped Room (~52% lower indoor PM2.5, 0.014 m³/min breathing)`,
      saferOptionHi: `गीला पोछा लगे कमरे में इनडोर योग/व्यायाम`,
      saferDoseUg: indoorExDose,
      avoidedDoseUg: Math.max(0, outdoorExDose - indoorExDose),
      reductionRangeLabel: '60–75% lower inhaled PM2.5 dose (Modeled US-EPA Dosimetry)',
      mechanismEn:
        'Aerobic outdoor exertion triples minute ventilation while morning thermal inversion traps peak PM2.5 at ground level.',
      mechanismHi:
        'तेज बाहरी व्यायाम से सांस की गति 3 गुना बढ़ती है जबकि सुबह का कोहरा PM2.5 को जमीन के पास फंसाता है।',
      limitationEn:
        'Modeled estimate assuming closed windows; actual indoor PM2.5 depends on building draft sealing.',
      limitationHi:
        'बंद खिड़कियों पर आधारित मॉडल अनुमान; वास्तविक प्रभाव कमरे की सीलिंग पर निर्भर करता है।',
      basis,
    },
    {
      id: 'whatif-commute',
      titleEn: `Unmasked Open Two-Wheeler vs. Enclosed Transit + Fitted N95 (${commuteMin} min)`,
      titleHi: `बिना मास्क दुपहिया यात्रा बनाम मेट्रो/बस + फिटेड N95 (${commuteMin} मिनट)`,
      durationMinutes: commuteMin,
      baselineOptionEn: `Open Two-Wheeler/Auto with Cloth Mask (1.45× traffic plume multiplier)`,
      baselineOptionHi: `सूती मास्क के साथ खुला दुपहिया/ऑटो (1.45× ट्रैफिक धुआं)`,
      baselineDoseUg: openBikeDose,
      saferOptionEn: `Enclosed Metro/Carpool (Recirculation Mode) + Pinched N95/FFP2 Respirator`,
      saferOptionHi: `बंद मेट्रो/कारपूल + नोज़-क्लिप फिटेड N95/FFP2 मास्क`,
      saferDoseUg: metroN95Dose,
      avoidedDoseUg: Math.max(0, openBikeDose - metroN95Dose),
      reductionRangeLabel: '75–88% lower inhaled PM2.5 dose (NIOSH N95 Face-Seal Range)',
      mechanismEn:
        'Cloth masks filter <20% of sub-micron exhaust aerosols, whereas a sealed N95 + enclosed cabin blocks >80% of traffic plume particles.',
      mechanismHi:
        'सूती मास्क <20% सूक्ष्म कण रोकते हैं, जबकि फिटेड N95 और बंद कोच >80% ट्रैफिक कणों को रोकते हैं।',
      limitationEn:
        'N95 filtration drops sharply (<50%) if facial hair or unpinched nose clips allow edge leakage.',
      limitationHi:
        'यदि नोज़-क्लिप ढीली हो या चेहरे पर गैप हो, तो N95 की क्षमता घटकर <50% रह जाती है।',
      basis,
    },
    {
      id: 'whatif-ventilation',
      titleEn: 'Ventilating Home at 07:00 AM vs. 02:30 PM Solar Dispersion Window',
      titleHi: 'सुबह 07:00 बजे बनाम दोपहर 02:30 बजे खिड़की वेंटिलेशन',
      durationMinutes: 120,
      baselineOptionEn: `Opening Windows at 07:00 AM (Inversion Trap ~${morningPeakPm25} µg/m³)`,
      baselineOptionHi: `सुबह 07:00 बजे खिड़कियां खोलना (~${morningPeakPm25} µg/m³)`,
      baselineDoseUg: morningVentLoad,
      saferOptionEn: `Brief 15–20 min Ventilation at 14:30 PM (Solar Mixing Dip ~${middayPm25} µg/m³)`,
      saferOptionHi: `दोपहर 14:30 बजे 15-20 मिनट वेंटिलेशन (~${middayPm25} µg/m³)`,
      saferDoseUg: middayVentLoad,
      avoidedDoseUg: Math.max(0, morningVentLoad - middayVentLoad),
      reductionRangeLabel: '25–40% lower indoor PM2.5 infiltration (Diurnal Boundary-Layer Ratio)',
      mechanismEn:
        'Afternoon solar heating lifts the atmospheric boundary layer, diluting surface particulate concentration.',
      mechanismHi:
        'दोपहर की धूप से वायुमंडलीय परत ऊपर उठती है और जमीन पर प्रदूषक घनत्व घटता है।',
      limitationEn:
        'When outdoor NAQI exceeds 350 (Severe), even afternoon air remains hazardous—limit opening to 10 minutes solely for CO2 relief.',
      limitationHi:
        'जब बाहरी NAQI > 350 हो, तब दोपहर की हवा भी पूर्णतः सुरक्षित नहीं होती; केवल CO2 कम करने के लिए 10 मिनट खोलें।',
      basis,
    },
    {
      id: 'whatif-cooking',
      titleEn: 'Unvented Pan Frying & Incense vs. Exhaust-Isolated Pressure Cooking (60 min)',
      titleHi: 'बिना एग्जॉस्ट तड़का/अगरबत्ती बनाम बंद दरवाजा + एग्जॉस्ट कुकिंग (60 मिनट)',
      durationMinutes: 60,
      baselineOptionEn: 'Open Kitchen Door Frying + 1 Mosquito Coil / Incense Stick (+220 µg/m³ indoor spike)',
      baselineOptionHi: 'खुला रसोई दरवाजा तलना + मच्छर कॉइल/अगरबत्ती (+220 µg/m³ उछाल)',
      baselineDoseUg: unventedCookingDose,
      saferOptionEn: 'Closed Kitchen Door + Exhaust Fan On + Pressure Cooking & Zero Indoor Smoke',
      saferOptionHi: 'बंद रसोई दरवाजा + एग्जॉस्ट फैन + प्रेशर कुकिंग व शून्य धुआं',
      saferDoseUg: ventedCookingDose,
      avoidedDoseUg: Math.max(0, unventedCookingDose - ventedCookingDose),
      reductionRangeLabel: '65–80% lower indoor combustion aerosol spike (Indoor Source Control)',
      mechanismEn:
        'Captures ultrafine oil and combustion aerosols at the source before they diffuse into bedrooms for 6–12 hours.',
      mechanismHi:
        'रसोई के धुएं को स्रोत पर ही बाहर निकालता है ताकि वह बेडरूम में न फैले।',
      limitationEn:
        'Requires an exterior-vented exhaust fan or window opening; recirculating grease hoods do not remove PM2.5 or CO.',
      limitationHi:
        'इसके लिए बाहरी एग्जॉस्ट फैन आवश्यक है; बिना पाइप की चिमनी PM2.5 या CO नहीं हटाती।',
      basis: 'safety_rule',
    },
  ];
}

export function generateIndoorAirGuidance(
  report: AirQualityReport,
  profile: FamilyProfile
): IndoorGuidanceItem[] {
  const hi = profile.language === 'hi';
  const naqi = report.naqi;

  return [
    {
      id: 'ind-ventilation',
      category: 'ventilation',
      title: hi ? 'वेंटिलेशन का सही समय' : 'Smart Ventilation Timing',
      recommendation:
        naqi > 300
          ? hi
            ? `वर्तमान NAQI (${naqi}) बहुत गंभीर है। आज क्रॉस-वेंटिलेशन के लिए खिड़कियां न खोलें। केवल रसोई/बाथरूम एग्जॉस्ट फैन का संक्षिप्त उपयोग करें।`
            : `At NAQI ${naqi} (${report.category}), do NOT open windows for cross-ventilation today. Only crack a window for 10–15 minutes between 14:00 and 15:30 if indoor CO2/stuffiness is high.`
          : hi
            ? `दोपहर 13:30 से 15:30 के बीच जब बाहरी NAQI घटकर ~${report.saferOutdoorWindow.expectedNaqi} होता है, तब 20–30 मिनट के लिए खिड़कियां खोलकर ताजी हवा लें।`
            : `Ventilate your home for 20–30 minutes strictly during the afternoon solar dispersion window (13:30–15:30, expected NAQI ~${report.saferOutdoorWindow.expectedNaqi}).`,
      mechanism: hi
        ? 'दोपहर की धूप से इनवर्जन परत ऊपर उठती है, जिससे सुबह/रात की तुलना में कम PM2.5 अंदर आता है।'
        : 'Afternoon solar heating raises the atmospheric mixing height, dropping outdoor particulate concentrations by 25–35% compared to morning and night peaks.',
      limitation: hi
        ? 'सीमा: जब बाहरी NAQI > 350 हो, तब दोपहर की हवा भी पूर्णतः सुरक्षित नहीं होती; वेंटिलेशन केवल CO2 कम करने के लिए संक्षिप्त रखें।'
        : 'Limitation: Natural ventilation cannot clean indoor air when outdoor PM2.5 exceeds indoor levels; during Severe smog (>350 NAQI), ventilation must be minimized solely to prevent indoor CO2 buildup.',
      isLowCostFriendly: true,
      basis: 'measured_data',
    },
    {
      id: 'ind-sealing',
      category: 'sealing',
      title: hi ? 'दरवाजे और खिड़कियों की सीलिंग' : 'Door & Window Gap Sealing',
      recommendation: hi
        ? 'बालकनी के दरवाजों के नीचे मुड़ा हुआ कपड़ा/ड्राफ्ट स्टॉपर लगाएं और पुरानी खिड़कियों की दरारों पर पेपर मास्किंग टेप या फोम स्ट्रिप लगाएं।'
        : 'Place rolled cotton towels or ₹99 foam draft-stoppers under exterior doors and seal rattling window frame gaps with removable paper masking tape.',
      mechanism: hi
        ? 'बंद दिखने वाले घरों में भी 40-60% बाहरी PM2.5 दरवाजों और खिड़कियों की सूक्ष्म दरारों से अंदर घुसता है।'
        : 'Reduces the outdoor-to-indoor air exchange rate (ACH), cutting passive infiltration of nighttime smog by 30–45%.',
      limitation: hi
        ? 'सीमा: गैस चूल्हा जलते समय कमरे को पूरी तरह एयर-टाइट न करें, अन्यथा कार्बन मोनोऑक्साइड (CO) जमा हो सकती है।'
        : 'Limitation: Never hermetically seal a room where an unvented LPG stove, geyser, or coal angithi is burning—doing so risks lethal carbon monoxide (CO) accumulation.',
      isLowCostFriendly: true,
      basis: 'safety_rule',
    },
    {
      id: 'ind-cooking',
      category: 'cooking',
      title: hi ? 'रसोई उत्सर्जन और इनडोर धुआं रोकथाम' : 'Cooking Plumes & Indoor Combustion Sources',
      recommendation: hi
        ? 'तड़का या तलने से पहले एग्जॉस्ट फैन चालू करें, रसोई का दरवाजा बंद रखें, और घर के अंदर अगरबत्ती, धूप, मच्छर कॉइल या तंबाकू का धुआं पूरी तरह बंद करें।'
        : 'Turn on the kitchen exhaust fan BEFORE heating oil, close the kitchen door to isolate living spaces, and eliminate indoor incense, dhoop, candle, and mosquito-coil combustion.',
      mechanism: hi
        ? 'स्रोत पर ही धुएं को बाहर निकालने से वह पूरे घर की हवा में नहीं फैलता।'
        : 'Source capture removes ultrafine cooking aerosols (<0.1 µm) before they diffuse into bedrooms where they stay suspended for 6–12 hours.',
      limitation: hi
        ? 'सीमा: रीसर्कुलेटिंग चिमनी (बिना बाहरी पाइप के) केवल चिकनाई रोकती है, महीन PM2.5 या गैसें नहीं।'
        : 'Limitation: Ductless recirculating kitchen hoods only trap grease and odors—they do not remove fine PM2.5 or NO2 unless vented outdoors.',
      isLowCostFriendly: true,
      basis: 'safety_rule',
    },
    {
      id: 'ind-dust',
      category: 'dust_cleaning',
      title: hi ? 'गीला पोछा बनाम सूखी झाड़ू' : 'Wet Mopping vs. Dry Sweeping',
      recommendation: hi
        ? 'सर्दियों के स्मॉग के दौरान घर में सूखी झाड़ू या सूखे कपड़े से डस्टिंग बंद करें। केवल गीले पोछे और नम कपड़े का उपयोग करें।'
        : 'Replace all dry broom sweeping and feather dusting with damp microfiber wiping and wet floor mopping.',
      mechanism: hi
        ? 'पानी की नमी धूल और सेटल हुए PM10/PM2.5 कणों को बांध लेती है और उन्हें हवा में उड़ने से रोकती है।'
        : 'Capillary moisture binds settled particulate matter to the mop cloth, preventing mechanical resuspension into children’s breathing height.',
      limitation: hi
        ? 'सीमा: यह केवल सतह पर बैठी धूल को उड़ने से रोकता है; हवा में पहले से तैर रहे PM2.5 को कम नहीं करता।'
        : 'Limitation: Wet mopping prevents secondary resuspension of settled dust (~15–25% of indoor load) but cannot scrub suspended sub-micron aerosols from the air.',
      isLowCostFriendly: true,
      basis: 'safety_rule',
    },
    {
      id: 'ind-filtration',
      category: 'filtration',
      title: hi ? 'एयर प्यूरीफायर रखरखाव और किफायती विकल्प' : 'HEPA Filtration & Low-Cost Box-Fan Alternative',
      recommendation: hi
        ? 'HEPA प्यूरीफायर के प्री-फिल्टर (बाहरी जाली) को हर 10 दिन में साफ करें। यदि प्यूरीफायर नहीं है, तो ₹1,500 के टेबल/बॉक्स फैन के पीछे HEPA/MERV-13 फिल्टर बांधकर किफायती DIY प्यूरीफायर बनाएं। (नोट: इनडोर पौधे स्मॉग साफ नहीं करते)।'
        : 'Clean your purifier’s mesh pre-filter every 10–14 days during winter smog. If a commercial purifier is unaffordable, strap a replacement H13 HEPA / MERV-13 filter to a standard box fan. Note: Indoor plants do NOT filter acute PM2.5.',
      mechanism: hi
        ? 'H13 HEPA फाइबर 0.3 माइक्रोन के 99.95% कणों को यांत्रिक रूप से फंसा लेते हैं।'
        : 'Mechanical impaction, interception, and diffusion across dense borosilicate/PP fibers capture >99% of fine particulates per pass when room doors remain closed.',
      limitation: hi
        ? 'सीमा: खुले दरवाजे या बड़े हॉल में छोटा प्यूरीफायर काम नहीं करता। साथ ही, NASA के अध्ययनों के विपरीत, कमरे में 10-20 गमले रखने से PM2.5 पर कोई व्यावहारिक असर नहीं पड़ता।'
        : 'Limitation: A purifier fails if windows remain ajar or if its CADR is undersized for the room. Furthermore, scientific consensus confirms houseplants, water bowls, or salt lamps have virtually zero impact on room PM2.5 CADR.',
      isLowCostFriendly: true,
      basis: 'safety_rule',
    },
    {
      id: 'ind-masks',
      category: 'masks',
      title: hi ? 'मास्क का सही चयन और उपयोग' : 'Respirator Selection & Fit (N95/FFP2 vs. Cloth)',
      recommendation: hi
        ? 'बाहर जाते समय नोज़-क्लिप वाला N95, KN95 या FFP2 मास्क पहनें। रुमाल, दुपट्टा या साधारण सर्जिकल मास्क PM2.5 से सुरक्षा नहीं देते।'
        : 'Use BIS/NIOSH-certified N95, FFP2, or KN95 respirators with a pinched metal nose-bridge clip and dual head/ear straps. Store used masks in a breathable paper bag for up to 35–40 hours of cumulative winter reuse.',
      mechanism: hi
        ? 'इलेक्ट्रोस्टैटिक मेल्ट-ब्लोन पॉलीप्रोपाइलीन परत बिना सांस रोके सूक्ष्म PM2.5 कणों को आकर्षित कर रोक लेती है।'
        : 'Electrostatically charged melt-blown polypropylene layers capture sub-micron PM2.5 at >95% efficiency when sealed against the face.',
      limitation: hi
        ? 'सीमा: दाढ़ी या ढीली फिटिंग से 40% हवा किनारे से लीक हो जाती है। 2 वर्ष से छोटे शिशुओं को कभी मास्क न पहनाएं (दम घुटने का जोखिम)।'
        : 'Limitation: Facial hair or gaps around the nose bridge reduce real-world protection from 95% down to <50%. Never place masks on infants or toddlers under age 2 due to suffocation and airway resistance risks.',
      isLowCostFriendly: true,
      basis: 'safety_rule',
    },
  ];
}

export function generateLowEmissionAlternatives(
  report: AirQualityReport,
  profile: FamilyProfile
): LifestyleAlternative[] {
  const hi = profile.language === 'hi';

  return [
    {
      id: 'alt-commute-modal-shift',
      highEmissionActivity: hi
        ? 'अकेले कार या खुले दुपहिया वाहन से दैनिक यात्रा'
        : 'Solo Petrol/Diesel Car or Open Two-Wheeler Commute (10 km round-trip)',
      sustainableAlternative: hi
        ? 'मेट्रो रेल / इलेक्ट्रिक बस + अंतिम मील पर N95 मास्क, या 3 पड़ोसियों के साथ कारपूल'
        : 'Shift to Metro Rail / Electric Bus (with N95 mask) or 3-Household Neighborhood Carpool',
      outcomeCategory: 'emission_reduction',
      outcomeDistinction: hi
        ? 'उत्सर्जन में कमी + व्यक्तिगत संपर्क में कमी (दोनों)'
        : 'Reduces Both Outdoor Tailpipe Emissions AND Personal PM2.5 Exposure (vs. open two-wheeler)',
      mechanism: hi
        ? 'प्रति यात्री ईंधन की खपत 70-85% घटती है और बंद मेट्रो कोच में सड़क की तुलना में PM2.5 संपर्क 55% कम होता है।'
        : 'Eliminates single-occupancy combustion cold-starts while shifting riders out of direct tailpipe plume corridors into filtered/enclosed transit.',
      co2SavedGramsPerAction: 1420,
      pm25TailpipeSavedMgPerAction: 380,
      personalExposureDeltaPct: 55,
      methodologyAndAssumptions:
        'Methodology: ARAI India passenger car emission factor (~165 g CO2/km, ~38 mg PM2.5/km including brake/tire wear) minus Delhi Metro grid traction share (~23 g CO2/passenger-km) over a 10 km round trip.',
      impactActionType: 'shared_journey_taken',
    },
    {
      id: 'alt-trip-consolidation',
      highEmissionActivity: hi
        ? 'बाजार के कामों के लिए दिन में 3 बार अलग-अलग वाहन निकालना'
        : 'Multiple Short Cold-Start Vehicle Errands (3 separate 3 km trips)',
      sustainableAlternative: hi
        ? 'दोपहर 13:30–16:00 के बीच एक ही समेकित ट्रिप या स्थानीय सामुदायिक डिलीवरी'
        : 'Consolidate into 1 Warm-Engine Midday Trip or Walk/Cycle (only when NAQI ≤ 150)',
      outcomeCategory: 'emission_reduction',
      outcomeDistinction: hi
        ? 'उत्सर्जन में कमी (Cold-Start प्रदूषण रोकथाम)'
        : 'Primarily Outdoor Emission Reduction (plus midday exposure optimization)',
      mechanism: hi
        ? 'ठंडे इंजन के शुरुआती 2 किमी में उत्प्रेरक कन्वर्टर (Catalytic Converter) ठंडा होने से 3 गुना अधिक प्रदूषण निकलता है।'
        : 'Catalytic converters operate below light-off temperature during the first 2–3 km of a winter trip; eliminating 2 cold starts cuts disproportionate hydrocarbon and PM emissions.',
      co2SavedGramsPerAction: 880,
      pm25TailpipeSavedMgPerAction: 290,
      personalExposureDeltaPct: 35,
      methodologyAndAssumptions:
        'Methodology: 6 km avoided urban stop-and-go driving with a 1.4× winter cold-start emission penalty factor (CPCB/ARAI urban driving cycle).',
      impactActionType: 'vehicle_trip_avoided',
    },
    {
      id: 'alt-zero-idling',
      highEmissionActivity: hi
        ? 'स्कूल गेट, ट्रैफिक सिग्नल और सुबह गाड़ी गर्म करने के लिए 15 मिनट इंजन चालू रखना'
        : 'Idling Vehicle at School Gates, Red Lights (>30s), and Winter Morning Warm-Ups (15 min/day)',
      sustainableAlternative: hi
        ? '30 सेकंड से अधिक रुकने पर इंजन बंद करें ("रेड लाइट ऑन, गाड़ी ऑफ")'
        : 'Turn Engine Off at School Pickup Zones & Signals >30 Seconds',
      outcomeCategory: 'emission_reduction',
      outcomeDistinction: hi
        ? 'उत्सर्जन में कमी + स्कूल के बच्चों के संपर्क में सीधी कमी'
        : 'Direct Local Emission Reduction at Children’s Breathing Height',
      mechanism: hi
        ? 'आइडलिंग के दौरान ईंधन अधूरा जलता है और बच्चों के चेहरे की ऊंचाई (1 मीटर) पर सीधा NO2 और PM2.5 छोड़ता है।'
        : 'Zero-speed idling produces concentrated exhaust plumes with minimal aerodynamic dispersion right at school-gate pedestrian height.',
      co2SavedGramsPerAction: 390,
      pm25TailpipeSavedMgPerAction: 145,
      personalExposureDeltaPct: 25,
      methodologyAndAssumptions:
        'Methodology: Petrol/Diesel passenger vehicle idling consumption (~0.6–0.8 L/hour; ~26 g CO2/minute and ~9.6 mg PM2.5/minute across a 15-minute daily avoidance window).',
      impactActionType: 'idling_avoided',
    },
    {
      id: 'alt-active-mobility-conditional',
      highEmissionActivity: hi
        ? '1-2 किमी की छोटी दूरी के लिए स्कूटर/कार का उपयोग'
        : 'Using Motor Vehicles for <2 km Neighborhood Trips',
      sustainableAlternative:
        report.naqi <= 180
          ? hi
            ? 'वर्तमान NAQI उपयुक्त है: पैदल चलें या साइकिल चलाएं (शून्य उत्सर्जन)'
            : `Current NAQI (${report.naqi}) allows walking or cycling during midday hours with zero tailpipe emissions.`
          : hi
            ? `चेतावनी: वर्तमान NAQI (${report.naqi}) में साइकिल चलाना फेफड़ों के लिए हानिकारक है। इसके बजाय N95 पहनकर ई-रिक्शा शेयर करें।`
            : `CAUTION: At NAQI ${report.naqi}, cycling increases inhaled PM2.5 dose due to heavy breathing. Use a shared electric e-rickshaw while wearing an N95 mask instead.`,
      outcomeCategory: 'exposure_reduction',
      outcomeDistinction: hi
        ? 'महत्वपूर्ण अंतर: गंभीर स्मॉग में साइकिल चलाने से उत्सर्जन तो घटता है लेकिन व्यक्तिगत फेफड़ों का जोखिम बढ़ता है'
        : 'Critical Distinction: Reducing emissions ≠ reducing personal exposure when outdoor NAQI > 200',
      mechanism: hi
        ? 'साझा ई-रिक्शा टेलपाइप धुआं भी रोकता है और साइकिल चलाने जितनी तेज सांस भी नहीं फूलने देता।'
        : 'Balances zero local tailpipe emission (electric three-wheeler) with resting-rate breathing behind an N95 respirator during severe smog episodes.',
      co2SavedGramsPerAction: 320,
      pm25TailpipeSavedMgPerAction: 110,
      personalExposureDeltaPct: 48,
      methodologyAndAssumptions:
        'Methodology: 2 km two-wheeler/car cold-start substitution with shared battery e-rickshaw + N95 filtration factor.',
      impactActionType: 'shared_journey_taken',
    },
    {
      id: 'alt-clean-heating-waste',
      highEmissionActivity: hi
        ? 'सर्दियों की रात में अलाव (लकड़ी/कोयला/पत्ते/कचरा) जलाना'
        : 'Open Burning of Garden Leaves, Solid Waste, or Nighttime Security Coal/Wood Braziers',
      sustainableAlternative: hi
        ? 'पत्तियों की कम्पोस्टिंग करें और रात्रि सुरक्षाकर्मियों को इलेक्ट्रिक हीटर व गर्म कंबल दें'
        : 'Leaf Mulching/Composting + Providing Electric Oil/Radiant Heaters & Thermal Blankets to Night Guards',
      outcomeCategory: 'emission_reduction',
      outcomeDistinction: hi
        ? 'सामुदायिक उत्सर्जन और रात के इनडोर घुसपैठ दोनों में भारी कमी'
        : 'Massive Neighborhood Emission Reduction + Prevents Overnight Indoor Smoke Infiltration',
      mechanism: hi
        ? '1 किलो सूखी पत्तियां या कचरा खुले में जलाने से 30,000 मिलीग्राम से अधिक सीधा PM2.5 और जहरीला डाइऑक्सिन निकलता है।'
        : 'Uncontrolled low-temperature smoldering of 1 kg of biomass/leaves emits ~12–30 g of pure PM2.5 directly into the stagnant nighttime boundary layer.',
      co2SavedGramsPerAction: 1650,
      pm25TailpipeSavedMgPerAction: 12000,
      personalExposureDeltaPct: 60,
      methodologyAndAssumptions:
        'Methodology: IPCC / CPCB open biomass combustion emission factor (~12 g PM2.5 and ~1.65 kg CO2 per kg of dry garden biomass/wood avoided).',
      impactActionType: 'indoor_protection_completed',
    },
  ];
}
