import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
    History,
    Activity,
    Calendar,
    CalendarOff,
    FileText,
    Award,
} from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { useUnistyles } from 'react-native-unistyles';
import { useTranslation } from '../../../context/LanguageContext';
import { useAttendanceGuard } from '../../../hooks/useAttendanceGuard';
import { apiClient } from '../../../api/client';
import { queryKeys } from '../../../api/queryKeys';
import { formatTimeDisplay, parseDateOnly } from '../../../utils/dateTime';
import { getDismissedBannerIds, dismissBannerId } from '../../../utils/storage';
import { TimelineNode, QuickActionItem, AnnouncementItem, CelebrationItem } from '../types';

export function useDashboardData() {
    const { user } = useAuth();
    const { theme } = useUnistyles();
    const { t, locale } = useTranslation();

    const [dismissedBannerIds, setDismissedBannerIds] = useState<string[]>([]);
    const [avatarLoadError, setAvatarLoadError] = useState(false);

    // Attendance guard for phase awareness and proactive UI hints
    const {
        proactiveStatus,
        shiftPhase,
        isSplitShift,
    } = useAttendanceGuard();

    useEffect(() => {
        loadDismissedBanners();
    }, []);

    const loadDismissedBanners = async () => {
        const ids = await getDismissedBannerIds();
        setDismissedBannerIds(ids);
    };

    // Stale-while-revalidate offline-first bootstrap query
    const {
        data: bootstrapData,
        isLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: queryKeys.dashboard.bootstrap,
        queryFn: async () => {
            const response = await apiClient.get('/employee-app/bootstrap');
            return response.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days offline retention
    });

    // Screen Focus Auto-Refresh: Guarantees immediate update after scanning
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const onRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    // ── Resilient Data Extraction from Bootstrap Object ──────────────────────
    const dashboard = bootstrapData?.dashboard || bootstrapData || {};
    const employeeInfo = dashboard?.employee || bootstrapData?.employee || null;
    const todayShiftMerged = dashboard?.today_shift || bootstrapData?.today_shift || bootstrapData?.todayShiftMerged || null;
    const attendanceToday = todayShiftMerged?.attendance_today || dashboard?.today_attendance || bootstrapData?.today_attendance || null;
    const announcements: AnnouncementItem[] = Array.isArray(dashboard?.announcements)
        ? dashboard.announcements
        : Array.isArray(bootstrapData?.announcements)
        ? bootstrapData.announcements
        : [];
    const celebration: CelebrationItem | null = dashboard?.celebration || bootstrapData?.today_celebration || bootstrapData?.today_celebrations || null;
    const unreadNotifications = typeof (bootstrapData?.notifications?.unread_count ?? bootstrapData?.unread_notifications_count) === 'number'
        ? (bootstrapData?.notifications?.unread_count ?? bootstrapData?.unread_notifications_count)
        : 0;

    // ── 4 Scan Sessions for Split Shifts (In1, Out1, In2, Out2) ─────────────
    const in1 = attendanceToday?.in1 || dashboard?.clock_in_time || attendanceToday?.clock_in || null;
    const out1 = attendanceToday?.out1 || dashboard?.session_1_out_time || null;
    const in2 = attendanceToday?.in2 || dashboard?.session_2_in_time || null;
    const out2 = attendanceToday?.out2 || dashboard?.clock_out_time || attendanceToday?.clock_out || null;

    const todayDateStr = todayShiftMerged?.server_time
        ? String(todayShiftMerged.server_time).trim().substring(0, 10)
        : null;
    const todayDisplayDate = todayDateStr ? parseDateOnly(todayDateStr) : new Date();

    // Timeline Nodes (2 for regular shift, 4 for split shift)
    const timelineNodes = useMemo<TimelineNode[]>(() => {
        if (isSplitShift) {
            return [
                {
                    key: 'in1',
                    label: t('in', 'In'),
                    time: in1 ? formatTimeDisplay(in1) : null,
                    active: !!in1,
                    isCurrent: shiftPhase === 'ready',
                },
                {
                    key: 'out1',
                    label: t('lunch', 'Lunch'),
                    time: out1 ? formatTimeDisplay(out1) : null,
                    active: !!out1,
                    isCurrent: shiftPhase === 'session1',
                },
                {
                    key: 'in2',
                    label: t('back_in', 'Back'),
                    time: in2 ? formatTimeDisplay(in2) : null,
                    active: !!in2,
                    isCurrent: shiftPhase === 'break',
                },
                {
                    key: 'out2',
                    label: t('out', 'Out'),
                    time: out2 ? formatTimeDisplay(out2) : null,
                    active: !!out2,
                    isCurrent: shiftPhase === 'session2',
                },
            ];
        }

        return [
            {
                key: 'in1',
                label: t('clock_in', 'Clock In'),
                time: in1 ? formatTimeDisplay(in1) : null,
                active: !!in1,
                isCurrent: shiftPhase === 'ready',
            },
            {
                key: 'out2',
                label: t('clock_out', 'Clock Out'),
                time: (out2 || out1) ? formatTimeDisplay(out2 || out1) : null,
                active: !!(out2 || out1),
                isCurrent: shiftPhase === 'session1',
            },
        ];
    }, [isSplitShift, in1, out1, in2, out2, shiftPhase, t]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('good_morning', 'Good Morning');
        if (hour < 18) return t('good_afternoon', 'Good Afternoon');
        return t('good_evening', 'Good Evening');
    };

    const topBannerAnnouncement = announcements.find((item) => {
        const idStr = String(item.id || item.title || item.pwa_title || '');
        if (dismissedBannerIds.includes(idStr)) return false;
        return item.pwa_display_type === 'top_banner' || item.is_pinned || item.is_urgent;
    });

    const handleDismissTopBanner = async (item: AnnouncementItem) => {
        const idStr = String(item.id || item.title || item.pwa_title || '');
        setDismissedBannerIds((prev) => [...prev, idStr]);
        await dismissBannerId(idStr);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const displayName = employeeInfo?.full_name || user?.name || t('employee', 'Employee');

    const rawAvatarUrl = employeeInfo?.profile_image_url || user?.avatar;
    const avatarUrl = typeof rawAvatarUrl === 'string' && rawAvatarUrl.trim().length > 0 && rawAvatarUrl !== 'null' && rawAvatarUrl !== 'undefined'
        ? rawAvatarUrl.trim()
        : null;
    const showAvatarImage = !!avatarUrl && !avatarLoadError;

    // ── Dynamic Quick Actions with 100% PWA parity ────────────────────────────
    const quickActions = useMemo<QuickActionItem[]>(() => {
        const actions: QuickActionItem[] = [
            {
                id: 'attendance',
                title: t('attendance_log', 'Attendance Log'),
                subtitle: t('past_punch_records', 'Past Punch Records'),
                icon: History,
                iconColor: theme.colors.status.success,
                bgColor: theme.colors.status.successSubtle,
                route: 'History',
            },
            {
                id: 'activity',
                title: t('activity_log', 'Activity Log'),
                subtitle: t('log_daily_tasks', 'Log Daily Tasks'),
                icon: Activity,
                iconColor: theme.colors.status.warning,
                bgColor: theme.colors.status.warningSubtle,
                route: 'CreateActivity',
            },
            {
                id: 'leave',
                title: t('leave_requests', 'Leave Requests'),
                subtitle: t('apply_and_balances', 'Apply & Balances'),
                icon: Calendar,
                iconColor: theme.colors.status.purple,
                bgColor: theme.colors.status.purpleSubtle,
                route: 'CreateLeave',
            },
            {
                id: 'day_off',
                title: t('day_off', 'Day Off'),
                subtitle: t('rest_schedule', 'Rest Schedule'),
                icon: CalendarOff,
                iconColor: theme.colors.status.danger,
                bgColor: theme.colors.status.dangerSubtle,
                route: 'DayOff',
            },
            {
                id: 'calendar',
                title: t('schedule_calendar', 'Schedule Calendar'),
                subtitle: t('shifts_and_holidays', 'Shifts & Holidays'),
                icon: Calendar,
                iconColor: theme.colors.status.cyan,
                bgColor: theme.colors.status.cyanSubtle,
                route: 'CalendarTab',
            },
            {
                id: 'quizzes',
                title: t('quizzes', 'Quizzes'),
                subtitle: t('training_and_tests', 'Training & Tests'),
                icon: Award,
                iconColor: theme.colors.status.info,
                bgColor: theme.colors.status.infoSubtle,
                route: 'QuizList',
            },
        ];

        if (employeeInfo?.is_top_management || (employeeInfo?.subordinates_count ?? 0) > 0) {
            actions.push({
                id: 'subordinate_notices',
                title: t('staff_notices', 'Staff Notices'),
                subtitle: t('subordinate_feed', 'Subordinate Feed'),
                icon: FileText,
                iconColor: theme.colors.status.pink,
                bgColor: theme.colors.status.pinkSubtle,
                route: 'SubordinateNotices',
            });
        }

        return actions;
    }, [theme, t, employeeInfo?.is_top_management, employeeInfo?.subordinates_count]);

    return {
        isLoading,
        isFetching,
        onRefresh,
        displayName,
        avatarUrl,
        showAvatarImage,
        setAvatarLoadError,
        getGreeting,
        unreadNotifications,
        topBannerAnnouncement,
        handleDismissTopBanner,
        todayDisplayDate,
        locale,
        timelineNodes,
        isSplitShift,
        out1,
        in2,
        out2,
        proactiveStatus,
        shiftPhase,
        quickActions,
        announcements,
        celebration,
    };
}
