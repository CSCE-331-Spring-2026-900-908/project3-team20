'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type ButtonSize = 'normal' | 'large' | 'xl';

interface ButtonSizeContextValue {
  size: ButtonSize;
  setSize: (size: ButtonSize) => void;
}

const ButtonSizeContext = createContext<ButtonSizeContextValue>({
  size: 'normal',
  setSize: () => {},
});

export function ButtonSizeProvider({ children }: { children: React.ReactNode }) {
  const [size, setSize] = useState<ButtonSize>('normal');

  // Load persisted preference on mount
  useEffect(() => {
    const stored = localStorage.getItem('buttonSize') as ButtonSize | null;
    if (stored && ['normal', 'large', 'xl'].includes(stored)) {
      setSize(stored);
    }
  }, []);

  // Apply CSS class to <html> whenever size changes
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('btn-size-large', 'btn-size-xl');
    if (size === 'large') html.classList.add('btn-size-large');
    if (size === 'xl') html.classList.add('btn-size-xl');
    localStorage.setItem('buttonSize', size);
  }, [size]);

  return (
    <ButtonSizeContext.Provider value={{ size, setSize }}>
      {children}
    </ButtonSizeContext.Provider>
  );
}

export function useButtonSize() {
  return useContext(ButtonSizeContext);
}
