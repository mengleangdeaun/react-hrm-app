import { apiClient } from './client';

export interface LeaveType {
    id: number;
    name: string;
    color?: string;
}

export interface LeaveBalance {
    id: number;
    employee_id?: string | number;
    leave_policy_id?: number;
    leave_type_id?: number;
    allocated_days?: number;
    total_accrued?: number | string;
    used_days?: number;
    total_taken?: number | string;
    pending_days?: number;
    remaining_days?: number;
    balance?: number | string;
    leave_type?: LeaveType | string;
    leaveType?: LeaveType | string;
}

export interface LeaveRequest {
    id: number;
    employee_id?: string;
    leave_type_id: number;
    leave_type?: LeaveType | string;
    duration_type?: 'full_day' | 'first_half' | 'second_half' | 'multi_day' | 'custom_time';
    start_date: string;
    end_date: string;
    start_time?: string;
    end_time?: string;
    total_days?: number;
    days_count?: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    rejection_reason?: string | null;
    attachments?: string[];
    created_at?: string;
    employee_name?: string;
    employee?: {
        id?: number | string;
        full_name?: string;
        name?: string;
        profile_image?: string;
    };
}

export const leaveApi = {
    /**
     * Fetch active leave balances for employee
     */
    getMyBalances: async () => {
        const response = await apiClient.get('/employee-app/my-leave-balances');
        const rawData = response.data;
        const list = Array.isArray(rawData)
            ? rawData
            : Array.isArray(rawData?.balances)
            ? rawData.balances
            : Array.isArray(rawData?.data)
            ? rawData.data
            : [];

        const normalized = list.map((item: any) => {
            const rem = parseFloat(item.remaining_days ?? item.balance ?? item.remaining ?? 0);
            const used = parseFloat(item.used_days ?? item.total_taken ?? item.taken ?? 0);
            const alloc = parseFloat(item.allocated_days ?? item.total_accrued ?? item.allowed ?? 0);
            const lType = item.leave_type || item.leaveType;

            return {
                ...item,
                remaining_days: isNaN(rem) ? 0 : rem,
                used_days: isNaN(used) ? 0 : used,
                allocated_days: isNaN(alloc) ? 0 : alloc,
                leave_type: lType,
            };
        });

        return Array.isArray(rawData) ? normalized : { ...rawData, balances: normalized };
    },

    /**
     * Fetch leave requests history for employee
     */
    getLeaveRequests: async () => {
        const response = await apiClient.get('/employee-app/leave-requests');
        return response.data;
    },

    /**
     * Submit a new leave request
     */
    submitLeaveRequest: async (data: {
        leave_type_id: number;
        duration_type: string;
        start_date: string;
        end_date: string;
        start_time?: string;
        end_time?: string;
        reason: string;
        attachments?: { uri: string; name?: string; type?: string }[];
    }) => {
        const formData = new FormData();
        formData.append('leave_type_id', String(data.leave_type_id));
        formData.append('duration_type', data.duration_type);
        formData.append('start_date', data.start_date);
        formData.append('end_date', data.end_date);
        if (data.start_time) formData.append('start_time', data.start_time);
        if (data.end_time) formData.append('end_time', data.end_time);
        formData.append('reason', data.reason);

        if (data.attachments && data.attachments.length > 0) {
            data.attachments.forEach((file, index) => {
                formData.append('attachments[]', {
                    uri: file.uri,
                    name: file.name || `leave_proof_${index}.jpg`,
                    type: file.type || 'image/jpeg',
                } as any);
            });
        }

        const response = await apiClient.post('/employee-app/leave-requests', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            transformRequest: [
                (reqData, headers) => {
                    if (headers) {
                        delete headers['Content-Type'];
                    }
                    return reqData;
                },
            ],
        });
        return response.data;
    },

    /**
     * Cancel an employee's own pending leave request
     */
    cancelLeaveRequest: async (id: number | string) => {
        const response = await apiClient.put(`/employee-app/leave-requests/${id}/cancel`);
        return response.data;
    },

    /**
     * Fetch subordinate leave requests pending manager review
     */
    getManagerApprovals: async () => {
        const response = await apiClient.get('/employee-app/leave-requests/approvals');
        return response.data;
    },

    /**
     * Manager approve request
     */
    approveLeaveRequest: async (id: number | string) => {
        const response = await apiClient.post(`/employee-app/leave-requests/${id}/approve`);
        return response.data;
    },

    /**
     * Manager reject request with reason
     */
    rejectLeaveRequest: async (id: number | string, rejection_reason: string) => {
        const response = await apiClient.post(`/employee-app/leave-requests/${id}/reject`, {
            rejection_reason,
        });
        return response.data;
    },
};
