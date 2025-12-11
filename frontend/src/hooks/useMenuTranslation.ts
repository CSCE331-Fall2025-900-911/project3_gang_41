import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateObject } from '@/lib/translateService';
import type { MenuItem } from '@project3/shared';

export function useMenuTranslation(originalMenu: MenuItem[]) {
  const { i18n } = useTranslation();
  const [translatedMenu, setTranslatedMenu] = useState<MenuItem[]>(originalMenu);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const translateMenu = async () => {
      // If language is English or menu is empty, just use original
      if (i18n.language === 'en' || originalMenu.length === 0) {
        setTranslatedMenu(originalMenu);
        return;
      }

      setIsTranslating(true);

      try {
        // 1. Prepare an object with only the fields we want to translate
        // Key format: "id_{itemId}_name" or "id_{itemId}_desc"
        const translatableObj: Record<string, string> = {};

        originalMenu.forEach((item) => {
          translatableObj[`id_${item.item_id}_name`] = item.item_name;
          if (item.description) {
            translatableObj[`id_${item.item_id}_desc`] = item.description;
          }
        });

        // 2. Call the service with a specific cache namespace 'menu_items'
        const result = await translateObject(
          translatableObj, 
          i18n.language, 
          'menu_items'
        );

        // 3. Map the translations back to the menu array
        const newMenu = originalMenu.map((item) => {
          const translatedName = result[`id_${item.item_id}_name`] as string;
          const translatedDesc = result[`id_${item.item_id}_desc`] as string;

          return {
            ...item,
            item_name: translatedName || item.item_name,
            description: translatedDesc || item.description,
          };
        });

        setTranslatedMenu(newMenu);
      } catch (error) {
        console.error("Menu translation failed:", error);
        // Fallback to original on error
        setTranslatedMenu(originalMenu);
      } finally {
        setIsTranslating(false);
      }
    };

    translateMenu();
  }, [originalMenu, i18n.language]);

  return { translatedMenu, isTranslating };
}