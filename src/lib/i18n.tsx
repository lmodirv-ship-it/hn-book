import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { translations } from "./translations";

export type Locale = "en" | "ar" | "fr";

export const locales: { code: Locale; label: string; flag: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "ar", label: "العربية", flag: "🇸🇦", dir: "rtl" },
  { code: "fr", label: "Français", flag: "🇫🇷", dir: "ltr" },
];

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem("locale") as Locale;
    return saved && translations[saved] ? saved : "en";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
    document.documentElement.dir = locales.find((loc) => loc.code === l)?.dir || "ltr";
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string) => translations[locale]?.[key] || translations.en[key] || key,
    [locale]
  );

  const dir = locales.find((loc) => loc.code === locale)?.dir || "ltr";

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
