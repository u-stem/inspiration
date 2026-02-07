"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

interface UseSpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

const noop = () => () => {};
const getClientSupport = () => "speechSynthesis" in window;
const getServerSupport = () => false;

export function useSpeech(options: UseSpeechOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSupported = useSyncExternalStore(noop, getClientSupport, getServerSupport);

  const speak = useCallback((text: string, overrideLang?: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = overrideLang ?? options.lang ?? "ja-JP";
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [options.lang, options.rate, options.pitch]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, isSupported };
}
