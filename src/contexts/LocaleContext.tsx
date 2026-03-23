'use client';

import { createContext, useContext } from 'react';
import { Translations, getTranslations, Locale } from '@/lib/i18n';

const LocaleContext = createContext<Translations>(getTranslations('es'));

export const LocaleProvider = ({
  locale,
  children,
}: {
  locale: Locale | null | undefined;
  children: React.ReactNode;
}) => (
  <LocaleContext.Provider value={getTranslations(locale)}>
    {children}
  </LocaleContext.Provider>
);

export const useT = () => useContext(LocaleContext);
