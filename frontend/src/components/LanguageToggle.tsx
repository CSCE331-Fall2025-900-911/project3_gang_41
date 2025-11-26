import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div
      className="flex items-center bg-muted/50 border rounded-full p-1"
      role="group"
      aria-label={t("aria.languageToggle")}
    >
      <Globe className="h-4 w-4 mx-2 text-muted-foreground" aria-hidden="true" />
      <button
        onClick={() => changeLanguage("en")}
        aria-label={t("aria.selectLanguage", { language: t("language.english") })}
        aria-pressed={currentLang === "en" || currentLang.startsWith("en-")}
        className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
          currentLang === "en" || currentLang.startsWith("en-")
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage("es")}
        aria-label={t("aria.selectLanguage", { language: t("language.spanish") })}
        aria-pressed={currentLang === "es" || currentLang.startsWith("es-")}
        className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
          currentLang === "es" || currentLang.startsWith("es-")
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        ES
      </button>
    </div>
  );
}
