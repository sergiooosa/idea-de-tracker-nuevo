import { es } from './es';
import { en } from './en';

export type { Translations } from './es';
export { es, en };

export type Locale = 'es' | 'en';

export function getTranslations(locale: Locale | null | undefined) {
  return locale === 'en' ? en : es;
}
