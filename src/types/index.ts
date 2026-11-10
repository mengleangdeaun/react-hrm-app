export interface User {
    id: number;
    name: string;
    email: string;
    employee_code?: string;
    employee_id?: number | string;
    avatar?: string;
    department?: string;
    position?: string;
    phone?: string;
    join_date?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
}

export interface LeaveRequest {
    id: number;
    leave_type: 'annual' | 'sick' | 'casual' | 'unpaid' | 'maternity';
    start_date: string;
    end_date: string;
    days_count: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    attachment_url?: string;
    created_at: string;
}

export interface LeaveBalance {
    leave_type: string;
    allowed: number;
    taken: number;
    remaining: number;
}

export interface Announcement {
    id: number;
    title: string;
    content: string;
    category?: string;
    attachment_url?: string;
    created_at: string;
    is_important?: boolean;
}

export interface SubordinateNotice {
    id: number;
    subordinate_name: string;
    subordinate_avatar?: string;
    type: 'warning' | 'appreciation' | 'info';
    message: string;
    date: string;
}

export interface Quiz {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    total_questions: number;
    token: string;
    is_completed?: boolean;
    score?: number;
}

export interface Question {
    id: number;
    question_text: string;
    options: { id: string; text: string }[];
}
