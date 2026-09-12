import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface ProactiveGuardStatus {
    require_reason: boolean;
    type: 'late' | 'early_departure' | null;
    minutes: number;
}

export interface ReasonPresetItem {
    id?: number | string;
    reason_text?: string;
    type?: 'late' | 'early' | 'early_departure' | 'both' | string;
    is_active?: boolean;
    sort_order?: number;
}

export function useAttendanceGuard() {
    const { data: bootstrapData } = useQuery({
        queryKey: ['dashboardBootstrap'],
        queryFn: async () => {
            const response = await apiClient.get('/employee-app/bootstrap');
            return response.data;
        },
        staleTime: 1000 * 60 * 5,
    });

    const dashboard = bootstrapData?.dashboard || bootstrapData || {};
    const todayShiftMerged =
        dashboard?.today_shift ||
        bootstrapData?.today_shift ||
        bootstrapData?.todayShiftMerged ||
        null;
    const shift = todayShiftMerged?.shift || dashboard?.shift || bootstrapData?.today_shift || null;
    const policy = todayShiftMerged?.policy || null;
    const attendanceToday =
        todayShiftMerged?.attendance_today ||
        dashboard?.today_attendance ||
        bootstrapData?.today_attendance ||
        null;
    const checkResults = todayShiftMerged?.check_results || null;
    const reasonPresets: ReasonPresetItem[] = useMemo(() => {
        const rawPresets =
            todayShiftMerged?.reason_presets ??
            dashboard?.today_shift?.reason_presets ??
            dashboard?.reason_presets ??
            bootstrapData?.today_shift?.reason_presets ??
            bootstrapData?.reason_presets ??
            [];
        return Array.isArray(rawPresets) ? rawPresets : [];
    }, [todayShiftMerged, dashboard, bootstrapData]);

    const in1 = attendanceToday?.in1 || dashboard?.clock_in_time || attendanceToday?.clock_in || null;
    const out1 = attendanceToday?.out1 || dashboard?.session_1_out_time || null;
    const in2 = attendanceToday?.in2 || dashboard?.session_2_in_time || null;
    const out2 = attendanceToday?.out2 || dashboard?.clock_out_time || attendanceToday?.clock_out || null;

    const shiftType = shift?.day_shift_type || shift?.shift_type || dashboard?.shift_type || 'regular';
    const isSplitShift = shiftType === 'split' || Boolean(out1 || in2);

    const shiftPhase = useMemo<'ready' | 'session1' | 'break' | 'session2' | 'done'>(() => {
        if (out2) return 'done';
        if (!isSplitShift && out1) return 'done';
        if (!in1) return 'ready';
        if (!isSplitShift) return 'session1';
        if (!out1) return 'session1';
        if (!in2) return 'break';
        return 'session2';
    }, [in1, out1, in2, out2, isSplitShift]);

    const evaluateGuard = useCallback((targetDate: Date = new Date()): ProactiveGuardStatus => {
        if (!shift || shiftPhase === 'done') {
            return { require_reason: false, type: null, minutes: 0 };
        }

        // If backend already flagged require_reason in check_results
        if (checkResults?.require_reason) {
            return {
                require_reason: true,
                type: checkResults.type === 'early_departure' ? 'early_departure' : 'late',
                minutes: checkResults.minutes || 0,
            };
        }

        if (shift.is_working === false) {
            return { require_reason: false, type: null, minutes: 0 };
        }

        const now = targetDate;
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        // 1. Initial Clock In -> Check Late
        if (shiftPhase === 'ready') {
            const startTimeStr = shift.start_time;
            if (!startTimeStr) return { require_reason: false, type: null, minutes: 0 };

            const scheduled = new Date(`${dateStr}T${startTimeStr.length === 5 ? startTimeStr + ':00' : startTimeStr}`);
            const tolerance = policy?.late_tolerance || 0;
            const diffMin = (now.getTime() - scheduled.getTime()) / 60000;

            if (diffMin > tolerance) {
                return { require_reason: true, type: 'late', minutes: Math.round(diffMin) };
            }
        }

        // 2. Split Shift Lunch Out -> Check Early Departure
        else if (isSplitShift && shiftPhase === 'session1') {
            const breakStartStr = shift.break_start;
            if (!breakStartStr) return { require_reason: false, type: null, minutes: 0 };

            const scheduled = new Date(`${dateStr}T${breakStartStr.length === 5 ? breakStartStr + ':00' : breakStartStr}`);
            const earlyTolerance = policy?.early_tolerance || 0;
            const diffMin = (scheduled.getTime() - now.getTime()) / 60000;

            if (diffMin > earlyTolerance) {
                return { require_reason: true, type: 'early_departure', minutes: Math.round(diffMin) };
            }
        }

        // 3. Split Shift Afternoon In -> Check Late
        else if (isSplitShift && shiftPhase === 'break') {
            const breakEndStr = shift.break_end;
            if (!breakEndStr) return { require_reason: false, type: null, minutes: 0 };

            const scheduled = new Date(`${dateStr}T${breakEndStr.length === 5 ? breakEndStr + ':00' : breakEndStr}`);
            const tolerance = policy?.late_tolerance || 0;
            const diffMin = (now.getTime() - scheduled.getTime()) / 60000;

            if (diffMin > tolerance) {
                return { require_reason: true, type: 'late', minutes: Math.round(diffMin) };
            }
        }

        // 4. Final Clock Out -> Check Early Departure
        else if ((!isSplitShift && shiftPhase === 'session1') || (isSplitShift && shiftPhase === 'session2')) {
            const endTimeStr = shift.end_time;
            if (!endTimeStr) return { require_reason: false, type: null, minutes: 0 };

            const scheduled = new Date(`${dateStr}T${endTimeStr.length === 5 ? endTimeStr + ':00' : endTimeStr}`);
            const earlyTolerance = policy?.early_tolerance || 0;
            const diffMin = (scheduled.getTime() - now.getTime()) / 60000;

            if (diffMin > earlyTolerance) {
                return { require_reason: true, type: 'early_departure', minutes: Math.round(diffMin) };
            }
        }

        return { require_reason: false, type: null, minutes: 0 };
    }, [shift, shiftPhase, checkResults, isSplitShift, policy]);

    const proactiveStatus = useMemo(() => evaluateGuard(new Date()), [evaluateGuard]);

    return {
        proactiveStatus,
        evaluateGuard,
        shiftPhase,
        isSplitShift,
        reasonPresets,
        todayShiftMerged,
    };
}
