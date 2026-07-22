import { apiClient } from './client';

export interface Subordinate {
    id: number;
    full_name: string;
    employee_id?: string;
    profile_image?: string;
    profile_image_url?: string;
    designation?: string;
}

export interface SubordinateNotice {
    id: number | string;
    employee_id: number;
    type: 'positive' | 'negative' | 'progress';
    notice_date: string;
    comment: string;
    employee?: Subordinate;
    creator?: {
        id: number;
        full_name: string;
    };
    created_at?: string;
}

export interface NoticeFilterParams {
    page?: number;
    per_page?: number;
    type?: string;
    employee_id?: number;
    start_date?: string;
    end_date?: string;
    search?: string;
}

export const noticeApi = {
    /**
     * Fetch list of manageable subordinates
     */
    getSubordinates: async () => {
        const response = await apiClient.get('/employee-app/notices/subordinates');
        return response.data;
    },

    /**
     * Fetch subordinate notices feed
     */
    getNotices: async (params?: NoticeFilterParams) => {
        const response = await apiClient.get('/employee-app/notices', { params });
        return response.data;
    },

    /**
     * Create a new subordinate notice
     */
    createNotice: async (data: {
        employee_id: number;
        type: 'positive' | 'negative' | 'progress';
        notice_date: string;
        comment: string;
    }) => {
        const response = await apiClient.post('/employee-app/notices', data);
        return response.data;
    },
};
