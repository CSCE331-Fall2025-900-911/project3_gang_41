import { useLocalStorage } from './useLocalStorage';
import { useEffect } from 'react';

export type FontSize = 'default' | 'large' | 'extra-large';

export function useFontSize() {
  const [fontSize, setFontSize] = useLocalStorage<FontSize>('app-font-size', 'default');

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  return { fontSize, setFontSize };
}
