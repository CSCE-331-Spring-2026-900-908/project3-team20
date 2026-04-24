'use client';

import type { ButtonHTMLAttributes } from 'react';

interface SpeakButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  compact?: boolean;
  label?: string;
}

export function SpeakButton({
  compact = false,
  label = 'Listen',
  className = '',
  ...props
}: SpeakButtonProps) {
  const classes = [
    'inline-flex items-center border border-amber-200 bg-white text-amber-950 shadow-sm transition',
    'hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50',
    compact
      ? 'h-8 w-8 justify-center rounded-full'
      : 'gap-2 rounded-lg px-3 py-2 text-sm font-medium',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type="button" className={classes} {...props}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={compact ? 16 : 18}
        height={compact ? 16 : 18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M19 5a9 9 0 0 1 0 14" />
      </svg>
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </button>
  );
}
