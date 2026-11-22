import {
  CommunityInitiative,
  CompletedActionRecord,
  ImpactActionType,
  ImpactSummary,
} from '@/types/smogshield';

/**
 * Transparent, defensible calculation of household exposure and emission reductions.
 * Every formula uses published physical parameters and explicitly discloses assumptions.
 */
export function calculateHonestImpactSummary(
  records: CompletedActionRecord[]
): ImpactSummary {
  const countsByType: Record<ImpactActionType, number> = {
    outdoor_trip_rescheduled: 0,
    vehicle_trip_avoided: 0,
    shared_journey_taken: 0,
    idling_avoided: 0,
    indoor_protection_completed: 0,
    clean_cooking_ventilation: 0,
  };

  let totalInhaledPm25AvoidedUg = 0;
  let totalCo2AvoidedGrams = 0;
  let totalTailpipePm25AvoidedMg = 0;

  for (const rec of records) {
    if (rec.actionType in countsByType) {
      countsByType[rec.actionType] += 1;
    }

    const pm25 = Math.max(15, rec.pm25AtCompletion || 150);
    const durationMin = Math.max(5, rec.durationMinutes || 30);
    const distKm = Math.max(1, rec.distanceKm || 6);

    switch (rec.actionType) {
      case 'outdoor_trip_rescheduled': {
        // Formula: Resting/Exercise ventilation rate delta (~0.025 m3/min during light exercise vs 0.008 m3/min resting indoors)
        // Indoor concentration assumed 45% lower than peak outdoor concentration when doors/windows are closed.
        const outdoorVolumeM3 = 0.022 * durationMin;
        const outdoorDoseUg = outdoorVolumeM3 * pm25;
        const indoorDoseUg = 0.009 * durationMin * (pm25 * 0.55);
        totalInhaledPm25AvoidedUg += Math.max(0, Math.round(outdoorDoseUg - indoorDoseUg));
        break;
      }
      case 'vehicle_trip_avoided': {
        // ARAI passenger vehicle factor: ~155 g CO2/km and ~35 mg PM2.5/km (exhaust + non-exhaust wear)
        totalCo2AvoidedGrams += Math.round(distKm * 155);
        totalTailpipePm25AvoidedMg += Math.round(distKm * 35);
        // Plus commuter exposure avoided
        totalInhaledPm25AvoidedUg += Math.round(0.012 * durationMin * pm25 * 0.5);
        break;
      }
      case 'shared_journey_taken': {
        // Modal shift / carpool saves ~115 g CO2/km and ~26 mg PM2.5/km per solo vehicle displaced,
        // and N95 + enclosed transit cuts personal inhalation dose by ~65%
        totalCo2AvoidedGrams += Math.round(distKm * 115);
        totalTailpipePm25AvoidedMg += Math.round(distKm * 26);
        totalInhaledPm25AvoidedUg += Math.round(0.014 * durationMin * pm25 * 0.65);
        break;
      }
      case 'idling_avoided': {
        // 15 minutes idling avoided: ~26 g CO2/min and ~9.5 mg PM2.5/min
        const idleMin = Math.min(60, durationMin);
        totalCo2AvoidedGrams += Math.round(idleMin * 26);
        totalTailpipePm25AvoidedMg += Math.round(idleMin * 9.5);
        totalInhaledPm25AvoidedUg += Math.round(0.01 * idleMin * pm25 * 0.3);
        break;
      }
      case 'indoor_protection_completed': {
        // Overnight / evening room sealing, wet mopping, or filtration across a 4-hour effective exposure block
        // Resting inhalation rate ~0.008 m3/min * 180 min * 40% indoor PM2.5 reduction
        totalInhaledPm25AvoidedUg += Math.round(0.008 * 180 * pm25 * 0.4);
        break;
      }
      case 'clean_cooking_ventilation': {
        // Exhaust capture / avoiding indoor frying smoke or incense prevents a ~140 ug/m3 indoor spike for 60 minutes
        totalInhaledPm25AvoidedUg += Math.round(0.01 * 60 * 140 * 0.65);
        break;
      }
    }
  }

  return {
    totalActionsCompleted: records.length,
    countsByType,
    estimatedInhaledPm25AvoidedUg: totalInhaledPm25AvoidedUg,
    estimatedCo2AvoidedGrams: totalCo2AvoidedGrams,
    estimatedTailpipePm25AvoidedMg: totalTailpipePm25AvoidedMg,
    methodologyDisclosures: [
      'Inhaled PM2.5 Dose Equation: Dose (µg) = Minute Ventilation Rate (m³/min) × Exposure Duration (min) × Ambient PM2.5 Concentration (µg/m³) × Filtration/Enclosure Reduction Factor.',
      'Ventilation Reference Rates (US EPA Exposure Factors Handbook / ICMR): Resting indoor = 0.008–0.009 m³/min; Commuting = 0.012–0.014 m³/min; Moderate outdoor exercise = 0.022–0.035 m³/min.',
      'Vehicle Emission Factors (ARAI India / CPCB Urban Driving Cycle): Solo passenger vehicle = ~155 g CO2e/km and ~35 mg PM2.5/km (exhaust + brake/tire resuspension); Idling = ~26 g CO2e/min.',
    ],
    limitations: [
      'All calculated benefits are physics-based engineering estimates for educational tracking—not clinical spirometry or direct tailpipe sensor telemetry.',
      'Actual personal PM2.5 reduction depends strongly on mask facial seal (N95/FFP2 leak rate) and home building envelope tightness.',
      'Avoiding a single household vehicle trip reduces local emissions marginally; measurable ambient AQI reduction requires community-wide participation.',
    ],
  };
}

export const INITIAL_COMMUNITY_INITIATIVES: CommunityInitiative[] = [
  {
    id: 'school-gate-no-idling',
    category: 'no_idling',
    titleEn: 'School Gate Zero-Idling Zone ("Red Engine Off at Pickup")',
    titleHi: 'स्कूल गेट ज़ीरो-आइडलिंग अभियान (पिकअप पर इंजन बंद)',
    summaryEn:
      'Coordinate with school transport committees and parents to switch off car, van, and two-wheeler engines while waiting >30 seconds at morning drop-off and afternoon dispersal gates.',
    summaryHi:
      'सुबह बच्चों को छोड़ते और दोपहर में लाते समय स्कूल गेट पर 30 सेकंड से अधिक प्रतीक्षा करने पर कार, वैन और स्कूटर का इंजन बंद रखने का सामूहिक संकल्प।',
    targetGroup: 'Parent-Teacher Associations (PTAs) & School Bus Operators',
    outcomeCategory: 'emission_reduction',
    actionStepsEn: [
      'Pledge to turn off your vehicle ignition immediately upon parking in the school pickup queue.',
      'Share the bilingual "Zero-Idling School Gate" advisory poster in your class parent WhatsApp group.',
      'Request school guards to display a "Turn Engines Off — Protect Young Lungs" board at the main gate.',
    ],
    actionStepsHi: [
      'स्कूल पिकअप लाइन में रुकते ही अपने वाहन का इंजन तुरंत बंद करें।',
      'कक्षा के अभिभावक व्हाट्सएप ग्रुप में "स्कूल गेट ज़ीरो-आइडलिंग" सलाह साझा करें।',
      'स्कूल प्रबंधन से मुख्य गेट पर "इंजन बंद रखें — बच्चों के फेफड़े बचाएं" बोर्ड लगाने का अनुरोध करें।',
    ],
    householdsPledged: 142,
    impactMetricLabel: 'Avoids concentrated NO2 & PM2.5 plumes directly at children’s 1.1m breathing height',
  },
  {
    id: 'rwa-night-guard-heaters',
    category: 'waste_burning_prevention',
    titleEn: 'RWA Night-Guard Clean Heating (Replace Open Biomass Bonfires)',
    titleHi: 'RWA रात्रि सुरक्षाकर्मी स्वच्छ हीटर पहल (खुले अलाव का विकल्प)',
    summaryEn:
      'Nighttime winter bonfires lit by security guards and street workers for warmth are a major source of toxic overnight PM2.5 infiltration into ground- and first-floor bedrooms. Equip guards with safe electric radiant heaters and thermal jackets.',
    summaryHi:
      'सर्दियों की रात में ठंड से बचने के लिए जलाए जाने वाले लकड़ी/कचरे के अलाव रात के स्मॉग का प्रमुख कारण हैं। सोसाइटी के गार्ड्स को इलेक्ट्रिक हीटर और गर्म जैकेट उपलब्ध कराएं।',
    targetGroup: 'Resident Welfare Associations (RWAs) & Apartment Societies',
    outcomeCategory: 'emission_reduction',
    actionStepsEn: [
      'Audit all security booths in your residential lane or apartment complex for power sockets.',
      'Pool ₹150–₹200 per flat to provide oil-filled or covered quartz electric heaters and insulated flasks to night guards.',
      'Ensure fallen dry garden leaves are collected for society compost pits rather than swept into burn piles.',
    ],
    actionStepsHi: [
      'अपनी कॉलोनी या सोसाइटी के सभी गार्ड बूथों में बिजली के सॉकेट की व्यवस्था जांचें।',
      'प्रति परिवार ₹150–₹200 एकत्र कर रात्रि गार्ड्स को सुरक्षित इलेक्ट्रिक हीटर और गर्म पानी का थर्मस दें।',
      'पार्क की सूखी पत्तियों को जलाने के बजाय खाद (Compost) गड्ढे में डालें।',
    ],
    householdsPledged: 218,
    impactMetricLabel: 'Eliminates ~12,000 mg of direct local PM2.5 per kg of unburned wood/waste each night',
  },
  {
    id: 'metro-feeder-carpool',
    category: 'shared_transport',
    titleEn: 'Neighborhood Metro-Station Carpool & Office Shuttle Ring',
    titleHi: 'मोहल्ला मेट्रो-स्टेशन कारपूल और ऑफिस शटल पहल',
    summaryEn:
      'Match 3–4 neighbors departing within the same 30-minute morning window (08:00–09:30) to share a single enclosed car (AC recirculation on) to the nearest Metro hub or IT business park.',
    summaryHi:
      'सुबह एक ही समय (08:00–09:30) पर निकलने वाले 3–4 पड़ोसियों के साथ मिलकर एक ही कार (AC रीसर्कुलेशन मोड पर) से मेट्रो स्टेशन या ऑफिस हब तक यात्रा करें।',
    targetGroup: 'Daily Office Commuters & Residential Block Groups',
    outcomeCategory: 'emission_reduction',
    actionStepsEn: [
      'Post your departure time and destination corridor (e.g., CyberHub, Noida Sec-62, Connaught Place) on your society notice board.',
      'Rotate driving days among 3 vehicle owners to cut cold-start fuel costs and parking congestion by 66%.',
      'Keep vehicle cabin air on internal recirculation during high-traffic highway stretches.',
    ],
    actionStepsHi: [
      'अपनी सोसाइटी के नोटिस ग्रुप में अपना निकलने का समय और ऑफिस रूट साझा करें।',
      '3 पड़ोसियों के बीच बारी-बारी से कार चलाएं जिससे ईंधन खर्च और प्रदूषण दोनों में 66% की कमी आए।',
      'ट्रैफिक जाम के दौरान कार का AC हमेशा इंटरनल रीसर्कुलेशन मोड पर रखें।',
    ],
    householdsPledged: 96,
    impactMetricLabel: 'Displaces 2 out of every 3 cold-start combustion vehicles during peak morning inversion',
  },
  {
    id: 'construction-dust-audit',
    category: 'dust_control',
    titleEn: 'Local Construction Dust & Road Sprinkling Watch',
    titleHi: 'स्थानीय निर्माण धूल कवर और पानी छिड़काव निगरानी',
    summaryEn:
      'Uncovered sand, rubble mounds, and dry demolition work violate GRAP (Graded Response Action Plan) winter norms and spike coarse PM10 across 500 meters. Use constructive civic reporting and green-net covering.',
    summaryHi:
      'खुली रेत, मलबा और बिना ग्रीन-नेट के निर्माण कार्य GRAP नियमों का उल्लंघन हैं और 500 मीटर के दायरे में PM10 बढ़ाते हैं। निर्माण सामग्री को ढकवाने और पानी छिड़काव में सहयोग करें।',
    targetGroup: 'Neighborhood Civic Volunteers & Ward Committees',
    outcomeCategory: 'exposure_reduction',
    actionStepsEn: [
      'Check if active renovation or building plots on your street have tarpaulin/green-mesh covers over sand and debris piles.',
      'Request plot supervisors to sprinkle recycled/non-potable water twice daily (09:00 and 15:00) to bind loose soil.',
      'Report severe uncovered dumping or illegal industrial burning via the official CPCB Sameer App civic portal.',
    ],
    actionStepsHi: [
      'जांचें कि आपकी गली में चल रहे निर्माण कार्य में रेत और मलबे को ग्रीन-नेट/तिरपाल से ढका गया है या नहीं।',
      'निर्माण स्थल पर दिन में दो बार (सुबह 9 बजे और दोपहर 3 बजे) पानी का छिड़काव कराने का आग्रह करें।',
      'गंभीर उल्लंघन या खुले में कचरा जलाने की शिकायत आधिकारिक CPCB Sameer App पर दर्ज करें।',
    ],
    householdsPledged: 114,
    impactMetricLabel: 'Cuts localized street-level PM10 resuspension by up to 50% under GRAP compliance',
  },
];
