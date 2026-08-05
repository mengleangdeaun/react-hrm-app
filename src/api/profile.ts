import { apiClient } from './client';

export interface ProfileData {
    id?: string | number;
    full_name: string;
    employee_id: string;
    email?: string;
    phone?: string;
    gender?: string | null;
    address?: string;
    profile_image?: string;
    profile_image_url?: string;
    date_of_birth?: string;
    date_of_joining?: string;
    working_period?: string;
    telegram_user_id?: string;
    department?: string | { id: number; name: string };
    designation?: string | { id: number; name: string };
    branch?: string | { id: number; name: string };
    line_manager?:
        | string
        | {
              id?: number;
              name?: string;
              full_name?: string;
              designation?: string;
              email?: string;
              phone?: string;
              profile_image_url?: string;
          };
    is_top_management?: boolean;
}

export interface UserPreferences {
    id?: number;
    employee_id?: number;
    font_family?: string;
    font_size?: 'small' | 'medium' | 'normal' | 'large' | string;
    color_theme?: 'sky' | 'emerald' | 'violet' | 'rose' | 'amber' | 'default' | string;
    dark_mode?: boolean;
    notifications_enabled?: boolean;
    location_enabled?: boolean;
    camera_enabled?: boolean;
    locale?: 'en' | 'kh' | string;
    theme_mode?: 'dark' | 'light' | 'system';
    accent_color?: string;
    language?: 'en' | 'kh';
    created_at?: string;
    updated_at?: string;
}

export interface PwaInfo {
    version?: string;
    privacy_policy?: string;
    terms_of_service?: string;
    vapid_public_key?: string;
}

export const profileApi = {
    /**
     * Fetch HR employment profile details
     */
    getProfile: async () => {
        const response = await apiClient.get('/employee-app/profile');
        return response.data;
    },

    /**
     * Upload new profile avatar image
     */
    uploadAvatar: async (imageUri: string) => {
        const formData = new FormData();
        formData.append('avatar', {
            uri: imageUri,
            name: 'profile_avatar.jpg',
            type: 'image/jpeg',
        } as any);

        const response = await apiClient.post('/employee-app/profile/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * Fetch user preference settings
     */
    getPreferences: async () => {
        const response = await apiClient.get('/employee-app/preferences');
        return response.data;
    },

    /**
     * Update user preference settings
     */
    updatePreferences: async (preferences: UserPreferences) => {
        const response = await apiClient.put('/employee-app/preferences', preferences);
        return response.data;
    },

    /**
     * Fetch PWA & App info (version, privacy policy, terms)
     */
    getPwaInfo: async () => {
        const response = await apiClient.get('/pwa/info');
        return response.data;
    },

    /**
     * Submit app feedback or bug report
     */
    submitFeedback: async (data: { message?: string; category?: string; rating?: number; comment?: string; device_info?: any }) => {
        const response = await apiClient.post('/employee-app/app-feedback', data);
        return response.data;
    },
};
