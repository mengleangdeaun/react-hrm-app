import { Platform } from 'react-native';
import { apiClient, AUTH_TOKEN_KEY, generateIdempotencyKey } from './client';
import { storage } from '../utils/storage';
import { ENV } from '../config/env';

export interface ActivityItem {
    id: number | string;
    employee_id?: string;
    activity_type: string;
    photo_path?: string;
    photo_url?: string;
    attachments?: string[];
    attachment_urls?: string[];
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

export const OFFICIAL_ACTIVITY_TYPES = [
    { id: 'Sale Outdoor', label: 'Sale Outdoor' },
    { id: 'Site Visit', label: 'Site Visit' },
    { id: 'Meeting / Discussion', label: 'Meeting / Discussion' },
    { id: 'Delivery / Collection', label: 'Delivery / Collection' },
    { id: 'On-Site Service', label: 'On-Site Service' },
    { id: 'Training', label: 'Training' },
    { id: 'Support', label: 'Support' },
    { id: 'Other', label: 'Other' },
];

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

        for (let index = 0; index < data.attachments.length; index++) {
            const file = data.attachments[index];
            const uriStr = file.uri || '';
            const rawExt = uriStr.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
            const ext = rawExt === 'png' || rawExt === 'jpeg' || rawExt === 'jpg' ? rawExt : 'jpg';
            const fileName = file.name && file.name.includes('.') ? file.name : `activity_photo_${Date.now()}_${index}.${ext}`;
            const fileType = file.type || `image/${ext === 'png' ? 'png' : 'jpeg'}`;

            if (Platform.OS === 'web' || uriStr.startsWith('blob:') || uriStr.startsWith('data:')) {
                try {
                    const blobRes = await fetch(uriStr);
                    const blob = await blobRes.blob();
                    const fileObj = new File([blob], fileName, { type: fileType });
                    formData.append('attachments[]', fileObj);
                } catch (e) {
                    formData.append('attachments[]', {
                        uri: file.uri,
                        name: fileName,
                        type: fileType,
                    } as any);
                }
            } else {
                formData.append('attachments[]', {
                    uri: file.uri,
                    name: fileName,
                    type: fileType,
                } as any);
            }
        }

        const token = await storage.getItem(AUTH_TOKEN_KEY);
        const key = generateIdempotencyKey('activity');
        const response = await fetch(`${ENV.API_URL}/employee-app/activities`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'X-Idempotency-Key': key,
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        const resData = await response.json();
        if (!response.ok) {
            const errorMsg = resData.errors ? Object.values(resData.errors).flat().join(', ') : resData.message;
            throw new Error(errorMsg || 'Failed to submit activity report.');
        }

        return resData;
    },
};
