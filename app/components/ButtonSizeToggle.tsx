'use client';

import { useButtonSize, ButtonSize } from '../context/ButtonSizeContext';

const SIZE_LABELS: Record<ButtonSize, string> = {
  normal: 'A',
  large: 'A+',
  xl: 'A++',
};

const SIZE_OPTIONS: ButtonSize[] = ['normal', 'large', 'xl'];

export function ButtonSizeToggle() {
  const { size, setSize } = useButtonSize();

  return (
    <div className="flex items-center gap-1" aria-label="Button size">
      <span className="text-xs text-gray-500 mr-1">Size:</span>
      {SIZE_OPTIONS.map((option) => (
        <button
          key={option}
          onClick={() => setSize(option)}
          aria-pressed={size === option}
          className={`px-2 py-1 rounded text-sm font-medium border transition-colors ${
            size === option
              ? 'bg-black text-white border-black'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
          }`}
        >
          {SIZE_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
