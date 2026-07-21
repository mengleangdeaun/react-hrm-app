import React, { createContext, useContext, useEffect, useState } from 'react';
import { UnistylesRuntime } from 'react-native-unistyles';
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
    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(
        (UnistylesRuntime.themeName as 'light' | 'dark') || 'dark'
    );

    useEffect(() => {
        loadSavedTheme();
    }, []);

    const loadSavedTheme = async () => {
        const saved = await storage.getItem(THEME_KEY);
        const activeTheme: 'light' | 'dark' = (saved === 'light' || saved === 'dark') ? saved : 'dark';
        setCurrentTheme(activeTheme);
        UnistylesRuntime.setTheme(activeTheme);
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
