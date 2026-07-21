// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import ne from '../locales/ne.json';

export type Locale = 'en' | 'ne';

interface LocalizationContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const translations: Record<Locale, any> = { en, ne };
const COOKIE = 'lang';

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function lookup(locale: Locale, key: string): string | undefined {
  let value: any = translations[locale];
  for (const k of key.split('.')) value = value?.[k];
  return typeof value === 'string' ? value : undefined;
}

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    // Cookie is the single source of truth for the language preference
    // (server-readable; no dual-store sync to keep consistent).
    const saved = readCookie(COOKIE) as Locale | null;
    if (saved === 'en' || saved === 'ne') setLocaleState(saved);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    // 1-year persistence; SameSite=Lax so it rides normal navigations.
    document.cookie = `${COOKIE}=${newLocale}; path=/; max-age=31536000; samesite=lax`;
  };

  const t = (key: string, vars?: Record<string, string | number>): string => {
    const value = lookup(locale, key) ?? lookup('en', key);
    if (value === undefined) {
      if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] missing key: ${key}`);
      return key;
    }
    return interpolate(value, vars);
  };

  return (
    <LocalizationContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export const useTranslation = () => {
  const context = useContext(LocalizationContext);
  if (!context) throw new Error('useTranslation must be used within a LocalizationProvider');
  return context;
};
