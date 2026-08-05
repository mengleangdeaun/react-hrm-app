import React, { createContext, useContext, useEffect, useState } from 'react';
import { UnistylesRuntime } from 'react-native-unistyles';
import { storage } from '../utils/storage';

const THEME_KEY = 'hrms_app_theme_mode';
const COLOR_THEME_KEY = 'hrms_app_color_theme';
const FONT_SIZE_KEY = 'hrms_app_font_size';
const FONT_FAMILY_KEY = 'hrms_app_font_family';

export type ColorThemeId = 'default' | 'sky' | 'emerald' | 'violet' | 'rose' | 'amber';
export type FontSizeScaleId = 'small' | 'medium' | 'normal' | 'large';

export const ACCENT_COLOR_MAP: Record<ColorThemeId, { light: string; dark: string }> = {
    default: { light: '#DF0000', dark: '#FF3333' },
    sky: { light: '#0284C7', dark: '#38BDF8' },
    emerald: { light: '#059669', dark: '#34D399' },
    violet: { light: '#7C3AED', dark: '#A78BFA' },
    rose: { light: '#E11D48', dark: '#FB7185' },
    amber: { light: '#D97706', dark: '#FBBF24' },
};

export const FONT_SCALE_MAP: Record<FontSizeScaleId, number> = {
    small: 0.88,
    medium: 1.0,
    normal: 1.0,
    large: 1.18,
};

export const THEME_FONTS = [
    { id: '"Google Sans", sans-serif', label: 'Google Sans', value: '"Google Sans", sans-serif' },
    { id: 'Krasar, sans-serif', label: 'Krasar (Premium)', value: 'Krasar, sans-serif' },
    { id: '"Kantumruy Pro", sans-serif', label: 'Kantumruy Pro', value: '"Kantumruy Pro", sans-serif' },
    { id: 'system-ui, sans-serif', label: 'System UI', value: 'system-ui, sans-serif' },
] as const;

export const getCleanFontFamily = (family?: string): string | undefined => {
    if (!family || family.includes('system-ui') || family.toLowerCase().includes('system')) {
        return undefined;
    }
    const clean = family.split(',')[0].replace(/['"]/g, '').trim();
    return clean || undefined;
};

export const isFontMatching = (familyA?: string, familyB?: string): boolean => {
    if (!familyA || !familyB) return familyA === familyB;
    const cleanA = getCleanFontFamily(familyA) || 'system';
    const cleanB = getCleanFontFamily(familyB) || 'system';
    return cleanA.toLowerCase() === cleanB.toLowerCase();
};

interface ThemeContextType {
    colorScheme: 'light' | 'dark';
    isDark: boolean;
    colorTheme: ColorThemeId;
    primaryColor: string;
    fontSizeScale: number;
    fontSizeId: FontSizeScaleId;
    fontFamily: string;
    scaledSize: (baseSize: number) => number;
    toggleTheme: () => void;
    setThemeMode: (mode: 'light' | 'dark') => void;
    setAccentTheme: (themeId: ColorThemeId) => Promise<void>;
    setFontScale: (sizeId: FontSizeScaleId) => Promise<void>;
    setFontFamily: (family: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(
        (UnistylesRuntime.themeName as 'light' | 'dark') || 'dark'
    );
    const [colorTheme, setColorThemeState] = useState<ColorThemeId>('default');
    const [fontSizeId, setFontSizeState] = useState<FontSizeScaleId>('medium');
    const [fontFamily, setFontFamilyState] = useState<string>('Krasar, sans-serif');

    useEffect(() => {
        loadSavedTheme();
    }, []);

    const loadSavedTheme = async () => {
        try {
            const savedTheme = await storage.getItem(THEME_KEY);
            const activeTheme: 'light' | 'dark' = (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
            setCurrentTheme(activeTheme);
            UnistylesRuntime.setTheme(activeTheme);

            const savedColor = await storage.getItem(COLOR_THEME_KEY);
            if (savedColor && savedColor in ACCENT_COLOR_MAP) {
                setColorThemeState(savedColor as ColorThemeId);
            }

            const savedFont = await storage.getItem(FONT_SIZE_KEY);
            if (savedFont && savedFont in FONT_SCALE_MAP) {
                setFontSizeState(savedFont as FontSizeScaleId);
            }

            const savedFamily = await storage.getItem(FONT_FAMILY_KEY);
            if (savedFamily) {
                setFontFamilyState(savedFamily);
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

    const setAccentTheme = async (themeId: ColorThemeId) => {
        setColorThemeState(themeId);
        await storage.setItem(COLOR_THEME_KEY, themeId);
    };

    const setFontScale = async (sizeId: FontSizeScaleId) => {
        setFontSizeState(sizeId);
        await storage.setItem(FONT_SIZE_KEY, sizeId);
    };

    const setFontFamily = async (family: string) => {
        setFontFamilyState(family);
        await storage.setItem(FONT_FAMILY_KEY, family);
    };

    const activeAccent = ACCENT_COLOR_MAP[colorTheme] || ACCENT_COLOR_MAP.default;
    const primaryColor = currentTheme === 'dark' ? activeAccent.dark : activeAccent.light;
    const fontSizeScale = FONT_SCALE_MAP[fontSizeId] || 1.0;

    const scaledSize = (baseSize: number) => {
        return Math.round(baseSize * fontSizeScale);
    };

    return (
        <ThemeContext.Provider
            value={{
                colorScheme: currentTheme,
                isDark: currentTheme === 'dark',
                colorTheme,
                primaryColor,
                fontSizeScale,
                fontSizeId,
                fontFamily,
                scaledSize,
                toggleTheme,
                setThemeMode,
                setAccentTheme,
                setFontScale,
                setFontFamily,
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
