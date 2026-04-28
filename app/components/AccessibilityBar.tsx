'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { ButtonSizeToggle } from './ButtonSizeToggle';
import { TranslateButton } from './TranslateButton';

export function AccessibilityBar() {
  const pathname = usePathname();

  useEffect(() => {
    const key = 'color-mode';
    const root = document.documentElement;
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    const handler = () => {
      const isDark = root.classList.toggle('dark-mode');
      localStorage.setItem(key, isDark ? 'dark' : 'light');
      button.setAttribute('aria-pressed', String(isDark));
    };
    button.addEventListener('click', handler);
    return () => button.removeEventListener('click', handler);
  }, [pathname]);

  if (pathname?.startsWith('/menu-board')) return null;

  return (
    <header
      aria-label="Accessibility options"
      className="flex flex-wrap justify-end items-center gap-2 sm:gap-4 p-2 sm:p-4 bg-gray-50 border-b border-gray-200"
    >
      <button
        id="theme-toggle"
        type="button"
        aria-label="Toggle high contrast mode"
        className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
      >
        High Contrast
      </button>
      <ButtonSizeToggle />
      <TranslateButton />
    </header>
  );
}
