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

const RAW_NOTIFICATION_TEMPLATE_MAP: Record<string, string> = {
    '{{employee}} has submitted a {{leave_type}} leave request awaiting your approval.': 'notif_leave_request_message',
    'New Leave Request': 'notif_leave_request_title',
    'Leave Approved ✅': 'notif_leave_approved_title',
    'Your {{leave_type}} leave request has been approved.': 'notif_leave_approved_message',
    'Leave Request Rejected ❌': 'notif_leave_rejected_title',
    'Your {{leave_type}} leave request was rejected.{{reason}}': 'notif_leave_rejected_message',
    'Leave Approved 📋': 'notif_leave_approved_tm_title',
    "{{employee}}'s {{leave_type}} leave request has been approved.": 'notif_leave_approved_tm_message',
    'Leave Rejected 📋': 'notif_leave_rejected_tm_title',
    "{{employee}}'s {{leave_type}} leave request was rejected.": 'notif_leave_rejected_tm_message',
    'Day Off Change Request': 'notif_day_off_request_title',
    '{{employee}} has requested a day off change.': 'notif_day_off_request_message',
    'Day Off Approved ✅': 'notif_day_off_approved_title',
    'Your day off change request has been approved. New day(s) off: {{days}}.': 'notif_day_off_approved_message',
    'Day Off Request Rejected ❌': 'notif_day_off_rejected_title',
    'Your day off change request was rejected.{{reason}}': 'notif_day_off_rejected_message',
    'Day Off Updated 📅': 'notif_day_off_assigned_title',
    'Your day(s) off has been updated to: {{days}}.': 'notif_day_off_assigned_message',
    'Day Off Approved 📋': 'notif_day_off_approved_tm_title',
    "{{employee}}'s day off change request has been approved.": 'notif_day_off_approved_tm_message',
    'Day Off Rejected 📋': 'notif_day_off_rejected_tm_title',
    "{{employee}}'s day off change request was rejected.": 'notif_day_off_rejected_tm_message',
};

interface LanguageContextType {
    locale: Locale;
    setLocale: (newLocale: Locale) => Promise<void>;
    t: (key: string, fallback?: string, params?: any) => string;
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

    const t = (key: string, fallback?: string, params?: any): string => {
        if (!key) return fallback || '';

        // If key is a known raw template string, map it to the localization key
        const lookupKey = RAW_NOTIFICATION_TEMPLATE_MAP[key] || key;

        const dict = translations[locale] || translations.en;
        let text = dict[lookupKey] || translations.en[lookupKey] || fallback || key;

        // Parse & flatten params
        let parsedParams = params;
        if (typeof params === 'string') {
            try {
                parsedParams = JSON.parse(params);
            } catch {
                parsedParams = {};
            }
        }

        const flattened: Record<string, any> = {
            ...(typeof parsedParams === 'object' && parsedParams !== null ? parsedParams : {}),
            ...(parsedParams?.placeholders && typeof parsedParams.placeholders === 'object' ? parsedParams.placeholders : {}),
            ...(parsedParams?.data && typeof parsedParams.data === 'object' ? parsedParams.data : {}),
            ...(parsedParams?.params && typeof parsedParams.params === 'object' ? parsedParams.params : {}),
        };

        // Interpolate all provided variables
        Object.entries(flattened).forEach(([paramKey, paramValue]) => {
            if (paramValue !== undefined && paramValue !== null && typeof paramValue !== 'object') {
                text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
            }
        });

        // Graceful fallbacks for standard HR notification variables if omitted in params
        if (text.includes('{{employee}}')) {
            text = text.replace(/{{employee}}/g, locale === 'kh' ? 'សហសេវិក' : 'Colleague');
        }
        if (text.includes('{{leave_type}}')) {
            text = text.replace(/{{leave_type}}/g, locale === 'kh' ? 'ច្បាប់ឈប់សម្រាក' : 'Leave');
        }
        if (text.includes('{{days}}')) {
            text = text.replace(/{{days}}/g, '');
        }
        if (text.includes('{{reason}}')) {
            text = text.replace(/{{reason}}/g, '');
        }

        // Clean any remaining unparsed {{...}} placeholders
        text = text.replace(/{{[^}]+}}/g, '');

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
