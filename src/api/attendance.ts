import { apiClient } from './client';

export interface HistoryRecord {
    id: number;
    date: string;
    clock_in_time?: string | null;
    clock_out_time?: string | null;
    session_1_out_time?: string | null;
    session_2_in_time?: string | null;
    status: string;
    in_status?: string;
    out_status?: string;
    late_minutes?: number;
    early_minutes?: number;
    warning_minutes?: number;
    early_departure_minutes?: number;
    overtime_minutes?: number;
    stay_late_minutes?: number;
    working_hours?: string;
}

export interface HistoryFilterParams {
    page?: number;
    per_page?: number;
    month?: string; // YYYY-MM
    status?: string;
    in_status?: string;
    out_status?: string;
}

export const attendanceApi = {
    /**
     * Fetch attendance history records for employee
     */
    getHistory: async (params?: HistoryFilterParams) => {
        const response = await apiClient.get('/employee-app/history', { params });
        return response.data;
    },
};
