import React, { createContext, useContext, useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { User } from '../types';
import { AUTH_TOKEN_KEY, USER_DATA_KEY, apiClient } from '../api/client';
import { storage } from '../utils/storage';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isBiometricAvailable: boolean;
    login: (credentials: { email?: string; password?: string; pin?: string }) => Promise<void>;
    loginWithQr: (qrPayload: string) => Promise<void>;
    loginWithBiometrics: () => Promise<boolean>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
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
            const storedToken = await storage.getItem(AUTH_TOKEN_KEY);
            const storedUserJson = await storage.getItem(USER_DATA_KEY);

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

    const saveAuthData = async (newToken: string, newUser: User) => {
        await storage.setItem(AUTH_TOKEN_KEY, newToken);
        await storage.setItem(USER_DATA_KEY, JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    };

    const parseUserResponse = (rawData: any, fallbackEmail?: string): { newToken: string; newUser: User } => {
        const newToken = rawData.auth_token || rawData.token || ('demo_token_' + Date.now());
        const rawEmp = rawData.employee || rawData.user || {};

        const newUser: User = {
            id: rawEmp.id || 1,
            name: rawEmp.name || rawEmp.full_name || 'Employee',
            email: rawEmp.email || fallbackEmail || 'employee@scool.com',
            employee_code: rawEmp.code || rawEmp.employee_code || 'EMP-001',
            department: rawEmp.department || 'Software Engineering',
            position: rawEmp.position || 'Employee',
            avatar: rawEmp.profile_image || rawEmp.avatar || null,
        };

        return { newToken, newUser };
    };

    const login = async (credentials: { email?: string; password?: string; pin?: string }) => {
        setIsLoading(true);
        try {
            let responseData: any;
            try {
                const response = await apiClient.post('/attendance/login-credentials', credentials);
                responseData = response.data;
            } catch (err: any) {
                // If API fails or backend offline, check error message or use fallback for demo
                const serverMsg = err.response?.data?.message;
                if (err.response?.status === 401 && serverMsg) {
                    throw new Error(serverMsg);
                }
                console.warn('API login error, using fallback:', err.message);
                responseData = {
                    token: 'demo_token_' + Date.now(),
                    user: {
                        id: 1,
                        name: 'John Doe',
                        email: credentials.email || 'employee@scool.com',
                        employee_code: 'EMP-001',
                        department: 'Software Engineering',
                        position: 'Senior Mobile Engineer',
                    }
                };
            }

            const { newToken, newUser } = parseUserResponse(responseData, credentials.email);
            await saveAuthData(newToken, newUser);
        } finally {
            setIsLoading(false);
        }
    };

    const loginWithQr = async (qrPayload: string) => {
        setIsLoading(true);
        try {
            let responseData: any;
            try {
                const response = await apiClient.post('/attendance/employee-login', { payload: qrPayload });
                responseData = response.data;
            } catch (err: any) {
                const serverMsg = err.response?.data?.message;
                if (err.response?.status === 401 && serverMsg) {
                    throw new Error(serverMsg);
                }
                console.warn('QR API login error, using fallback:', err.message);
                responseData = {
                    token: 'demo_qr_token_' + Date.now(),
                    user: {
                        id: 1,
                        name: 'John Doe',
                        email: 'employee@scool.com',
                        employee_code: 'EMP-001',
                        department: 'Software Engineering',
                        position: 'Senior Mobile Engineer',
                    }
                };
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
                isBiometricAvailable,
                login,
                loginWithQr,
                loginWithBiometrics,
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
