'use client';

import { ComponentPropsWithoutRef, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type NumericKeyboardAction = 'backspace' | 'clear' | 'hide';

interface NumericKey {
  label: string;
  value?: string;
  action?: NumericKeyboardAction;
  tone?: 'default' | 'muted' | 'primary';
}

interface FloatingNumericInputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
}

function sanitizeNumericValue(value: string) {
  const digitsAndDots = value.replace(/[^0-9.]/g, '');
  const [whole = '', ...decimalParts] = digitsAndDots.split('.');

  if (decimalParts.length === 0) {
    return whole;
  }

  return `${whole || '0'}.${decimalParts.join('').slice(0, 2)}`;
}

function getKeyboardRows(): NumericKey[][] {
  return [
    [
      { label: '1', value: '1' },
      { label: '2', value: '2' },
      { label: '3', value: '3' },
      { label: 'Back', action: 'backspace', tone: 'muted' },
    ],
    [
      { label: '4', value: '4' },
      { label: '5', value: '5' },
      { label: '6', value: '6' },
      { label: 'Clear', action: 'clear', tone: 'muted' },
    ],
    [
      { label: '7', value: '7' },
      { label: '8', value: '8' },
      { label: '9', value: '9' },
      { label: 'Hide', action: 'hide', tone: 'primary' },
    ],
    [
      { label: '0', value: '0' },
      { label: '.', value: '.' },
      { label: '00', value: '00' },
      { label: '5.00', value: '5.00' },
    ],
  ];
}

export function FloatingNumericInput({
  value,
  onValueChange,
  onFocus,
  onClick,
  onKeyDown,
  className,
  disabled,
  ...inputProps
}: FloatingNumericInputProps) {
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
    const sanitizedValue = sanitizeNumericValue(nextValue);
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

  const handleKeyPress = (key: NumericKey) => {
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
          className="fixed bottom-3 right-3 z-[90] w-[calc(100vw-1.25rem)] max-w-[18rem] rounded-[1.2rem] border border-stone-300 bg-white p-3 shadow-[0_24px_55px_rgba(15,23,42,0.24)] sm:bottom-4 sm:right-4"
        >
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                Tip Keypad
              </p>
              <p className="text-xs text-stone-600">Enter a custom tip amount.</p>
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
              <div key={`numeric-row-${rowIndex}`} className="grid grid-cols-4 gap-1.5">
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
                      className={`min-h-10 rounded-xl border px-2 py-2 text-sm font-semibold transition active:translate-y-px sm:min-h-11 ${toneClasses}`}
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
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={value}
        className={className}
        onChange={(event) => onValueChange(sanitizeNumericValue(event.target.value))}
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
