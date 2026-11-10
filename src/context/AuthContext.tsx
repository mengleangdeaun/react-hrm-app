import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { AUTH_TOKEN_KEY, USER_DATA_KEY, apiClient, authEvents } from '../api/client';
import { storage, secureStorage, getOnboardingCompleted, setOnboardingCompleted } from '../utils/storage';
import { getDeviceId } from '../utils/device';
import { extractEmployeeQrPayload } from '../utils/qrPayload';
import { clearOfflineQueryCache } from '../offline/queryPersister';
import { syncQueue } from '../offline/syncQueue';

/**
 * Biometric login was removed. Earlier builds kept a copy of the session token under this key;
 * it is deleted on startup so no orphaned credential stays on upgraded devices.
 */
const LEGACY_BIOMETRIC_CREDENTIAL_KEY = 'hrms_employee_biometric_credential';

export interface AuthApiError extends Error {
    code?: 'DEVICE_MISMATCH' | 'DEVICE_TAKEN' | string;
    instruction?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    hasCompletedOnboarding: boolean;
    login: (credentials: { email?: string; password?: string; pin?: string }, force?: boolean) => Promise<void>;
    loginWithQr: (qrPayload: string, force?: boolean) => Promise<void>;
    completeOnboarding: () => Promise<void>;
    logout: (options?: { clearOfflineQueue?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);

    useEffect(() => {
        checkStoredAuth();
        secureStorage.removeItem(LEGACY_BIOMETRIC_CREDENTIAL_KEY).catch(() => {});

        // Listen for 401 Unauthorized from API layer and reset React auth state immediately
        const unsubscribe = authEvents.subscribeUnauthorized(() => {
            setToken(null);
            setUser(null);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const checkStoredAuth = async () => {
        try {
            const [storedToken, storedUserJson, onboarded] = await Promise.all([
                storage.getItem(AUTH_TOKEN_KEY),
                storage.getItem(USER_DATA_KEY),
                getOnboardingCompleted(),
            ]);

            setHasCompletedOnboarding(onboarded);

            if (storedToken && storedUserJson) {
                setToken(storedToken);
                setUser(JSON.parse(storedUserJson));
            }
        } catch (error) {
            console.error('Failed to load auth credentials', error);
        } finally {
            setIsLoading(false);
        }
    };

    const completeOnboarding = async () => {
        setHasCompletedOnboarding(true);
        await setOnboardingCompleted(true);
    };

    const saveAuthData = async (newToken: string, newUser: User) => {
        await storage.setItem(AUTH_TOKEN_KEY, newToken);
        await storage.setItem(USER_DATA_KEY, JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);

        // Instantly drain any pending offline sync operations on fresh authentication
        syncQueue.processQueue().catch((e) => console.warn('[AuthContext] Error draining queue post-login:', e));
    };

    const parseUserResponse = (rawData: any, fallbackEmail?: string): { newToken: string; newUser: User } => {
        const newToken = rawData?.auth_token || rawData?.token;
        if (!newToken || typeof newToken !== 'string') {
            // Never persist "undefined" as a session: every later request would 401 and bounce the user out
            throw new Error('Login succeeded but the server did not return a session token. Please contact your administrator.');
        }
        const rawEmp = rawData.employee || rawData.user || {};

        const newUser: User = {
            id: rawEmp.id || 1,
            name: rawEmp.name || rawEmp.full_name || 'Employee',
            email: rawEmp.email || fallbackEmail || 'employee@scool.com',
            employee_code: rawEmp.code || rawEmp.employee_code || 'EMP-001',
            department: rawEmp.department || 'Employee',
            position: rawEmp.position || 'Employee',
            avatar: rawEmp.profile_image || rawEmp.avatar || null,
        };

        return { newToken, newUser };
    };

    const handleApiError = (err: any) => {
        const resData = err.response?.data;
        if (resData && resData.message) {
            const authErr = new Error(resData.message) as AuthApiError;
            authErr.code = resData.code;
            authErr.instruction = resData.instruction;
            throw authErr;
        }
        throw new Error(err?.message || 'Login failed. Please check your connection and try again.');
    };

    const login = async (credentials: { email?: string; password?: string; pin?: string }, force: boolean = false) => {
        setIsLoading(true);
        const isForce = force === true;
        try {
            const deviceId = await getDeviceId();
            let responseData: any;
            try {
                const response = await apiClient.post('/attendance/login-credentials', {
                    ...credentials,
                    device_id: deviceId,
                    force: isForce,
                });
                responseData = response.data;
            } catch (err: any) {
                // If real backend responds with error or 403 device mismatch/taken, re-throw properly
                if (err.response) {
                    handleApiError(err);
                }
                // Handle network / CORS errors clearly instead of failing silently with invalid demo tokens
                console.error('Backend connection error during login:', err.message);
                throw new Error(err?.message || 'Could not connect to the backend server. Please verify Laravel backend is running and CORS/API URL settings are correct.');
            }

            const { newToken, newUser } = parseUserResponse(responseData, credentials.email);
            await saveAuthData(newToken, newUser);
        } finally {
            setIsLoading(false);
        }
    };

    const loginWithQr = async (rawQrInput: string, force: boolean = false) => {
        setIsLoading(true);
        const isForce = force === true;
        try {
            const parsed = extractEmployeeQrPayload(rawQrInput);
            if (!parsed.isValid || !parsed.payload) {
                const parseErr = new Error(parsed.error || 'Invalid Employee QR code.') as AuthApiError;
                throw parseErr;
            }

            const deviceId = await getDeviceId();
            let responseData: any;
            try {
                const response = await apiClient.post('/attendance/employee-login', {
                    payload: parsed.payload,
                    device_id: deviceId,
                    force: isForce,
                });
                responseData = response.data;
            } catch (err: any) {
                if (err.response) {
                    handleApiError(err);
                }
                console.error('QR Login connection error:', err.message);
                throw new Error(err?.message || 'Could not connect to the backend server. Please check your network connection.');
            }

            const { newToken, newUser } = parseUserResponse(responseData);
            await saveAuthData(newToken, newUser);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async (options?: { clearOfflineQueue?: boolean }) => {
        setIsLoading(true);
        try {
            // 1. Notify backend to revoke session token (attempt employee-app then attendance prefix)
            apiClient.post('/employee-app/logout')
                .catch(() => apiClient.post('/attendance/logout'))
                .catch(() => {});

            // 2. Clear query caches (memory + disk). Offline mutation queue is preserved by default
            // to ensure un-synced punches and records are never lost on sign-out.
            const cleanupTasks: Promise<any>[] = [
                clearOfflineQueryCache(),
                storage.removeItem(AUTH_TOKEN_KEY),
                storage.removeItem(USER_DATA_KEY),
            ];

            if (options?.clearOfflineQueue) {
                cleanupTasks.push(syncQueue.clear());
            }

            await Promise.all(cleanupTasks);

            setToken(null);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    // The callbacks only touch state setters and module singletons, so the value is keyed on the
    // state consumers actually read; consumers no longer get a fresh object on every provider render.
    const value = useMemo<AuthContextType>(() => ({
        user,
        token,
        isLoading,
        hasCompletedOnboarding,
        login,
        loginWithQr,
        completeOnboarding,
        logout,
    }), [user, token, isLoading, hasCompletedOnboarding]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
