import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../utils/storage';
import { profileApi } from '../api/profile';
import enTranslations from '../i18n/locales/en.json';
import khTranslations from '../i18n/locales/kh.json';

const LOCALE_KEY = 'hrms_app_user_locale';

type Locale = 'en' | 'kh';

const translations: Record<Locale, Record<string, string>> = {
    en: enTranslations as Record<string, string>,
    kh: khTranslations as Record<string, string>,
};

interface LanguageContextType {
    locale: Locale;
    setLocale: (newLocale: Locale) => Promise<void>;
    t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locale, setLocaleState] = useState<Locale>('en');

    useEffect(() => {
        loadSavedLocale();
    }, []);

    const loadSavedLocale = async () => {
        try {
            const saved = await storage.getItem(LOCALE_KEY);
            if (saved === 'en' || saved === 'kh') {
                setLocaleState(saved);
            }
        } catch (e) {
            console.warn('Failed to load saved locale:', e);
        }
    };

    const setLocale = async (newLocale: Locale) => {
        setLocaleState(newLocale);
        try {
            await storage.setItem(LOCALE_KEY, newLocale);
            await profileApi.updatePreferences({ locale: newLocale, language: newLocale });
        } catch (e) {
            console.warn('Failed to persist locale preference:', e);
        }
    };

    const t = (key: string, fallback?: string, params?: Record<string, string | number>): string => {
        const dict = translations[locale] || translations.en;
        let text = dict[key] || translations.en[key] || fallback || key;

        if (params) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
                text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
            });
        }
        return text;
    };

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
};
