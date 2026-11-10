import axios from 'axios';
import { ENV } from '../config/env';
import { storage } from '../utils/storage';

export const AUTH_TOKEN_KEY = 'hrms_employee_auth_token';
export const USER_DATA_KEY = 'hrms_employee_user_data';

export const apiClient = axios.create({
    baseURL: ENV.API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 15000,
});

// Request Interceptor: Attach Bearer Token
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await storage.getItem(AUTH_TOKEN_KEY);
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {
            console.error('Failed to retrieve token from storage', e);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

type AuthEventListener = () => void;
const unauthorizedListeners = new Set<AuthEventListener>();

export const authEvents = {
    subscribeUnauthorized: (listener: AuthEventListener) => {
        unauthorizedListeners.add(listener);
        return () => {
            unauthorizedListeners.delete(listener);
        };
    },
    emitUnauthorized: () => {
        unauthorizedListeners.forEach((listener) => {
            try {
                listener();
            } catch (err) {
                console.error('Error in authEventListener:', err);
            }
        });
    },
};

export function generateIdempotencyKey(prefix: string = 'req'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Endpoints where a 401 means "wrong credentials", not "session expired".
 * These must never tear down an existing session.
 */
function isAuthEndpoint(url?: string): boolean {
    if (!url) return false;
    return url.includes('login') || url.includes('logout');
}

/**
 * Sign the user out because the server rejected their token.
 * Late 401s from a previous session are ignored: only the token that is still current may do this.
 * Exported for the few requests that cannot go through `apiClient` (see activity upload).
 */
export async function handleUnauthorized(sentAuthHeader?: string | null): Promise<void> {
    try {
        const currentToken = await storage.getItem(AUTH_TOKEN_KEY);
        const isCurrentSession = !!currentToken && (!sentAuthHeader || sentAuthHeader === `Bearer ${currentToken}`);
        if (isCurrentSession) {
            await storage.removeItem(AUTH_TOKEN_KEY);
            await storage.removeItem(USER_DATA_KEY);
            authEvents.emitUnauthorized();
        }
    } catch (e) {
        console.error('Failed to clear credentials on 401', e);
    }
}

// Response Interceptor: Handle 401 Unauthorized globally
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 && !isAuthEndpoint(error.config?.url)) {
            await handleUnauthorized(error.config?.headers?.Authorization);
        }
        return Promise.reject(error);
    }
);

/**
 * Best human-readable message for a failed request: Laravel validation errors first (they say
 * which field is wrong), then the server message, then the caller's fallback.
 */
export function getApiErrorMessage(error: any, fallback: string): string {
    const data = error?.response?.data;
    if (data?.errors && typeof data.errors === 'object') {
        const messages = Object.values(data.errors).flat().filter((m) => typeof m === 'string');
        if (messages.length > 0) return messages.join('\n');
    }
    return data?.message || error?.message || fallback;
}

/** Uploads on 2G/3G need far longer than the default 15s API timeout. */
export const UPLOAD_TIMEOUT_MS = 120000;

export function isNetworkError(error: any): boolean {
    if (!error) return false;
    // The server answered: whatever went wrong, it is not a connectivity problem
    if (error.response) return false;
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') return true;
    if (error.message === 'Network Error' || error.message?.toLowerCase().includes('timeout') || error.message?.toLowerCase().includes('network')) return true;
    if (!error.response && error.request) return true;
    return false;
}
