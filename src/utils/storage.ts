import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_COMPLETED_KEY = 'hrms_onboarding_completed';

/**
 * Secure Store - Hardware-backed encryption for sensitive tokens only
 */
export const secureStorage = {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            try {
                return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
            } catch (e) {
                return null;
            }
        }
        try {
            return await SecureStore.getItemAsync(key);
        } catch (e) {
            return null;
        }
    },

    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            try {
                if (typeof window !== 'undefined') {
                    localStorage.setItem(key, value);
                }
            } catch (e) {}
            return;
        }
        try {
            await SecureStore.setItemAsync(key, value);
        } catch (e) {}
    },

    async removeItem(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            try {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem(key);
                }
            } catch (e) {}
            return;
        }
        try {
            await SecureStore.deleteItemAsync(key);
        } catch (e) {}
    },
};

/**
 * Fast App Storage - AsyncStorage for UI preferences, onboarding state, and cached non-secret models
 */
export const appStorage = {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            try {
                return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
            } catch (e) {
                return null;
            }
        }
        try {
            return await AsyncStorage.getItem(key);
        } catch (e) {
            return null;
        }
    },

    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            try {
                if (typeof window !== 'undefined') {
                    localStorage.setItem(key, value);
                }
            } catch (e) {}
            return;
        }
        try {
            await AsyncStorage.setItem(key, value);
        } catch (e) {}
    },

    async removeItem(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            try {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem(key);
                }
            } catch (e) {}
            return;
        }
        try {
            await AsyncStorage.removeItem(key);
        } catch (e) {}
    },
};

// Sensitive keys that must always use SecureStore (Hardware-backed encrypted storage)
const SENSITIVE_KEYS = new Set(['hrms_employee_auth_token', 'hrms_employee_user_data']);

/**
 * In-memory mirror of sensitive values.
 * Keystore/Keychain decryption costs 10-80ms per read on low-end Android, and the auth token is
 * read by the API client on every single request. After the first read the value is served from
 * memory; writes and removals keep the mirror in sync.
 */
const sensitiveCache = new Map<string, string | null>();

/**
 * Unified storage router with automatic encryption for sensitive credentials and user models
 */
export const storage = {
    async getItem(key: string): Promise<string | null> {
        if (SENSITIVE_KEYS.has(key)) {
            if (sensitiveCache.has(key)) {
                return sensitiveCache.get(key) ?? null;
            }
            const secureVal = await secureStorage.getItem(key);
            if (secureVal !== null) {
                sensitiveCache.set(key, secureVal);
                return secureVal;
            }
            // Migration fallback: check appStorage for legacy unencrypted session
            const legacyVal = await appStorage.getItem(key);
            if (legacyVal !== null) {
                // Automatically promote to secureStorage and clean up unencrypted copy
                await secureStorage.setItem(key, legacyVal);
                await appStorage.removeItem(key);
                sensitiveCache.set(key, legacyVal);
                return legacyVal;
            }
            sensitiveCache.set(key, null);
            return null;
        }
        // First check appStorage; if migrating, fallback to secureStorage
        const val = await appStorage.getItem(key);
        if (val !== null) return val;
        return secureStorage.getItem(key);
    },

    async setItem(key: string, value: string): Promise<void> {
        if (SENSITIVE_KEYS.has(key)) {
            sensitiveCache.set(key, value);
            // Guarantee unencrypted legacy copy is erased when new sensitive item is set
            await appStorage.removeItem(key);
            return secureStorage.setItem(key, value);
        }
        return appStorage.setItem(key, value);
    },

    async removeItem(key: string): Promise<void> {
        if (SENSITIVE_KEYS.has(key)) {
            sensitiveCache.set(key, null);
            await Promise.all([
                secureStorage.removeItem(key),
                appStorage.removeItem(key),
            ]);
            return;
        }
        await Promise.all([
            appStorage.removeItem(key),
            secureStorage.removeItem(key),
        ]);
    },
};

/**
 * High-level Onboarding Storage Helpers
 */
export const getOnboardingCompleted = async (): Promise<boolean> => {
    try {
        const val = await appStorage.getItem(ONBOARDING_COMPLETED_KEY);
        return val === 'true';
    } catch {
        return false;
    }
};

export const setOnboardingCompleted = async (completed: boolean = true): Promise<void> => {
    try {
        await appStorage.setItem(ONBOARDING_COMPLETED_KEY, completed ? 'true' : 'false');
    } catch (e) {
        console.warn('Failed to save onboarding completion state', e);
    }
};

export const resetOnboarding = async (): Promise<void> => {
    try {
        await appStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    } catch (e) {
        console.warn('Failed to reset onboarding state', e);
    }
};

export const DISMISSED_BANNER_ANNOUNCEMENTS_KEY = 'hrms_dismissed_banner_announcements';

export const getDismissedBannerIds = async (): Promise<string[]> => {
    try {
        const val = await appStorage.getItem(DISMISSED_BANNER_ANNOUNCEMENTS_KEY);
        if (!val) return [];
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const dismissBannerId = async (id: string | number): Promise<void> => {
    try {
        const idStr = String(id);
        const existing = await getDismissedBannerIds();
        if (!existing.includes(idStr)) {
            const updated = [...existing, idStr];
            await appStorage.setItem(DISMISSED_BANNER_ANNOUNCEMENTS_KEY, JSON.stringify(updated));
        }
    } catch (e) {
        console.warn('Failed to persist dismissed banner ID', e);
    }
};

/**
 * Legal Terms of Service & Privacy Policy Compliance Storage
 */
export const LEGAL_TERMS_ACCEPTED_KEY = 'hrms_legal_terms_accepted';
export const LEGAL_TERMS_VERSION_KEY = 'hrms_legal_terms_version';
export const LEGAL_TERMS_ACCEPTED_AT_KEY = 'hrms_legal_terms_accepted_at';
export const CURRENT_LEGAL_VERSION = '1.0.0';

export interface LegalTermsConsentStatus {
    accepted: boolean;
    version: string | null;
    acceptedAt: string | null;
}

export const getLegalTermsAccepted = async (): Promise<LegalTermsConsentStatus> => {
    try {
        const [acceptedVal, versionVal, acceptedAtVal] = await Promise.all([
            appStorage.getItem(LEGAL_TERMS_ACCEPTED_KEY),
            appStorage.getItem(LEGAL_TERMS_VERSION_KEY),
            appStorage.getItem(LEGAL_TERMS_ACCEPTED_AT_KEY),
        ]);

        const accepted = acceptedVal === 'true' && versionVal === CURRENT_LEGAL_VERSION;
        return {
            accepted,
            version: versionVal,
            acceptedAt: acceptedAtVal,
        };
    } catch {
        return { accepted: false, version: null, acceptedAt: null };
    }
};

export const setLegalTermsAccepted = async (
    accepted: boolean = true,
    version: string = CURRENT_LEGAL_VERSION
): Promise<void> => {
    try {
        if (accepted) {
            await Promise.all([
                appStorage.setItem(LEGAL_TERMS_ACCEPTED_KEY, 'true'),
                appStorage.setItem(LEGAL_TERMS_VERSION_KEY, version),
                appStorage.setItem(LEGAL_TERMS_ACCEPTED_AT_KEY, new Date().toISOString()),
            ]);
        } else {
            await Promise.all([
                appStorage.removeItem(LEGAL_TERMS_ACCEPTED_KEY),
                appStorage.removeItem(LEGAL_TERMS_VERSION_KEY),
                appStorage.removeItem(LEGAL_TERMS_ACCEPTED_AT_KEY),
            ]);
        }
    } catch (e) {
        console.warn('Failed to save legal terms consent state', e);
    }
};

export const resetLegalTermsAccepted = async (): Promise<void> => {
    try {
        await setLegalTermsAccepted(false);
    } catch (e) {
        console.warn('Failed to reset legal terms acceptance', e);
    }
};


