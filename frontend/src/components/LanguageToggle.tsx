import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  fullWidth?: boolean;
}

export function LanguageToggle({ fullWidth = false }: LanguageToggleProps) {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div
      className={cn(
        "flex items-center bg-muted/50 border rounded-full p-1",
        fullWidth && "w-full"
      )}
      role="group"
      aria-label={t("aria.languageToggle")}
    >
      <Globe className="h-4 w-4 mx-2 text-muted-foreground flex-shrink-0" aria-hidden="true" />
      <button
        onClick={() => changeLanguage("en")}
        aria-label={t("aria.selectLanguage", { language: t("language.english") })}
        aria-pressed={currentLang === "en" || currentLang.startsWith("en-")}
        className={cn(
          "py-1.5 rounded-full text-sm font-medium transition-all duration-200",
          fullWidth ? "flex-1" : "px-3",
          currentLang === "en" || currentLang.startsWith("en-")
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        {fullWidth ? t("language.english") : "EN"}
      </button>
      <button
        onClick={() => changeLanguage("es")}
        aria-label={t("aria.selectLanguage", { language: t("language.spanish") })}
        aria-pressed={currentLang === "es" || currentLang.startsWith("es-")}
        className={cn(
          "py-1.5 rounded-full text-sm font-medium transition-all duration-200",
          fullWidth ? "flex-1" : "px-3",
          currentLang === "es" || currentLang.startsWith("es-")
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        {fullWidth ? t("language.spanish") : "ES"}
      </button>
      <button
        onClick={() => changeLanguage("ko")}
        aria-label={t("aria.selectLanguage", { language: t("language.korean") })}
        aria-pressed={currentLang === "ko" || currentLang.startsWith("ko-")}
        className={cn(
          "py-1.5 rounded-full text-sm font-medium transition-all duration-200",
          fullWidth ? "flex-1" : "px-3",
          currentLang === "ko" || currentLang.startsWith("ko-")
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        {fullWidth ? t("language.korean") : "KO"}
      </button>
    </div>
  );
}
