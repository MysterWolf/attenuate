import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK, LIGHT, ThemeTokens } from '../constants/theme';
import { STORAGE_THEME } from '../constants/config';

export type ThemeMode = 'dark' | 'light' | 'auto';

interface ThemeContextValue {
  C:            ThemeTokens;
  mode:         ThemeMode;
  resolvedMode: 'dark' | 'light';
  setMode:      (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  C:            DARK,
  mode:         'dark',
  resolvedMode: 'dark',
  setMode:      () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_THEME).then(saved => {
      if (saved === 'dark' || saved === 'light' || saved === 'auto') {
        setModeState(saved);
      }
    }).catch(() => {});
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_THEME, m).catch(() => {});
  }, []);

  const resolvedMode = useMemo<'dark' | 'light'>(() => {
    if (mode === 'auto') {
      return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
    }
    return mode;
  }, [mode]);

  const C = useMemo<ThemeTokens>(
    () => (resolvedMode === 'dark' ? DARK : LIGHT),
    [resolvedMode],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ C, mode, resolvedMode, setMode }),
    [C, mode, resolvedMode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
