import { Router, Request, Response } from 'express';
import { v2 } from '@google-cloud/translate';
import { sendSuccess, sendError } from './utils/response';

const router = Router();

const translateClient = new v2.Translate({
  key: process.env.GOOGLE_TRANSLATE_API_KEY,
});

interface TranslateRequestBody {
  texts: string[];
  targetLang: string;
}

const BATCH_SIZE = 100;

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

    if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
      return sendError(res, 'Translation API not configured', 503);
    }

    const allPlaceholders: Map<string, string>[] = [];
    const tokenizedTexts = texts.map(text => {
      if (!text || typeof text !== 'string') {
        allPlaceholders.push(new Map());
        return '';
      }
      const { text: tokenized, placeholders } = extractPlaceholders(text);
      allPlaceholders.push(placeholders);
      return tokenized;
    });

    const allResults: string[] = [];

    for (let i = 0; i < tokenizedTexts.length; i += BATCH_SIZE) {
      const batch = tokenizedTexts.slice(i, i + BATCH_SIZE);
      const [results] = await translateClient.translate(batch, targetLang);
      const resultsArray = Array.isArray(results) ? results : [results];
      allResults.push(...resultsArray);
    }

    const translations = allResults.map((translatedText, i) => {
      return restorePlaceholders(translatedText || texts[i] || '', allPlaceholders[i] || new Map());
    });

    return sendSuccess(res, { translations });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Translate] Error:', errorMessage);
    return sendError(res, 'Translation failed', 500);
  }
});

export default router;
