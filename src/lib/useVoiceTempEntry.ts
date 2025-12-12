// src/lib/useVoiceTempEntry.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type VoiceResult = {
  raw: string;
  temp_c?: string; // keep as string for your form
  item?: string;
  location?: string;
  staff_initials?: string;
};

type UseVoiceTempEntryOpts = {
  lang?: string; // "en-GB" for UK
  onResult?: (r: VoiceResult) => void;
  onError?: (msg: string) => void;
};

function normalizeText(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\w\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Very practical number parsing:
// - "5.2", "5 point 2", "five point two", "minus two point five"
function parseTemp(text: string): { value?: number; cleaned: string } {
  const t = normalizeText(text);

  // Convert spoken "point" to "."
  let s = t.replace(/\bpoint\b/g, ".");

  // Convert some common number words (keep it simple)
  const words: Record<string, string> = {
    zero: "0",
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
    minus: "-",
    negative: "-",
  };

  // Replace standalone number words
  s = s
    .split(" ")
    .map((w) => (words[w] != null ? words[w] : w))
    .join(" ");

  // Try to find the first plausible number in the string
  // supports "-2", "5", "5.2", "72"
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return { cleaned: s };

  const num = Number(m[0]);
  if (!Number.isFinite(num)) return { cleaned: s };

  // Remove that number from the string for "item/location" parsing
  const cleaned = (s.slice(0, m.index) + " " + s.slice((m.index ?? 0) + m[0].length))
    .replace(/\s+/g, " ")
    .trim();

  return { value: num, cleaned };
}

function extractInitials(s: string): { initials?: string; rest: string } {
  // "initials ws" or "initials w s"
  const t = normalizeText(s);

  const m = t.match(/\binitials\s+([a-z]{1,3})(?:\s+([a-z]{1,3}))?\b/);
  if (!m) return { rest: t };

  let ini = m[1] ?? "";
  if (m[2]) ini = `${ini}${m[2]}`;

  ini = ini.replace(/[^a-z]/g, "").toUpperCase().slice(0, 3);
  const rest = t.replace(m[0], "").replace(/\s+/g, " ").trim();
  return { initials: ini || undefined, rest };
}

function guessLocationAndItem(rest: string): { location?: string; item?: string } {
  // You can make this smarter later by matching known locations/items.
  // For now:
  // - if the user says "kitchen ..." assume first token(s) are location
  // - else treat whole as item
  if (!rest) return {};

  const tokens = rest.split(" ");
  if (tokens.length >= 2) {
    // naive: first token as location if it's a common place word
    const common = new Set([
      "kitchen",
      "fridge",
      "freezer",
      "chiller",
      "store",
      "storeroom",
      "prep",
      "bar",
    ]);
    if (common.has(tokens[0])) {
      return {
        location: tokens[0].replace(/^\w/, (c) => c.toUpperCase()),
        item: tokens.slice(1).join(" "),
      };
    }
  }

  return { item: rest };
}

export function useVoiceTempEntry(opts: UseVoiceTempEntryOpts = {}) {
  const lang = opts.lang ?? "en-GB";

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);

  const recRef = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = useCallback(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SR) {
      opts.onError?.("Voice entry not supported on this device/browser.");
      return;
    }

    // Recreate each time to avoid sticky states across browsers
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    recRef.current = rec;

    setListening(true);

    let finalText = "";

    rec.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText = transcript;
      }

      // If final, parse now
      if (finalText) {
        const { initials, rest } = extractInitials(finalText);
        const { value, cleaned } = parseTemp(rest);
        const { location, item } = guessLocationAndItem(cleaned);

        const out: VoiceResult = {
          raw: finalText.trim(),
          staff_initials: initials,
          temp_c: value != null ? String(value) : undefined,
          location: location,
          item: item ? item.trim() : undefined,
        };

        opts.onResult?.(out);
      }
    };

    rec.onerror = (e: any) => {
      setListening(false);
      opts.onError?.(e?.error ? String(e.error) : "Voice entry failed.");
    };

    rec.onend = () => {
      setListening(false);
    };

    try {
      rec.start();
    } catch (e: any) {
      setListening(false);
      opts.onError?.(e?.message ?? "Voice entry failed to start.");
    }
  }, [lang, opts]);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop?.();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  return useMemo(
    () => ({
      supported,
      listening,
      start,
      stop,
    }),
    [supported, listening, start, stop]
  );
}
