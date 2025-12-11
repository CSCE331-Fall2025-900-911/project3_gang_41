import { fetchApi } from './api';

const CACHE_KEY_PREFIX = 'translations_';

interface TranslateResponse {
  translations: string[];
}

// UPDATED: Accept an optional customKey
function getCacheKey(lang: string, customKey?: string): string {
  return `${CACHE_KEY_PREFIX}${customKey ? customKey + '_' : ''}${lang}`;
}

// UPDATED: Accept an optional customKey
export function getCachedTranslations(lang: string, customKey?: string): Record<string, unknown> | null {
  const cached = sessionStorage.getItem(getCacheKey(lang, customKey));
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

// UPDATED: Accept an optional customKey
export function setCachedTranslations(lang: string, translations: Record<string, unknown>, customKey?: string): void {
  sessionStorage.setItem(getCacheKey(lang, customKey), JSON.stringify(translations));
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

// UPDATED: Accept an optional cacheKey
export async function translateObject(
  sourceObj: Record<string, unknown>,
  targetLang: string,
  cacheKey?: string 
): Promise<Record<string, unknown>> {
  const cached = getCachedTranslations(targetLang, cacheKey);
  if (cached) return cached;

  const flattened = flattenObject(sourceObj);
  const keys = Object.keys(flattened);
  const texts = Object.values(flattened);

  // If object is empty, return immediately
  if (keys.length === 0) return {};

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
  setCachedTranslations(targetLang, result, cacheKey);

  return result;
}