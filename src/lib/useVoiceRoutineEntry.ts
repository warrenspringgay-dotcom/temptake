// src/lib/useVoiceRoutineEntry.ts
"use client";

import { useEffect, useRef, useState } from "react";

type ParseResult = {
  raw: string;
  command?: "next" | "previous" | "stop";
  temp_c?: string;
  itemPhrase?: string; // <- what the user said as the "food prompt"
};

type Options = {
  lang?: string;
  onResult: (r: ParseResult) => void;
  onError?: (msg: string) => void;
};

function pickTemp(raw: string): string | null {
  const m = raw.match(/(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  return m[1];
}

function normalize(raw: string) {
  return raw.trim().toLowerCase();
}

function cleanItemPhrase(text: string) {
  // remove temps + common filler words
  return text
    .replace(/(-?\d+(?:\.\d+)?)/g, " ")
    .replace(/\b(degrees?|degree|celsius|centigrade|temp|temperature|is|at|was)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function useVoiceRoutineEntry(opts: Options) {
  const { lang = "en-GB", onResult, onError } = opts;

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);

  const recogRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = () => {
    if (typeof window === "undefined") return;
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      onError?.("Speech recognition not supported in this browser.");
      return;
    }

    const recog = new SR();
    recogRef.current = recog;

    recog.lang = lang;
    recog.interimResults = false;
    recog.continuous = true;

    recog.onstart = () => setListening(true);

    recog.onerror = (e: any) => {
      setListening(false);
      onError?.(e?.error ? `Voice error: ${e.error}` : "Voice error.");
    };

    recog.onend = () => {
      setListening(false);
    };

    recog.onresult = (event: any) => {
      try {
        const last = event.results?.[event.results.length - 1];
        const transcript = last?.[0]?.transcript ?? "";
        const raw = transcript.toString();
        const text = normalize(raw);

        if (/\b(stop|cancel|quit)\b/.test(text)) {
          onResult({ raw, command: "stop" });
          return;
        }

        // temp (digits-based)
        const temp = pickTemp(text) ?? undefined;

        // everything else becomes the item phrase
        const itemPhrase = cleanItemPhrase(text) || undefined;

        onResult({
          raw,
          temp_c: temp,
          itemPhrase,
        });
      } catch (err: any) {
        onError?.(err?.message ?? "Failed to parse voice input.");
      }
    };

    try {
      recog.start();
    } catch (e: any) {
      onError?.(e?.message ?? "Could not start voice recognition.");
    }
  };

  const stop = () => {
    try {
      recogRef.current?.stop?.();
    } catch {}
    setListening(false);
  };

  return { supported, listening, start, stop };
}
