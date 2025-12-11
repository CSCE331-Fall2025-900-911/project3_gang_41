import { useLocalStorage } from './useLocalStorage';
import { useTranslation } from 'react-i18next';

export function useSpeech() {
  const [enabled, setEnabled] = useLocalStorage('tts-enabled', false);
  const { i18n } = useTranslation();

  const speak = (text: string, interrupt = true) => {
    if (!enabled || !text) return;

    if (interrupt) {
      speechSynthesis.cancel(); // Stop current speech
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'es' ? 'es-ES' : 'en-US';
    utterance.rate = 1.0;

    speechSynthesis.speak(utterance);
  };

  const stop = () => speechSynthesis.cancel();

  return { enabled, setEnabled, speak, stop };
}
