import React, { createContext, useContext, useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { User } from '../types';
import { AUTH_TOKEN_KEY, USER_DATA_KEY, apiClient } from '../api/client';
import { storage, getOnboardingCompleted, setOnboardingCompleted, resetOnboarding } from '../utils/storage';
import { getDeviceId } from '../utils/device';
import { extractEmployeeQrPayload } from '../utils/qrPayload';

export interface AuthApiError extends Error {
    code?: 'DEVICE_MISMATCH' | 'DEVICE_TAKEN' | string;
    instruction?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    hasCompletedOnboarding: boolean;
    isBiometricAvailable: boolean;
    login: (credentials: { email?: string; password?: string; pin?: string }, force?: boolean) => Promise<void>;
    loginWithQr: (qrPayload: string, force?: boolean) => Promise<void>;
    loginWithTelegram: (telegramData: any, force?: boolean) => Promise<void>;
    loginWithBiometrics: () => Promise<boolean>;
    completeOnboarding: () => Promise<void>;
    resetOnboardingState: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
    const [isBiometricAvailable, setIsBiometricAvailable] = useState<boolean>(false);

    useEffect(() => {
        checkStoredAuth();
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            setIsBiometricAvailable(hasHardware && isEnrolled);
        } catch (e) {
            setIsBiometricAvailable(false);
        }
    };

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

    const resetOnboardingState = async () => {
        setHasCompletedOnboarding(false);
        await resetOnboarding();
    };

    const saveAuthData = async (newToken: string, newUser: User) => {
        await storage.setItem(AUTH_TOKEN_KEY, newToken);
        await storage.setItem(USER_DATA_KEY, JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    };

    const parseUserResponse = (rawData: any, fallbackEmail?: string): { newToken: string; newUser: User } => {
        const newToken = rawData.auth_token || rawData.token;
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

    const loginWithTelegram = async (telegramData: any, force: boolean = false) => {
        setIsLoading(true);
        const isForce = force === true;
        try {
            const deviceId = await getDeviceId();
            let responseData: any;
            try {
                const response = await apiClient.post('/attendance/employee-login-telegram', {
                    ...telegramData,
                    device_id: deviceId,
                    force: isForce,
                });
                responseData = response.data;
            } catch (err: any) {
                if (err.response) {
                    handleApiError(err);
                }
                console.warn('Telegram login error:', err.message);
                throw err;
            }

            const { newToken, newUser } = parseUserResponse(responseData);
            await saveAuthData(newToken, newUser);
        } finally {
            setIsLoading(false);
        }
    };

    const loginWithBiometrics = async (): Promise<boolean> => {
        if (!isBiometricAvailable) return false;

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to access HRMS',
            fallbackLabel: 'Use PIN or Password',
        });

        if (result.success) {
            const storedToken = await storage.getItem(AUTH_TOKEN_KEY);
            const storedUserJson = await storage.getItem(USER_DATA_KEY);
            if (storedToken && storedUserJson) {
                setToken(storedToken);
                setUser(JSON.parse(storedUserJson));
                return true;
            }
        }
        return false;
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await storage.removeItem(AUTH_TOKEN_KEY);
            await storage.removeItem(USER_DATA_KEY);
            setToken(null);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                hasCompletedOnboarding,
                isBiometricAvailable,
                login,
                loginWithQr,
                loginWithTelegram,
                loginWithBiometrics,
                completeOnboarding,
                resetOnboardingState,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
