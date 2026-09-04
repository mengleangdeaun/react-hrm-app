import { apiClient } from './client';

export interface NotificationItem {
    id: string | number;
    type: string;
    title: string;
    message: string;
    announcement_id?: number | string;
    app_category?: string;
    data?: any;
    read_at?: string | null;
    created_at: string;
}

export interface CelebrantItem {
    id: number | string;
    name: string;
    designation?: string;
    department?: string;
    profile_image_url?: string;
    type: 'birthday' | 'work_anniversary' | 'anniversary' | string;
    milestone?: string | null;
    years?: number;
}

export const notificationApi = {
    /**
     * Fetch list of employee notifications
     */
    getNotifications: async (category = 'pwa', limit = 50) => {
        const response = await apiClient.get('/employee-app/notifications', {
            params: { category, limit },
        });
        return response.data;
    },

    /**
     * Fetch unread notification counter
     */
    getUnreadCount: async (category = 'pwa') => {
        const response = await apiClient.get('/employee-app/notifications/unread-count', {
            params: { category },
        });
        return response.data;
    },

    /**
     * Mark single notification as read
     */
    markAsRead: async (id: string | number) => {
        const response = await apiClient.post(`/employee-app/notifications/${id}/read`);
        return response.data;
    },

    /**
     * Mark all employee notifications as read
     */
    markAllAsRead: async () => {
        const response = await apiClient.post('/employee-app/notifications/mark-all-read');
        return response.data;
    },

    /**
     * Delete single notification
     */
    deleteNotification: async (id: string | number, category = 'pwa') => {
        const response = await apiClient.delete(`/employee-app/notifications/${id}`, {
            params: { category },
        });
        return response.data;
    },

    /**
     * Delete all notifications
     */
    deleteAllNotifications: async (category = 'pwa') => {
        const response = await apiClient.delete('/employee-app/notifications', {
            params: { category },
        });
        return response.data;
    },

    /**
     * Fetch active team celebrations (Birthdays & Work Anniversaries)
     */
    getCelebrations: async () => {
        const response = await apiClient.get('/employee-app/celebrations');
        return response.data;
    },
};
