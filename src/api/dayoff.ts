import { apiClient } from './client';

export interface WorkingShiftBrief {
    id: number;
    name: string;
}

export interface DayOffAssignment {
    id: number;
    days_off?: string[];
    frequency?: 'weekly' | 'monthly' | 'specific_dates';
    weeks_of_month?: number[];
    specific_dates?: string[];
    effective_from?: string;
    effective_to?: string | null;
    notes?: string | null;
}

export interface DayOffInfo {
    resolved_days_off?: string[];
    day_off_source?: 'custom' | 'shift';
    working_shift?: WorkingShiftBrief | null;
    shift_days_off?: string[];
    assignment?: DayOffAssignment | null;
    day_off_frequency?: 'weekly' | 'monthly' | 'specific_dates';
    day_off_weeks?: number[];
    day_off_specific_dates?: string[];
}

export interface DayOffRequestItem {
    id: number;
    employee_id: number | string;
    request_type?: string;
    current_days_off?: string[];
    frequency: 'weekly' | 'monthly' | 'specific_dates';
    requested_days_off?: string[];
    weeks_of_month?: number[];
    specific_dates?: string[];
    effective_from: string;
    effective_to?: string | null;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    approved_by?: number | null;
    approved_at?: string | null;
    actioned_at?: string | null;
    rejection_reason?: string | null;
    created_at?: string;
    approver?: {
        id: number;
        full_name: string;
    } | null;
    employee?: {
        id: number;
        full_name: string;
        employee_id: string;
        profile_image?: string | null;
        profile_image_url?: string | null;
    };
}

export interface SubmitDayOffPayload {
    frequency: 'weekly' | 'monthly' | 'specific_dates';
    requested_days_off?: string[];
    weeks_of_month?: number[];
    specific_dates?: string[];
    effective_from: string;
    effective_to?: string;
    reason: string;
}

export const dayOffApi = {
    /**
     * Get employee's current day-off info and working shift schedule context
     */
    getDayOffInfo: async (): Promise<DayOffInfo> => {
        const response = await apiClient.get<DayOffInfo>('/employee-app/day-off');
        return response.data;
    },

    /**
     * Get employee's own day-off change requests history
     */
    getMyRequests: async (): Promise<DayOffRequestItem[]> => {
        const response = await apiClient.get<DayOffRequestItem[]>('/employee-app/day-off-requests');
        const data = response.data;
        return Array.isArray(data) ? data : Array.isArray((data as any)?.data) ? (data as any).data : [];
    },

    /**
     * Get pending day-off requests from subordinates (Team Approvals for Managers)
     */
    getTeamApprovals: async (): Promise<DayOffRequestItem[]> => {
        const response = await apiClient.get<DayOffRequestItem[]>('/employee-app/day-off/approvals');
        const data = response.data;
        return Array.isArray(data) ? data : Array.isArray((data as any)?.data) ? (data as any).data : [];
    },

    /**
     * Submit a day-off change request
     */
    submitRequest: async (payload: SubmitDayOffPayload): Promise<any> => {
        const response = await apiClient.post('/employee-app/day-off-requests', payload);
        return response.data;
    },

    /**
     * Manager approve a subordinate's day-off request
     */
    approveRequest: async (id: number | string): Promise<any> => {
        const response = await apiClient.post(`/employee-app/day-off-requests/${id}/approve`);
        return response.data;
    },

    /**
     * Manager reject a subordinate's day-off request with reason
     */
    rejectRequest: async (id: number | string, rejection_reason: string): Promise<any> => {
        const response = await apiClient.post(`/employee-app/day-off-requests/${id}/reject`, {
            rejection_reason,
        });
        return response.data;
    },

    /**
     * Cancel an employee's own pending day-off request
     */
    cancelRequest: async (id: number | string): Promise<any> => {
        const response = await apiClient.put(`/employee-app/day-off-requests/${id}/cancel`);
        return response.data;
    },
};
