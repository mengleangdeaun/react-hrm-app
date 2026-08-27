import { apiClient } from './client';

export interface CalendarAttendanceItem {
    id: number;
    employee_id: number;
    date: string;
    clock_in_time: string | null;
    clock_out_time: string | null;
    session_1_out_time?: string | null;
    session_2_in_time?: string | null;
    status: string;
    in_status?: string | null;
    out_status?: string | null;
    late_minutes?: number;
    early_departure_minutes?: number;
    notes?: string | null;
}

export interface CalendarHolidayItem {
    id: number;
    title: string;
    start_date: string;
    end_date: string;
    is_personal?: boolean;
    description?: string | null;
}

export interface CalendarLeaveItem {
    id: number;
    employee_id: number;
    leave_type_id: number;
    start_date: string;
    end_date: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    reason?: string | null;
    leave_type?: {
        id?: number;
        name: string;
        color?: string;
    };
}

export interface CalendarDayOffItem {
    id: number;
    employee_id: number;
    frequency: 'weekly' | 'monthly' | 'specific_dates';
    days_off?: string[];
    weeks_of_month?: number[];
    specific_dates?: string[];
    effective_from: string;
    effective_to: string | null;
    is_active?: boolean;
    reason?: string | null;
}

export interface CalendarWorkingDayConfig {
    is_working?: boolean;
    start_time?: string;
    end_time?: string;
    has_break?: boolean;
    break_start?: string;
    break_end?: string;
}

export interface CalendarWorkingShift {
    id: number;
    name: string;
    shift_type: string;
    start_time?: string;
    end_time?: string;
    working_days?: Record<string, CalendarWorkingDayConfig> | CalendarWorkingDayConfig[];
}

export interface CalendarMonthData {
    attendance: CalendarAttendanceItem[];
    holidays: CalendarHolidayItem[];
    leaves: CalendarLeaveItem[];
    day_offs: CalendarDayOffItem[];
    working_days: Record<string, CalendarWorkingDayConfig> | any;
    working_shift: CalendarWorkingShift | null;
}

export const calendarApi = {
    getCalendarData: async (month: number, year: number): Promise<CalendarMonthData> => {
        const response = await apiClient.get<CalendarMonthData>('/employee-app/calendar-data', {
            params: { month, year },
        });
        return response.data;
    },
};
