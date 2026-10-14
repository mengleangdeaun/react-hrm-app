import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { UnistylesRuntime } from 'react-native-unistyles';
import { storage } from '../utils/storage';
import { lightTheme, darkTheme } from '../styles/theme';

const THEME_KEY = 'hrms_app_theme_mode';
const FONT_SIZE_KEY = 'hrms_app_font_size';

export type FontSizeScaleId = 'small' | 'medium' | 'large';

export const FONT_SCALE_MAP: Record<FontSizeScaleId, number> = {
    small: 0.9,
    medium: 1.0,
    large: 1.15,
};

export interface FontSizeContextType {
    fontSizeScale: number;
    fontSizeId: FontSizeScaleId;
    scaledSize: (baseSize: number) => number;
    setFontScale: (sizeId: FontSizeScaleId) => Promise<void>;
}

export interface ThemeContextType extends FontSizeContextType {
    colorScheme: 'light' | 'dark';
    isDark: boolean;
    primaryColor: string;
    brandColor: string;
    toggleTheme: () => void;
    setThemeMode: (mode: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(
        (UnistylesRuntime.themeName as 'light' | 'dark') || 'light'
    );
    const [fontSizeId, setFontSizeState] = useState<FontSizeScaleId>('medium');

    useEffect(() => {
        loadSavedTheme();
    }, []);

    const loadSavedTheme = async () => {
        try {
            const savedTheme = await storage.getItem(THEME_KEY);
            const activeTheme: 'light' | 'dark' =
                savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'light';
            UnistylesRuntime.setTheme(activeTheme);
            setCurrentTheme(activeTheme);

            const savedFont = await storage.getItem(FONT_SIZE_KEY);
            if (savedFont && savedFont in FONT_SCALE_MAP) {
                setFontSizeState(savedFont as FontSizeScaleId);
            }
        } catch (e) {
            console.warn('Failed to load saved theme preferences:', e);
        }
    };

    const setThemeMode = useCallback(async (mode: 'light' | 'dark') => {
        UnistylesRuntime.setTheme(mode);
        setCurrentTheme(mode);
        try {
            await storage.setItem(THEME_KEY, mode);
        } catch (e) {
            console.warn('Failed to persist theme preference:', e);
        }
    }, []);

    const toggleTheme = useCallback(() => {
        const nextMode = (UnistylesRuntime.themeName === 'dark' || currentTheme === 'dark') ? 'light' : 'dark';
        setThemeMode(nextMode);
    }, [currentTheme, setThemeMode]);

    const setFontScale = useCallback(async (sizeId: FontSizeScaleId) => {
        setFontSizeState(sizeId);
        try {
            await storage.setItem(FONT_SIZE_KEY, sizeId);
        } catch (e) {
            console.warn('Failed to persist font size preference:', e);
        }
    }, []);

    const fontSizeScale = FONT_SCALE_MAP[fontSizeId] || 1.0;

    const scaledSize = useCallback((baseSize: number) => {
        return Math.round(baseSize * fontSizeScale);
    }, [fontSizeScale]);

    const fontSizeContextValue = useMemo<FontSizeContextType>(() => ({
        fontSizeScale,
        fontSizeId,
        scaledSize,
        setFontScale,
    }), [fontSizeScale, fontSizeId, scaledSize, setFontScale]);

    const theme = currentTheme === 'dark' ? darkTheme : lightTheme;
    const brandColor = theme.colors.brand;
    const primaryColor = theme.colors.primary;

    const themeContextValue = useMemo<ThemeContextType>(() => ({
        colorScheme: currentTheme,
        isDark: currentTheme === 'dark',
        primaryColor,
        brandColor,
        fontSizeScale,
        fontSizeId,
        scaledSize,
        toggleTheme,
        setThemeMode,
        setFontScale,
    }), [
        currentTheme,
        primaryColor,
        brandColor,
        fontSizeScale,
        fontSizeId,
        scaledSize,
        toggleTheme,
        setThemeMode,
        setFontScale,
    ]);

    return (
        <FontSizeContext.Provider value={fontSizeContextValue}>
            <ThemeContext.Provider value={themeContextValue}>
                {children}
            </ThemeContext.Provider>
        </FontSizeContext.Provider>
    );
};

export const useFontSize = (): FontSizeContextType => {
    const context = useContext(FontSizeContext);
    if (!context) {
        return {
            fontSizeScale: 1.0,
            fontSizeId: 'medium',
            scaledSize: (baseSize: number) => baseSize,
            setFontScale: async () => {},
        };
    }
    return context;
};

export const useAppTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useAppTheme must be used within a ThemeProvider');
    }
    return context;
};

