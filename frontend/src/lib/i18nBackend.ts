import type { BackendModule, ResourceLanguage, ReadCallback } from 'i18next';
import en from '@/locales/en.json';
import { translateObject, getCachedTranslations } from './translateService';

const GoogleTranslateBackend: BackendModule = {
  type: 'backend',

  init() {},

  read(language: string, _namespace: string, callback: ReadCallback) {
    if (language === 'en') {
      callback(null, en as ResourceLanguage);
      return;
    }

    const cached = getCachedTranslations(language);
    if (cached) {
      callback(null, cached as ResourceLanguage);
      return;
    }

    translateObject(en, language)
      .then((translated) => {
        callback(null, translated as ResourceLanguage);
      })
      .catch((error) => {
        console.error(`[i18n] Translation failed for ${language}:`, error);
        callback(null, en as ResourceLanguage);
      });
  },
};

export default GoogleTranslateBackend;
