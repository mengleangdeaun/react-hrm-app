import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNWColorScheme } from 'nativewind';
import { storage } from '../utils/storage';

const THEME_KEY = 'hrms_app_theme_mode';

interface ThemeContextType {
    colorScheme: 'light' | 'dark';
    isDark: boolean;
    toggleTheme: () => void;
    setThemeMode: (mode: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { colorScheme, setColorScheme } = useNWColorScheme();
    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(colorScheme === 'dark' ? 'dark' : 'dark');

    useEffect(() => {
        loadSavedTheme();
    }, []);

    const loadSavedTheme = async () => {
        const saved = await storage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark') {
            setCurrentTheme(saved);
            setColorScheme(saved);
        } else {
            setCurrentTheme('dark');
            setColorScheme('dark');
        }
    };

    const setThemeMode = async (mode: 'light' | 'dark') => {
        setCurrentTheme(mode);
        setColorScheme(mode);
        await storage.setItem(THEME_KEY, mode);
    };

    const toggleTheme = () => {
        const nextMode = currentTheme === 'dark' ? 'light' : 'dark';
        setThemeMode(nextMode);
    };

    return (
        <ThemeContext.Provider
            value={{
                colorScheme: currentTheme,
                isDark: currentTheme === 'dark',
                toggleTheme,
                setThemeMode,
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
