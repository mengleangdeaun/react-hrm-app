import { apiClient } from './client';

export interface ProfileData {
    id: string | number;
    full_name: string;
    employee_id: string;
    email?: string;
    phone?: string;
    gender?: string;
    profile_image_url?: string;
    date_of_joining?: string;
    working_period?: string;
    telegram_user_id?: string;
    department?: { id: number; name: string };
    designation?: { id: number; name: string };
    branch?: { id: number; name: string };
    line_manager?: { id: number; full_name: string };
}

export interface UserPreferences {
    theme_mode?: 'dark' | 'light' | 'system';
    font_size?: 'small' | 'normal' | 'large';
    accent_color?: string;
    language?: 'en' | 'kh';
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
     * Submit app feedback or bug report
     */
    submitFeedback: async (data: { category: string; rating?: number; comment: string }) => {
        const response = await apiClient.post('/employee-app/app-feedback', data);
        return response.data;
    },
};
