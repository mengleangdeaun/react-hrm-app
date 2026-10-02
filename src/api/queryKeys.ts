/**
 * Centralized Type-Safe Query Key Factory
 * Eliminates string-literal typos and ensures deterministic cache invalidations.
 */

export const queryKeys = {
    auth: {
        all: ['auth'] as const,
        profile: ['profile'] as const,
        preferences: ['userPreferences'] as const,
        pwaInfo: ['pwaInfo'] as const,
    },
    dashboard: {
        all: ['dashboard'] as const,
        bootstrap: ['dashboardBootstrap'] as const,
    },
    attendance: {
        all: ['attendanceHistory'] as const,
        history: (month?: string, filter?: string) =>
            ['attendanceHistory', month ?? '', filter ?? ''] as const,
        todayShift: ['shiftToday'] as const,
    },
    leave: {
        all: ['leaveRequests'] as const,
        balances: ['leaveBalances'] as const,
        requests: (tab?: string) => ['leaveRequests', tab ?? 'all'] as const,
        approvals: ['managerApprovalsList'] as const,
        dayOffInfo: ['dayOffInfo'] as const,
        dayOffRequests: ['dayOffRequests'] as const,
        teamDayOffRequests: ['teamDayOffRequests'] as const,
    },
    activity: {
        all: ['activities'] as const,
        list: (month?: string, category?: string) =>
            ['activities', month ?? '', category ?? ''] as const,
    },
    calendar: {
        all: ['calendarData'] as const,
        month: (year: number, month: number) =>
            ['calendarData', year, month] as const,
    },
    notifications: {
        all: ['notificationsList'] as const,
        list: ['notificationsList'] as const,
        celebrations: ['celebrationsList'] as const,
        announcement: (id: string | number) =>
            ['announcementDetail', id] as const,
        subordinateNotices: (subordinateId?: string | number, category?: string) =>
            ['subordinateNotices', subordinateId ?? '', category ?? ''] as const,
        subordinates: ['subordinates'] as const,
    },
    celebrations: {
        all: ['celebrations'] as const,
        list: ['celebrations'] as const,
        myWishes: ['myWishes'] as const,
    },
    quizzes: {
        all: ['quizzesList'] as const,
        list: ['quizzesList'] as const,
        result: (token: string) => ['quizResult', token] as const,
    },
} as const;
