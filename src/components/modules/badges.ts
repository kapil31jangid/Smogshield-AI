import {
  EvidenceBasis,
  FreshnessStatus,
  Language,
  NAQICategory,
} from '@/types/smogshield';

export function getCategoryStyles(category: NAQICategory): {
  bg: string;
  border: string;
  badge: string;
  text: string;
  labelHi: string;
} {
  switch (category) {
    case 'Good':
      return {
        bg: 'bg-emerald-950 text-white',
        border: 'border-emerald-700',
        badge: 'bg-emerald-100 text-emerald-950 border-emerald-400',
        text: 'text-emerald-800',
        labelHi: 'अच्छा (Good)',
      };
    case 'Satisfactory':
      return {
        bg: 'bg-teal-950 text-white',
        border: 'border-teal-700',
        badge: 'bg-teal-100 text-teal-950 border-teal-400',
        text: 'text-teal-800',
        labelHi: 'संतोषजनक (Satisfactory)',
      };
    case 'Moderate':
      return {
        bg: 'bg-amber-950 text-white',
        border: 'border-amber-700',
        badge: 'bg-amber-100 text-amber-950 border-amber-400',
        text: 'text-amber-900',
        labelHi: 'मध्यम (Moderate)',
      };
    case 'Poor':
      return {
        bg: 'bg-orange-950 text-white',
        border: 'border-orange-700',
        badge: 'bg-orange-100 text-orange-950 border-orange-400',
        text: 'text-orange-900',
        labelHi: 'खराब (Poor)',
      };
    case 'Very Poor':
      return {
        bg: 'bg-red-950 text-white',
        border: 'border-red-700',
        badge: 'bg-red-100 text-red-950 border-red-400',
        text: 'text-red-900',
        labelHi: 'बहुत खराब (Very Poor)',
      };
    case 'Severe':
      return {
        bg: 'bg-rose-950 text-white',
        border: 'border-rose-800',
        badge: 'bg-rose-200 text-rose-950 border-rose-500',
        text: 'text-rose-950',
        labelHi: 'गंभीर (Severe)',
      };
  }
}

export function getFreshnessBadge(
  freshness: FreshnessStatus,
  lang: Language
): { label: string; style: string } {
  const hi = lang === 'hi';
  switch (freshness) {
    case 'live':
      return {
        label: hi ? 'लाइव स्टेशन डेटा (<1 घंटा)' : 'Live Station Measurement (<1h)',
        style: 'bg-emerald-100 text-emerald-950 border-emerald-400',
      };
    case 'delayed':
      return {
        label: hi ? 'विलंबित स्टेशन डेटा (1-4 घंटे)' : 'Delayed Measurement (1–4h)',
        style: 'bg-amber-100 text-amber-950 border-amber-400',
      };
    case 'estimated':
      return {
        label: hi
          ? 'वायुमंडलीय मॉडल अनुमान (CPCB सूत्र)'
          : 'Atmospheric Model Estimate (CPCB NAQI)',
        style: 'bg-sky-100 text-sky-950 border-sky-400',
      };
    case 'stale':
      return {
        label: hi
          ? 'पुराना डेटा (>4 घंटे — सुरक्षा बफर लागू)'
          : 'Stale Reading (>4h — Safety Buffer Active)',
        style: 'bg-orange-100 text-orange-950 border-orange-500',
      };
    case 'unavailable':
      return {
        label: hi
          ? 'लाइव डेटा अनुपलब्ध (ऑफ़लाइन संदर्भ बेसलाइन)'
          : 'Live Feed Unavailable (Offline Reference Baseline)',
        style: 'bg-rose-100 text-rose-950 border-rose-500',
      };
  }
}

export function getBasisLabel(
  basis: EvidenceBasis,
  lang: Language
): { text: string; cls: string } {
  const hi = lang === 'hi';
  switch (basis) {
    case 'measured_data':
      return {
        text: hi ? 'मापा गया स्टेशन डेटा' : 'Based on Measured Data',
        cls: 'bg-emerald-50 text-emerald-900 border-emerald-300',
      };
    case 'safety_rule':
      return {
        text: hi ? 'निर्धारक सुरक्षा नियम' : 'Deterministic Safety Rule',
        cls: 'bg-amber-50 text-amber-950 border-amber-300',
      };
    case 'model_estimate':
      return {
        text: hi ? 'मॉडल अनुमान' : 'Atmospheric Model Estimate',
        cls: 'bg-sky-50 text-sky-900 border-sky-300',
      };
  }
}
