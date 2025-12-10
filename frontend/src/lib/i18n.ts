import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import GoogleTranslateBackend from './i18nBackend';

i18n
  .use(GoogleTranslateBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
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

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

document.documentElement.lang = i18n.language;

export default i18n;
