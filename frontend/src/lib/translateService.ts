import { fetchApi } from './api';

const CACHE_KEY_PREFIX = 'translations_';

interface TranslateResponse {
  translations: string[];
}

function getCacheKey(lang: string): string {
  return `${CACHE_KEY_PREFIX}${lang}`;
}

export function getCachedTranslations(lang: string): Record<string, unknown> | null {
  const cached = sessionStorage.getItem(getCacheKey(lang));
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export function setCachedTranslations(lang: string, translations: Record<string, unknown>): void {
  sessionStorage.setItem(getCacheKey(lang), JSON.stringify(translations));
}

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else if (typeof value === 'string') {
      result[newKey] = value;
    }
  }

  return result;
}

function unflattenObject(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(flat)) {
    const parts = key.split('.');
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = flat[key];
  }

  return result;
}

export async function translateObject(
  sourceObj: Record<string, unknown>,
  targetLang: string
): Promise<Record<string, unknown>> {
  const cached = getCachedTranslations(targetLang);
  if (cached) return cached;

  const flattened = flattenObject(sourceObj);
  const keys = Object.keys(flattened);
  const texts = Object.values(flattened);

  const response = await fetchApi<TranslateResponse>('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ texts, targetLang }),
  });

  const translatedFlat: Record<string, string> = {};
  keys.forEach((key, index) => {
    translatedFlat[key] = response.translations[index] || flattened[key];
  });

  const result = unflattenObject(translatedFlat);
  setCachedTranslations(targetLang, result);

  return result;
}
