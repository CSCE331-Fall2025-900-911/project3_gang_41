import { Router, Request, Response } from 'express';
import translate from 'google-translate-api-x';
import { sendSuccess, sendError } from './utils/response';

const router = Router();

interface TranslateRequestBody {
  texts: string[];
  targetLang: string;
}

function extractPlaceholders(text: string): { text: string; placeholders: Map<string, string> } {
  const placeholders = new Map<string, string>();
  let index = 0;

  const modifiedText = text.replace(/\{\{([^}]+)\}\}/g, (match) => {
    const token = `__PH${index}__`;
    placeholders.set(token, match);
    index++;
    return token;
  });

  return { text: modifiedText, placeholders };
}

function restorePlaceholders(text: string, placeholders: Map<string, string>): string {
  let result = text;
  placeholders.forEach((original, token) => {
    result = result.replace(new RegExp(token, 'g'), original);
  });
  return result;
}

router.post('/', async (req: Request<{}, {}, TranslateRequestBody>, res: Response) => {
  try {
    const { texts, targetLang } = req.body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return sendError(res, 'texts must be a non-empty array', 400);
    }

    if (!targetLang || typeof targetLang !== 'string') {
      return sendError(res, 'targetLang must be a valid language code', 400);
    }

    if (texts.length > 1000) {
      return sendError(res, 'Maximum 1000 texts per request', 400);
    }

    const translations: string[] = [];

    for (const text of texts) {
      if (!text || typeof text !== 'string') {
        translations.push(text || '');
        continue;
      }

      const { text: textWithTokens, placeholders } = extractPlaceholders(text);

      try {
        const result = await translate(textWithTokens, {
          from: 'en',
          to: targetLang,
        });

        const translatedText = restorePlaceholders(result.text, placeholders);
        translations.push(translatedText);
      } catch {
        translations.push(text);
      }
    }

    return sendSuccess(res, { translations });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Translate] Error:', errorMessage);
    return sendError(res, 'Translation failed', 500);
  }
});

export default router;
