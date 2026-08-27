import React, { createContext, useContext, useEffect, useState } from 'react';
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

interface ThemeContextType {
    colorScheme: 'light' | 'dark';
    isDark: boolean;
    primaryColor: string;
    brandColor: string;
    fontSizeScale: number;
    fontSizeId: FontSizeScaleId;
    scaledSize: (baseSize: number) => number;
    toggleTheme: () => void;
    setThemeMode: (mode: 'light' | 'dark') => void;
    setFontScale: (sizeId: FontSizeScaleId) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(
        (UnistylesRuntime.themeName as 'light' | 'dark') || 'dark'
    );
    const [fontSizeId, setFontSizeState] = useState<FontSizeScaleId>('medium');

    useEffect(() => {
        loadSavedTheme();
    }, []);

    const loadSavedTheme = async () => {
        try {
            const savedTheme = await storage.getItem(THEME_KEY);
            const activeTheme: 'light' | 'dark' =
                savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
            setCurrentTheme(activeTheme);
            UnistylesRuntime.setTheme(activeTheme);

            const savedFont = await storage.getItem(FONT_SIZE_KEY);
            if (savedFont && savedFont in FONT_SCALE_MAP) {
                setFontSizeState(savedFont as FontSizeScaleId);
            }
        } catch (e) {
            console.warn('Failed to load saved theme preferences:', e);
        }
    };

    const setThemeMode = async (mode: 'light' | 'dark') => {
        setCurrentTheme(mode);
        UnistylesRuntime.setTheme(mode);
        await storage.setItem(THEME_KEY, mode);
    };

    const toggleTheme = () => {
        const nextMode = currentTheme === 'dark' ? 'light' : 'dark';
        setThemeMode(nextMode);
    };

    const setFontScale = async (sizeId: FontSizeScaleId) => {
        setFontSizeState(sizeId);
        await storage.setItem(FONT_SIZE_KEY, sizeId);
    };

    const theme = currentTheme === 'dark' ? darkTheme : lightTheme;
    const brandColor = theme.colors.brand;
    const primaryColor = theme.colors.primary;
    const fontSizeScale = FONT_SCALE_MAP[fontSizeId] || 1.0;

    const scaledSize = (baseSize: number) => {
        return Math.round(baseSize * fontSizeScale);
    };

    return (
        <ThemeContext.Provider
            value={{
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
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useAppTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useAppTheme must be used within a ThemeProvider');
    }
    return context;
};
