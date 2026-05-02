import { en } from './locales/en'
import { pt } from './locales/pt'
import { useUiStore } from '@/store/uiStore'

export type Locale = 'en' | 'pt'

export type Translations = typeof en

// Cast needed: each locale has its own literal string types, but the shape is identical
const locales: Record<Locale, Translations> = { en, pt: pt as unknown as Translations }

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
}

export function useT(): Translations {
  const locale = useUiStore((s) => s.locale)
  return locales[locale]
}
