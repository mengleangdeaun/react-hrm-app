import { apiClient, generateIdempotencyKey } from './client';

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

export interface AttendanceClockInPayload {
    branch_code?: string;
    payload?: string;
    signature?: string;
    user_lat: number;
    user_lng: number;
    device_id: string;
    reason?: string;
    scanned_at?: string;
}

export interface AttendanceClockInResponse {
    message?: string;
    time?: string;
    action?: 'success' | 'warning' | string;
    require_reason?: boolean;
    type?: 'late' | 'early_departure' | 'warning' | string;
    minutes?: number;
    code?: string;
    distance?: number;
    is_duplicate?: boolean;
}

export const attendanceApi = {
    /**
     * Submit an employee attendance punch (clock in / clock out / break)
     */
    clockIn: async (payload: AttendanceClockInPayload, idempotencyKey?: string): Promise<AttendanceClockInResponse> => {
        const key = idempotencyKey || generateIdempotencyKey('punch');
        const response = await apiClient.post<AttendanceClockInResponse>(
            '/employee-app/attendance/clock-in',
            payload,
            {
                headers: {
                    'X-Idempotency-Key': key,
                },
            }
        );
        return response.data;
    },

    /**
     * Fetch attendance history records for employee
     */
    getHistory: async (params?: HistoryFilterParams) => {
        const response = await apiClient.get('/employee-app/history', { params });
        return response.data;
    },
};
