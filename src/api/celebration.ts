import { apiClient } from './client';

export interface CelebrantItem {
    id: number | string;
    name: string;
    designation?: string;
    department?: string;
    profile_image_url?: string;
    type: 'birthday' | 'anniversary';
    milestone?: string | null;
    years?: number;
}

export interface WishSender {
    id: number | string;
    full_name: string;
    profile_image?: string | null;
    profile_image_url?: string | null;
}

export interface WishItem {
    id: number | string;
    sender_id: number | string;
    receiver_id: number | string;
    type: 'birthday' | 'anniversary' | string;
    message: string;
    image_path?: string | null;
    image_path_disk?: string | null;
    created_at: string;
    sender?: WishSender;
}

export interface SendWishPayload {
    receiver_id: string | number;
    type: 'birthday' | 'anniversary';
    message?: string;
    image?: any;
}

export const celebrationApi = {
    /**
     * Get active celebrants (Birthdays and Work Anniversaries) for today
     */
    getCelebrations: async (): Promise<CelebrantItem[]> => {
        const response = await apiClient.get('/employee-app/celebrations');
        const data = response.data;
        return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    },

    /**
     * Get wishes received by the authenticated employee
     */
    getMyWishes: async (): Promise<WishItem[]> => {
        const response = await apiClient.get('/employee-app/celebrations/my-wishes');
        const data = response.data;
        return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    },

    /**
     * Get specific celebrant details
     */
    getCelebrant: async (id: string | number, type = 'birthday', milestone?: string): Promise<CelebrantItem> => {
        const response = await apiClient.get(`/employee-app/celebrations/${id}`, {
            params: { type, milestone },
        });
        return response.data;
    },

    /**
     * Send a celebratory wish to a colleague
     */
    sendWish: async (payload: SendWishPayload): Promise<{ message: string; wish: WishItem }> => {
        if (payload.image) {
            const formData = new FormData();
            formData.append('receiver_id', String(payload.receiver_id));
            formData.append('type', payload.type);
            if (payload.message) {
                formData.append('message', payload.message);
            }

            // If image is a local file object from ImagePicker
            if (typeof payload.image === 'object' && payload.image.uri) {
                formData.append('image', {
                    uri: payload.image.uri,
                    name: payload.image.fileName || 'wish.jpg',
                    type: payload.image.mimeType || 'image/jpeg',
                } as any);
            } else {
                formData.append('image', payload.image);
            }

            const response = await apiClient.post('/employee-app/celebrations/wish', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        }

        const body = {
            receiver_id: String(payload.receiver_id),
            type: payload.type,
            message: payload.message || '',
        };

        const response = await apiClient.post('/employee-app/celebrations/wish', body);
        return response.data;
    },
};
