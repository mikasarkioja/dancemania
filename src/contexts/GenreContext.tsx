"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type AppGenre = "salsa" | "bachata";

const COOKIE_NAME = "dance_genre";
const STORAGE_KEY = "dance_genre";
const DEFAULT: AppGenre = "salsa";

function setGenreCookie(value: AppGenre) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${value};path=/;max-age=31536000;SameSite=Lax`;
}

function getGenreFromStorage(): AppGenre {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "salsa" || stored === "bachata") return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT;
}

interface GenreContextValue {
  genre: AppGenre;
  setGenre: (g: AppGenre) => void;
}

const GenreContext = createContext<GenreContextValue | null>(null);

export function GenreProvider({ children }: { children: React.ReactNode }) {
  const [genre, setGenreState] = useState<AppGenre>(DEFAULT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const stored = getGenreFromStorage();
    setGenreState(stored);
    setGenreCookie(stored);
  }, [mounted]);

  const setGenre = useCallback((g: AppGenre) => {
    setGenreState(g);
    setGenreCookie(g);
    try {
      localStorage.setItem(STORAGE_KEY, g);
    } catch {
      /* ignore */
    }
  }, []);

  const value: GenreContextValue = { genre, setGenre };

  return (
    <GenreContext.Provider value={value}>{children}</GenreContext.Provider>
  );
}

export function useAppGenre(): GenreContextValue {
  const ctx = useContext(GenreContext);
  if (!ctx) {
    return {
      genre: DEFAULT,
      setGenre: () => {},
    };
  }
  return ctx;
}
