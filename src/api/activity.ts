import { apiClient } from './client';

export interface ActivityItem {
    id: number | string;
    employee_id?: string;
    activity_type: string;
    photo_path?: string;
    attachments?: string[];
    comment?: string;
    latitude?: number;
    longitude?: number;
    location_name?: string;
    activity_date?: string;
    submitted_at?: string;
    status: 'submitted' | 'approved' | 'rejected';
    admin_note?: string | null;
}

export interface ActivityFilterParams {
    page?: number;
    per_page?: number;
    month?: string; // YYYY-MM
    activity_type?: string;
}

export const activityApi = {
    /**
     * Fetch list of employee activities with optional month & type filtering
     */
    getActivities: async (params?: ActivityFilterParams) => {
        const response = await apiClient.get('/employee-app/activities', { params });
        return response.data;
    },

    /**
     * Submit a new activity with multipart form data (photos, comment, location)
     */
    submitActivity: async (data: {
        activity_type: string;
        comment?: string;
        latitude?: number;
        longitude?: number;
        location_name?: string;
        attachments: { uri: string; name?: string; type?: string }[];
    }) => {
        const formData = new FormData();
        formData.append('activity_type', data.activity_type);
        if (data.comment) formData.append('comment', data.comment);
        if (data.latitude !== undefined) formData.append('latitude', String(data.latitude));
        if (data.longitude !== undefined) formData.append('longitude', String(data.longitude));
        if (data.location_name) formData.append('location_name', data.location_name);

        data.attachments.forEach((file, index) => {
            formData.append('attachments[]', {
                uri: file.uri,
                name: file.name || `activity_photo_${index}.jpg`,
                type: file.type || 'image/jpeg',
            } as any);
        });

        const response = await apiClient.post('/employee-app/activities', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
};
