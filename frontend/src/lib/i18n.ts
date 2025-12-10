import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '@/locales/en.json';
import { translateObject, getCachedTranslations } from './translateService';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    detection: {
      order: ['sessionStorage', 'navigator'],
      caches: ['sessionStorage'],
      lookupSessionStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false,
    },
  });

const originalChangeLanguage = i18n.changeLanguage.bind(i18n);

i18n.changeLanguage = async (lng?: string) => {
  if (!lng || lng === 'en') {
    return originalChangeLanguage(lng);
  }

  const cached = getCachedTranslations(lng);
  if (cached) {
    i18n.addResourceBundle(lng, 'translation', cached, true, true);
    return originalChangeLanguage(lng);
  }

  try {
    const translated = await translateObject(en, lng);
    i18n.addResourceBundle(lng, 'translation', translated, true, true);
    return originalChangeLanguage(lng);
  } catch (error) {
    console.error(`[i18n] Failed to load ${lng}:`, error);
    return originalChangeLanguage('en');
  }
};

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

document.documentElement.lang = i18n.language;

export default i18n;
