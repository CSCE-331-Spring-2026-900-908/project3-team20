'use client';

import { useState } from 'react';
import { useTranslation } from '../context/TranslationContext';

export function TranslateButton() {
  const {
    isTranslated,
    currentLang,
    isLoading,
    error,
    translatePage,
    restoreEnglish,
    supportedLanguages,
  } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageSelect = async (langCode: string) => {
    setIsOpen(false);
    try {
      await translatePage(langCode);
    } catch {
      // Error is handled in context
    }
  };

  const getCurrentLanguageName = () => {
    if (!currentLang) return null;
    return supportedLanguages.find((l) => l.code === currentLang)?.name || currentLang;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-600">Translating...</span>
      </div>
    );
  }

  if (isTranslated) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-green-600">
          {getCurrentLanguageName()}
        </span>
        <button
          onClick={restoreEnglish}
          className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
        >
          Restore English
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </svg>
        Translate
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
            <div className="py-1 max-h-64 overflow-y-auto">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="absolute right-0 mt-2 w-64 bg-red-50 border border-red-200 rounded-lg p-3 z-30">
          <p className="text-sm text-red-600">{error.message}</p>
          <button
            onClick={() => setIsOpen(false)}
            className="mt-2 text-xs text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
