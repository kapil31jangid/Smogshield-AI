'use client';

import React from 'react';
import { Send, Sparkles } from 'lucide-react';
import {
  AirQualityReport,
  AssistantMessage,
  FamilyProfile,
  Language,
} from '@/types/smogshield';

interface AssistantModuleProps {
  uid: string;
  report: AirQualityReport;
  profile: FamilyProfile;
  lang: Language;
  messages: AssistantMessage[];
  chatInput: string;
  isSendingChat: boolean;
  chatError: string | null;
  onChatInputChange: (val: string) => void;
  onSendQuestion: (questionText?: string) => void;
}

export default function AssistantModule({
  uid,
  report,
  profile,
  lang,
  messages,
  chatInput,
  isSendingChat,
  chatError,
  onChatInputChange,
  onSendQuestion,
}: AssistantModuleProps) {
  const hi = lang === 'hi';

  const quickPrompts = [
    hi
      ? 'क्या आज बाहर व्यायाम या दौड़ना उचित है?'
      : 'Is it sensible to exercise outdoors today?',
    hi
      ? 'आज बच्चों के स्कूल जाने की योजना कैसे बनाएं?'
      : "How should I plan my child's school commute today?",
    hi
      ? 'अगर मैं एयर प्यूरीफायर नहीं खरीद सकता तो क्या करूं?'
      : 'What can I do if I cannot afford an air purifier?',
    hi
      ? 'हमारा मोहल्ला और सोसाइटी प्रदूषण कैसे कम कर सकते हैं?'
      : 'How can our neighbourhood reduce winter pollution?',
    hi
      ? 'अस्थमा और खांसी के लक्षणों में क्या सावधानी बरतें?'
      : 'What precautions should we take for asthma or coughing symptoms?',
  ];

  return (
    <section
      id="tabpanel-assistant"
      role="tabpanel"
      aria-labelledby="tab-assistant"
      className="space-y-4"
    >
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="assistant-heading"
              className="text-lg font-bold text-slate-900 flex items-center gap-2"
            >
              <Sparkles className="h-5 w-5 text-teal-800" aria-hidden="true" />
              <span>
                {hi
                  ? 'जेन-एआई परिवार सहायक (हिंदी और अंग्रेजी)'
                  : 'GenAI Family Protection Assistant (Bilingual EN / HI)'}
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {hi
                ? `${report.city} (NAQI ${report.naqi}, PM2.5 ${report.pollutants.pm25 ?? 'N/A'} µg/m³) और आपके परिवार प्रोफ़ाइल से जुड़ा संदर्भ-जागरूक सहायक।`
                : `Context-grounded in ${report.city} (${report.stationName}, NAQI ${report.naqi}) and ${profile.name}. Enforces deterministic safety guardrails.`}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {quickPrompts.map((promptText) => (
            <button
              key={promptText}
              type="button"
              onClick={() => onSendQuestion(promptText)}
              disabled={isSendingChat}
              className="rounded-full border border-teal-300 bg-teal-50/70 px-3 py-1.5 text-xs font-semibold text-teal-950 hover:bg-teal-100 disabled:opacity-50"
            >
              {promptText}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div
          aria-live="polite"
          data-testid="assistant-messages"
          className="space-y-4 max-h-[520px] overflow-y-auto pr-1"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl p-4 text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'ml-auto max-w-2xl bg-teal-900 text-white'
                  : 'mr-auto max-w-4xl border border-slate-200 bg-slate-50 text-slate-900'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 text-[11px] opacity-85">
                <span className="font-bold uppercase">
                  {msg.role === 'user'
                    ? hi
                      ? 'आपका प्रश्न'
                      : 'Your Household Question'
                    : 'SmogShield AI'}
                </span>
                {msg.role === 'assistant' && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-white px-2 py-0.5 font-semibold text-slate-800 border border-slate-300">
                      {msg.providerMode === 'gemini_live'
                        ? 'Gemini Live + Safety Guardrails'
                        : 'Deterministic Rule-Grounded Engine'}
                    </span>
                    {msg.sourceAttribution && (
                      <span className="rounded bg-teal-100 px-2 py-0.5 font-semibold text-teal-950">
                        {msg.sourceAttribution}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="whitespace-pre-line">{msg.content}</div>
            </div>
          ))}
        </div>

        {chatError && (
          <div
            role="alert"
            className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-950"
          >
            {chatError}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSendQuestion();
          }}
          className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200"
        >
          <label htmlFor={`${uid}-chat-input`} className="sr-only">
            {hi ? 'अपना प्रश्न लिखें' : 'Ask SmogShield AI a question'}
          </label>
          <input
            id={`${uid}-chat-input`}
            data-testid="assistant-input"
            type="text"
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            placeholder={
              hi
                ? 'हिंदी या अंग्रेजी में पूछें (जैसे: क्या आज बच्चों को पार्क भेजना सुरक्षित है?)...'
                : 'Ask in English or Hindi (e.g., Is it safe to open windows right now?)...'
            }
            maxLength={600}
            disabled={isSendingChat}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-teal-700"
          />
          <button
            type="submit"
            data-testid="assistant-send-btn"
            disabled={isSendingChat || !chatInput.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span>
              {isSendingChat
                ? hi
                  ? 'विश्लेषण जारी...'
                  : 'Analyzing...'
                : hi
                  ? 'पूछें'
                  : 'Ask Assistant'}
            </span>
          </button>
        </form>
      </div>
    </section>
  );
}
