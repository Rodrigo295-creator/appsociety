import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en } from "./en";
import { pt } from "./pt";
import type { Dict, Locale } from "./types";

const STORAGE_KEY = "pb-locale";

const dictionaries: Record<Locale, Dict> = { pt, en };

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: TranslateFn;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return "pt";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "pt" || stored === "en") return stored;
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "pt";
}

function format(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "pt" ? "en" : "pt");
  }, [locale, setLocale]);

  useEffect(() => {
    document.documentElement.lang = locale === "pt" ? "pt-BR" : "en";
  }, [locale]);

  const t = useCallback<TranslateFn>(
    (key, vars) => {
      const dict = dictionaries[locale];
      const fallback = dictionaries.pt;
      return format(dict[key] ?? fallback[key] ?? key, vars);
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export function useT() {
  return useLocale().t;
}

export function positionKey(posicao: string): string {
  const map: Record<string, string> = {
    Goleiro: "pos.goleiro",
    Zagueiro: "pos.zagueiro",
    Lateral: "pos.lateral",
    "Meio-campo": "pos.meio",
    Atacante: "pos.atacante",
  };
  return map[posicao] ?? posicao;
}

export function matchStatusKey(status: string): string {
  const map: Record<string, string> = {
    "ao vivo": "status.aoVivo",
    agendado: "status.agendado",
    encerrado: "status.encerrado",
  };
  return map[status] ?? status;
}
