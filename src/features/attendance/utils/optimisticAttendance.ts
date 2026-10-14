import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../api/queryKeys';

/**
 * Optimistically seeds the React Query cache for Dashboard & Attendance
 * so that when an employee punches offline or online, the UI transitions
 * the shift phase immediately ("bet on success") with zero network delay.
 */
export function optimisticallyUpdateAttendance(
    queryClient: QueryClient,
    currentPhase: 'ready' | 'session1' | 'break' | 'session2' | 'done',
    serverTime?: string
): void {
    const punchTime = serverTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    queryClient.setQueryData(queryKeys.dashboard.bootstrap, (oldData: any) => {
        if (!oldData) return oldData;
        try {
            const cloned = JSON.parse(JSON.stringify(oldData));
            const db = cloned.dashboard || cloned;
            const shiftObj = db.today_shift || cloned.today_shift || {};
            const att = shiftObj.attendance_today || db.today_attendance || {};

            if (currentPhase === 'ready') {
                att.in1 = punchTime;
                att.clock_in = punchTime;
                db.clock_in_time = punchTime;
            } else if (currentPhase === 'session1') {
                const shiftType = shiftObj?.shift?.day_shift_type || shiftObj?.shift?.shift_type || db?.shift_type || 'regular';
                const isSplit = shiftType === 'split';
                att.out1 = punchTime;
                if (isSplit) {
                    db.session_1_out_time = punchTime;
                } else {
                    att.clock_out = punchTime;
                    db.clock_out_time = punchTime;
                }
            } else if (currentPhase === 'break') {
                att.in2 = punchTime;
                db.session_2_in_time = punchTime;
            } else if (currentPhase === 'session2') {
                att.out2 = punchTime;
                att.clock_out = punchTime;
                db.clock_out_time = punchTime;
            }

            shiftObj.attendance_today = att;
            db.today_attendance = att;
            if (cloned.dashboard) {
                cloned.dashboard.today_shift = shiftObj;
                cloned.dashboard.today_attendance = att;
            } else {
                cloned.today_shift = shiftObj;
                cloned.today_attendance = att;
            }

            return cloned;
        } catch (e) {
            console.warn('[optimisticAttendance] Cache update failed:', e);
            return oldData;
        }
    });
}
