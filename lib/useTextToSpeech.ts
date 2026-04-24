'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeakOptions {
  lang?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
}

function canUseSpeechSynthesis() {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  );
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export function useTextToSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!canUseSpeechSynthesis()) return;

    const frame = window.requestAnimationFrame(() => {
      setSupported(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (!canUseSpeechSynthesis()) return;
    requestIdRef.current += 1;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string, options: SpeakOptions = {}) => {
    if (!canUseSpeechSynthesis()) return false;

    const message = normalizeText(text);
    if (!message) return false;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = options.lang || document.documentElement.lang || navigator.language || 'en-US';
    utterance.pitch = options.pitch ?? 1;
    utterance.rate = options.rate ?? 1;
    utterance.volume = options.volume ?? 1;
    utterance.onstart = () => {
      if (requestIdRef.current === requestId) setSpeaking(true);
    };
    utterance.onend = () => {
      if (requestIdRef.current === requestId) setSpeaking(false);
    };
    utterance.onerror = () => {
      if (requestIdRef.current === requestId) setSpeaking(false);
    };

    synth.speak(utterance);
    return true;
  }, []);

  const speakSequence = useCallback((texts: string[], options: SpeakOptions = {}) => {
    if (!canUseSpeechSynthesis()) return false;

    const messages = texts.map(normalizeText).filter(Boolean);
    if (messages.length === 0) return false;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const synth = window.speechSynthesis;
    synth.cancel();

    messages.forEach((message, index) => {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = options.lang || document.documentElement.lang || navigator.language || 'en-US';
      utterance.pitch = options.pitch ?? 1;
      utterance.rate = options.rate ?? 1;
      utterance.volume = options.volume ?? 1;
      utterance.onstart = () => {
        if (requestIdRef.current === requestId) setSpeaking(true);
      };
      utterance.onend = () => {
        if (requestIdRef.current === requestId && index === messages.length - 1) {
          setSpeaking(false);
        }
      };
      utterance.onerror = () => {
        if (requestIdRef.current === requestId) setSpeaking(false);
      };
      synth.speak(utterance);
    });

    return true;
  }, []);

  return {
    supported,
    speaking,
    speak,
    speakSequence,
    stop,
  };
}
