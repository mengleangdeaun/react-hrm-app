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

// Response Interceptor: Handle 401 Unauthorized globally
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            try {
                await storage.removeItem(AUTH_TOKEN_KEY);
                await storage.removeItem(USER_DATA_KEY);
            } catch (e) {
                console.error('Failed to clear credentials on 401', e);
            }
        }
        return Promise.reject(error);
    }
);
