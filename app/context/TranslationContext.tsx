'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';

interface TranslationError {
  message: string;
}

interface TranslationContextType {
  isTranslated: boolean;
  currentLang: string | null;
  isLoading: boolean;
  error: TranslationError | null;
  translatePage: (targetLang: string) => Promise<void>;
  restoreEnglish: () => void;
  supportedLanguages: { code: string; name: string }[];
}

const TranslationContext = createContext<TranslationContextType | null>(null);

const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
];

const EXCLUDED_TAGS = new Set([
  'SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT',
  'OPTION', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
]);

function shouldExcludeNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  if (EXCLUDED_TAGS.has(parent.tagName)) return true;
  if (!node.textContent?.trim()) return true;
  if (parent.isContentEditable) return true;
  // Exclude form inputs but allow buttons (tabs, toggle buttons) to be translated
  if (parent.tagName === 'INPUT' || parent.tagName === 'TEXTAREA') return true;
  return false;
}

function collectTexts(root: Element): { node: Text; original: string }[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node: Text) =>
      shouldExcludeNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });

  const results: { node: Text; original: string }[] = [];
  let current: Text | null;
  while ((current = walker.nextNode() as Text | null)) {
    results.push({ node: current, original: current.textContent || '' });
  }
  return results;
}

interface TranslateResponse {
  translations?: string[];
  error?: string;
}

const STORAGE_KEY = 'preferred_language';
const BATCH_SIZE = 100;

async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, targetLang }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(response.status === 429
      ? 'Rate limit exceeded. Please wait a moment and try again.'
      : (errorData.error || `Translation failed with status ${response.status}`)
    );
  }

  const data: TranslateResponse = await response.json();
  if (data.error) throw new Error(data.error);
  if (!data.translations) throw new Error('Invalid response from translation service');

  return data.translations;
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [isTranslated, setIsTranslated] = useState(false);
  const [currentLang, setCurrentLang] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<TranslationError | null>(null);

  // Store original texts for restoration
  const originalsRef = useRef<{ node: Text; original: string }[]>([]);
  // Track if translation is in progress
  const isTranslatingRef = useRef(false);

  const translateTexts = useCallback(async (textNodes: { node: Text; original: string }[], targetLang: string) => {
    if (textNodes.length === 0) return;

    const textsToTranslate = textNodes.map((tn) => tn.original);

    // Batch texts
    const batches: string[][] = [];
    for (let i = 0; i < textsToTranslate.length; i += BATCH_SIZE) {
      batches.push(textsToTranslate.slice(i, i + BATCH_SIZE));
    }

    const translatedTexts: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      const translated = await translateBatch(batches[i], targetLang);
      translatedTexts.push(...translated);

      // Rate limit delay between batches
      if (i < batches.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // Apply translations
    textNodes.forEach((tn, idx) => {
      tn.node.textContent = translatedTexts[idx] ?? tn.original;
    });
  }, []);

  const translatePage = useCallback(async (targetLang: string) => {
    if (isTranslatingRef.current) return;
    isTranslatingRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const textNodes = collectTexts(document.body);
      originalsRef.current = textNodes;
      await translateTexts(textNodes, targetLang);

      sessionStorage.setItem(STORAGE_KEY, targetLang);
      setIsTranslated(true);
      setCurrentLang(targetLang);
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : 'Translation failed' });
    } finally {
      setIsLoading(false);
      isTranslatingRef.current = false;
    }
  }, [translateTexts]);

  const restoreEnglish = useCallback(() => {
    originalsRef.current.forEach(({ node, original }) => {
      node.textContent = original;
    });

    sessionStorage.removeItem(STORAGE_KEY);
    setIsTranslated(false);
    setCurrentLang(null);
    setError(null);
  }, []);

  // Set up MutationObserver to handle dynamically added content
  useEffect(() => {
    if (!isTranslated || !currentLang) return;

    const observer = new MutationObserver((mutations) => {
      // Collect new nodes that need translation
      const newNodes: { node: Text; original: string }[] = [];

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          const walker = document.createTreeWalker(node as Element, NodeFilter.SHOW_TEXT, {
            acceptNode: (n: Text) =>
              shouldExcludeNode(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
          });

          let current: Text | null;
          while ((current = walker.nextNode() as Text | null)) {
            // Only add if not already in originals
            const alreadyTranslated = originalsRef.current.some(
              (entry) => entry.node === current
            );
            if (!alreadyTranslated) {
              newNodes.push({ node: current, original: current.textContent || '' });
            }
          }
        }
      }

      if (newNodes.length > 0) {
        // Add new originals
        originalsRef.current.push(...newNodes);
        // Translate new content
        translateTexts(newNodes, currentLang);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [isTranslated, currentLang, translateTexts]);

  // Auto-translate on mount if language is stored
  useEffect(() => {
    const storedLang = sessionStorage.getItem(STORAGE_KEY);
    if (storedLang && storedLang !== 'en') {
      const timer = setTimeout(() => translatePage(storedLang), 100);
      return () => clearTimeout(timer);
    }
  }, [translatePage]);

  // Clear error when language changes
  useEffect(() => {
    if (error) setError(null);
  }, [currentLang]);

  const value: TranslationContextType = {
    isTranslated,
    currentLang,
    isLoading,
    error,
    translatePage,
    restoreEnglish,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
