'use client';

import { ComponentPropsWithoutRef, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type EmailKeyboardAction = 'backspace' | 'clear' | 'hide';

interface EmailKey {
  label: string;
  value?: string;
  action?: EmailKeyboardAction;
  wide?: boolean;
  tone?: 'default' | 'muted' | 'primary';
}

interface FloatingEmailInputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
}

const LETTER_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
] as const;

const NUMBER_ROW = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;

function sanitizeEmailValue(value: string) {
  return value.replace(/\s+/g, '');
}

function getKeyboardRows(): EmailKey[][] {
  return [
    NUMBER_ROW.map((value) => ({ label: value, value })),
    LETTER_ROWS[0].map((value) => ({ label: value, value })),
    LETTER_ROWS[1].map((value) => ({ label: value, value })),
    [
      ...LETTER_ROWS[2].map((value) => ({ label: value, value })),
      { label: '@', value: '@' },
      { label: '.', value: '.' },
      { label: 'Back', action: 'backspace', wide: true, tone: 'muted' },
    ],
    [
      { label: '_', value: '_' },
      { label: '-', value: '-' },
      { label: '.com', value: '.com', wide: true },
      { label: 'Clear', action: 'clear', wide: true, tone: 'muted' },
      { label: 'Hide', action: 'hide', wide: true, tone: 'primary' },
    ],
  ];
}

export function FloatingEmailInput({
  value,
  onValueChange,
  onFocus,
  onClick,
  onKeyDown,
  className,
  disabled,
  ...inputProps
}: FloatingEmailInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const keyboardRows = useMemo(() => getKeyboardRows(), []);

  useEffect(() => {
    if (!isKeyboardOpen) return;

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node;
      if (inputRef.current?.contains(target) || keyboardRef.current?.contains(target)) {
        return;
      }
      setIsKeyboardOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isKeyboardOpen]);

  const getSelection = () => {
    const input = inputRef.current;
    const fallback = value.length;

    return {
      start: input?.selectionStart ?? fallback,
      end: input?.selectionEnd ?? fallback,
    };
  };

  const focusAt = (position: number) => {
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(position, position);
    });
  };

  const updateValue = (nextValue: string, nextCursor: number) => {
    const sanitizedValue = sanitizeEmailValue(nextValue);
    onValueChange(sanitizedValue);
    focusAt(Math.min(nextCursor, sanitizedValue.length));
  };

  const insertText = (text: string) => {
    const { start, end } = getSelection();
    const nextValue = `${value.slice(0, start)}${text}${value.slice(end)}`;
    updateValue(nextValue, start + text.length);
  };

  const backspace = () => {
    const { start, end } = getSelection();

    if (start !== end) {
      updateValue(`${value.slice(0, start)}${value.slice(end)}`, start);
      return;
    }

    if (start === 0) return;
    updateValue(`${value.slice(0, start - 1)}${value.slice(end)}`, start - 1);
  };

  const preventBlur = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleKeyPress = (key: EmailKey) => {
    if (key.value) {
      insertText(key.value);
      return;
    }

    if (key.action === 'backspace') {
      backspace();
      return;
    }

    if (key.action === 'clear') {
      onValueChange('');
      focusAt(0);
      return;
    }

    if (key.action === 'hide') {
      setIsKeyboardOpen(false);
      inputRef.current?.blur();
    }
  };

  const keyboard = typeof document !== 'undefined' && isKeyboardOpen && !disabled
    ? createPortal(
        <div
          ref={keyboardRef}
          className="fixed bottom-3 right-3 z-[90] w-[calc(100vw-1.25rem)] max-w-[31rem] rounded-[1.35rem] border border-stone-300 bg-white p-3 shadow-[0_24px_55px_rgba(15,23,42,0.24)] sm:bottom-4 sm:right-4 sm:max-w-[30rem]"
        >
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                Receipt Email Keyboard
              </p>
              <p className="text-xs text-stone-600 sm:text-sm">Tap the keys below to enter the email address.</p>
            </div>
            <button
              type="button"
              onPointerDown={preventBlur}
              onClick={() => {
                setIsKeyboardOpen(false);
                inputRef.current?.blur();
              }}
              className="rounded-full border border-stone-300 bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-200"
            >
              Hide
            </button>
          </div>

          <div className="space-y-1.5">
            {keyboardRows.map((row, rowIndex) => (
              <div
                key={`email-row-${rowIndex}`}
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: row
                    .map((key) => `minmax(0, ${key.wide ? '1.55fr' : '1fr'})`)
                    .join(' '),
                }}
              >
                {row.map((key) => {
                  const toneClasses =
                    key.tone === 'primary'
                      ? 'bg-stone-900 text-white border-stone-900 hover:bg-stone-700'
                      : key.tone === 'muted'
                        ? 'bg-stone-200 text-stone-700 border-stone-300 hover:bg-stone-300'
                        : 'bg-stone-50 text-stone-900 border-stone-300 hover:bg-stone-100';

                  return (
                    <button
                      key={`${rowIndex}-${key.label}`}
                      type="button"
                      onPointerDown={preventBlur}
                      onClick={() => handleKeyPress(key)}
                      className={`min-h-10 rounded-xl border px-2 py-2 text-sm font-semibold transition active:translate-y-px sm:min-h-11 sm:px-2.5 sm:text-[15px] ${toneClasses}`}
                    >
                      {key.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <input
        {...inputProps}
        ref={inputRef}
        type="email"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="email"
        disabled={disabled}
        value={value}
        className={className}
        onChange={(event) => onValueChange(sanitizeEmailValue(event.target.value))}
        onFocus={(event) => {
          setIsKeyboardOpen(true);
          onFocus?.(event);
        }}
        onClick={(event) => {
          setIsKeyboardOpen(true);
          onClick?.(event);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
        }}
      />
      {keyboard}
    </>
  );
}
