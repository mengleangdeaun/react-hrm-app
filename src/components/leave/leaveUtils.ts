import { LeaveBalance, LeaveRequest } from '../../api/leave';

export const getRemainingDays = (item: LeaveBalance | any): number => {
    const val = item.remaining_days ?? item.balance ?? item.remaining ?? 0;
    return typeof val === 'number' ? val : parseFloat(val) || 0;
};

export const getUsedDays = (item: LeaveBalance | any): number => {
    const val = item.used_days ?? item.total_taken ?? item.taken ?? 0;
    return typeof val === 'number' ? val : parseFloat(val) || 0;
};

export const getAllocatedDays = (item: LeaveBalance | any): number => {
    const val = item.allocated_days ?? item.total_accrued ?? item.allowed ?? 0;
    return typeof val === 'number' ? val : parseFloat(val) || 0;
};

export const getLeaveTypeName = (leaveTypeObj: any, item?: any, fallback = 'Leave'): string => {
    const target = leaveTypeObj || item?.leave_type || item?.leaveType;
    if (typeof target === 'string') return target;
    if (target && typeof target === 'object' && (target.name || target.title)) {
        return target.name || target.title;
    }
    return fallback;
};

export const getLeaveTypeId = (item: any): number | null => {
    if (!item) return null;
    if (typeof item.leave_type_id === 'number') return item.leave_type_id;
    const lType = item.leave_type || item.leaveType;
    if (typeof lType === 'object' && lType?.id) return lType.id;
    if (typeof item.id === 'number') return item.id;
    return null;
};

export const getDurationTypeLabel = (
    durationType?: string,
    startTime?: string,
    endTime?: string,
    t?: (k: string, f: string) => string
): string => {
    const tr = t || ((_: string, f: string) => f);
    switch (durationType) {
        case 'first_half':
            return tr('morning', 'Morning (Half Day)');
        case 'second_half':
            return tr('afternoon', 'Afternoon (Half Day)');
        case 'custom_time':
            return startTime && endTime ? `${startTime} - ${endTime}` : tr('custom_hours', 'Custom Hours');
        case 'multi_day':
            return tr('multi_day', 'Multi-Day');
        case 'full_day':
        default:
            return tr('full_day', 'Full Day');
    }
};
