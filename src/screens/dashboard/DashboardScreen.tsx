import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { AppText as Text } from '../../components/AppText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppShell } from '../../components/common/AppShell';
import { HeaderIconButton } from '../../components/common/AppHeader';
import { DashboardSkeleton } from '../../components/common/Skeletons';
import { DigitalClock } from '../../components/dashboard/DigitalClock';
import { useAttendanceGuard } from '../../hooks/useAttendanceGuard';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/client';
import {
    QrCode,
    Calendar,
    CalendarOff,
    FileText,
    Activity,
    Bell,
    Gift,
    Award,
    Clock,
    ChevronRight,
    CheckCircle2,
    Sun,
    Moon,
    History,
    Settings,
    AlertTriangle,
    X,
    Check,
    Coffee,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format, formatDateDisplay, formatTimeDisplay, parseDateOnly } from '../../utils/dateTime';
import { getDismissedBannerIds, dismissBannerId } from '../../utils/storage';

import { useTranslation } from '../../context/LanguageContext';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { user } = useAuth();
    const { isDark, toggleTheme } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;

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
        queryKey: ['dashboardBootstrap'],
        queryFn: async () => {
            const response = await apiClient.get('/employee-app/bootstrap');
            return response.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days offline retention
    });

    // ── Resilient Data Extraction from Bootstrap Object ──────────────────────
    const dashboard = bootstrapData?.dashboard || bootstrapData || {};
    const employeeInfo = dashboard?.employee || bootstrapData?.employee || null;
    const todayShiftMerged = dashboard?.today_shift || bootstrapData?.today_shift || bootstrapData?.todayShiftMerged || null;
    const attendanceToday = todayShiftMerged?.attendance_today || dashboard?.today_attendance || bootstrapData?.today_attendance || null;
    const shiftData = todayShiftMerged?.shift || dashboard?.shift || bootstrapData?.today_shift || null;
    const announcements = Array.isArray(dashboard?.announcements)
        ? dashboard.announcements
        : Array.isArray(bootstrapData?.announcements)
        ? bootstrapData.announcements
        : [];
    const celebration = dashboard?.celebration || bootstrapData?.today_celebration || bootstrapData?.today_celebrations || null;
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

    // Navigate to scanner — ScanAttendanceScreen owns all guard/reason logic
    const handleScanPress = () => {
        navigation.navigate('ScanTab');
    };

    // Timeline Nodes (2 for regular shift, 4 for split shift)
    const timelineNodes = useMemo(() => {
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

    // Screen Focus Auto-Refresh: Guarantees immediate update after scanning
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const onRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('good_morning', 'Good Morning');
        if (hour < 18) return t('good_afternoon', 'Good Afternoon');
        return t('good_evening', 'Good Evening');
    };

    const topBannerAnnouncement = announcements.find((item: any) => {
        const idStr = String(item.id || item.title || item.pwa_title || '');
        if (dismissedBannerIds.includes(idStr)) return false;
        return item.pwa_display_type === 'top_banner' || item.is_pinned || item.is_urgent;
    });

    const handleDismissTopBanner = async (item: any) => {
        const idStr = String(item.id || item.title || item.pwa_title || '');
        setDismissedBannerIds((prev) => [...prev, idStr]);
        await dismissBannerId(idStr);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const displayName = employeeInfo?.full_name || user?.name || t('employee', 'Employee');
    const displayRole = employeeInfo?.designation || user?.position || t('staff', 'Staff');

    const rawAvatarUrl = employeeInfo?.profile_image_url || user?.avatar;
    const avatarUrl = typeof rawAvatarUrl === 'string' && rawAvatarUrl.trim().length > 0 && rawAvatarUrl !== 'null' && rawAvatarUrl !== 'undefined'
        ? rawAvatarUrl.trim()
        : null;
    const showAvatarImage = !!avatarUrl && !avatarLoadError;


    // ── Dynamic Quick Actions with 100% PWA parity ────────────────────────────
    const quickActions = [
        {
            id: 'attendance',
            title: t('attendance_log', 'Attendance Log'),
            subtitle: t('past_punch_records', 'Past Punch Records'),
            icon: History,
            iconColor: '#10B981',
            bgColor: 'rgba(16, 185, 129, 0.12)',
            route: 'History',
        },
        {
            id: 'activity',
            title: t('activity_log', 'Activity Log'),
            subtitle: t('log_daily_tasks', 'Log Daily Tasks'),
            icon: Activity,
            iconColor: '#F97316',
            bgColor: 'rgba(249, 115, 22, 0.12)',
            route: 'CreateActivity',
        },
        {
            id: 'leave',
            title: t('leave_requests', 'Leave Requests'),
            subtitle: t('apply_and_balances', 'Apply & Balances'),
            icon: Calendar,
            iconColor: '#8B5CF6',
            bgColor: 'rgba(139, 92, 246, 0.12)',
            route: 'CreateLeave',
        },
        {
            id: 'day_off',
            title: t('day_off', 'Day Off'),
            subtitle: t('rest_schedule', 'Rest Schedule'),
            icon: CalendarOff,
            iconColor: '#EF4444',
            bgColor: 'rgba(239, 68, 68, 0.12)',
            route: 'DayOff',
        },
        {
            id: 'calendar',
            title: t('schedule_calendar', 'Schedule Calendar'),
            subtitle: t('shifts_and_holidays', 'Shifts & Holidays'),
            icon: Calendar,
            iconColor: '#0EA5E9',
            bgColor: 'rgba(14, 165, 233, 0.12)',
            route: 'CalendarTab',
        },
        {
            id: 'quizzes',
            title: t('quizzes', 'Quizzes'),
            subtitle: t('training_and_tests', 'Training & Tests'),
            icon: Award,
            iconColor: '#6366F1',
            bgColor: 'rgba(99, 102, 241, 0.12)',
            route: 'QuizList',
        },
    ];

    // Conditionally render Staff Notices for Managers / Top Management
    if (employeeInfo?.is_top_management || (employeeInfo?.subordinates_count ?? 0) > 0) {
        quickActions.push({
            id: 'subordinate_notices',
            title: t('staff_notices', 'Staff Notices'),
            subtitle: t('subordinate_feed', 'Subordinate Feed'),
            icon: FileText,
            iconColor: '#D946EF',
            bgColor: 'rgba(217, 70, 239, 0.12)',
            route: 'SubordinateNotices',
        });
    }

    const bannerSubHeader = topBannerAnnouncement ? (
        <View style={styles.topBanner}>
            <View style={styles.topBannerLeft}>
                <AlertTriangle color="#FFFFFF" size={16} />
                <Text style={styles.topBannerTitle} numberOfLines={1}>
                    {topBannerAnnouncement.title || topBannerAnnouncement.pwa_title}
                </Text>
            </View>
            <View style={styles.topBannerRightGroup}>
                <TouchableOpacity
                    onPress={() => navigation.navigate('AnnouncementDetail', { id: topBannerAnnouncement.id })}
                    style={styles.topBannerBtn}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="View announcement"
                >
                    <Text style={styles.topBannerBtnText}>{t('view', 'View')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleDismissTopBanner(topBannerAnnouncement)}
                    style={styles.topBannerCloseBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss announcement banner permanently"
                >
                    <X color="#FFFFFF" size={14} />
                </TouchableOpacity>
            </View>
        </View>
    ) : undefined;

    return (
        <AppShell
            showHeader={false}
            subHeader={bannerSubHeader}
            hasTabBar={true}
            refreshing={isFetching && !isLoading}
            onRefresh={onRefresh}
        >
            {isLoading ? (
                <DashboardSkeleton />
            ) : (
                <>
                {/* User Greeting & Header Actions */}
                <View style={styles.headerRow}>
                    <View style={styles.userProfileGroup}>
                        {showAvatarImage ? (
                            <Image
                                source={{ uri: avatarUrl! }}
                                style={styles.avatarImage}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                onError={() => setAvatarLoadError(true)}
                            />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarText}>
                                    {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                                </Text>
                            </View>
                        )}
                        <View style={styles.greetingTextContainer}>
                            <Text style={styles.greetingSubtitle} numberOfLines={1}>
                                {getGreeting()}
                            </Text>
                            <Text variant="h2" style={styles.greetingTitle} numberOfLines={1}>
                                {displayName}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.headerActionsGroup}>
                        <HeaderIconButton
                            icon={isDark ? <Sun color="#F59E0B" size={18} /> : <Moon color="#2563EB" size={18} />}
                            onPress={toggleTheme}
                            accessibilityLabel="Toggle theme"
                        />

                        <HeaderIconButton
                            icon={<Bell color={theme.colors.textPrimary} size={18} />}
                            onPress={() => navigation.navigate('Notifications')}
                            accessibilityLabel="Notifications"
                            badge={unreadNotifications > 0 ? (unreadNotifications > 9 ? '9+' : unreadNotifications) : undefined}
                            style={{ marginLeft: 8 }}
                        />
                    </View>
                </View>

                {/* Digital Clock & Geofenced Attendance Status Card */}
                <View style={styles.clockCard}>
                    <DigitalClock style={styles.digitalClockText} />

                    {/* Date sits as a centered subtitle below the hero clock */}
                    <View style={styles.clockHeader}>
                        <Clock color={theme.colors.primary} size={14} />
                        <Text style={styles.dateText}>
                            {formatDateDisplay(todayDisplayDate, 'full')}
                        </Text>
                    </View>

                    {/* Timeline Nodes (2 for regular shift, 4 for split shift) */}
                    <View style={styles.timelineContainer}>
                        {/* Connecting Track Line */}
                        <View
                            style={[
                                styles.timelineTrackBackground,
                                isSplitShift ? styles.timelineTrackSplit : styles.timelineTrackContinuous,
                            ]}
                        />
                        <View
                            style={[
                                styles.timelineTrackActive,
                                isSplitShift ? styles.timelineTrackSplit : styles.timelineTrackContinuous,
                                {
                                    width: isSplitShift
                                        ? out2
                                            ? '75%'
                                            : in2
                                            ? '50%'
                                            : out1
                                            ? '25%'
                                            : '0%'
                                        : (out2 || out1)
                                        ? '50%'
                                        : '0%',
                                },
                            ]}
                        />

                        {/* Nodes Row */}
                        <View style={styles.timelineNodesRow}>
                            {timelineNodes.map((node) => (
                                <View key={node.key} style={styles.timelineNodeCol}>
                                    <View
                                        style={[
                                            styles.nodeCircle,
                                            node.active && styles.nodeCircleActive,
                                            node.isCurrent && styles.nodeCircleCurrent,
                                        ]}
                                    >
                                        {node.active ? (
                                            <Check color="#FFFFFF" size={13} strokeWidth={3} />
                                        ) : (
                                            <View
                                                style={[
                                                    styles.nodeDot,
                                                    node.isCurrent && styles.nodeDotCurrent,
                                                ]}
                                            />
                                        )}
                                    </View>
                                    <Text
                                        style={[
                                            styles.nodeLabel,
                                            node.active && styles.nodeLabelActive,
                                            node.isCurrent && styles.nodeLabelCurrent,
                                        ]}
                                    >
                                        {node.label}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.nodeTime,
                                            node.active && styles.nodeTimeActive,
                                        ]}
                                    >
                                        {node.time || '--:--'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Proactive Guard Notice if Late Arrival or Early Departure Detected */}
                    {proactiveStatus?.require_reason && shiftPhase !== 'done' && (
                        <View style={styles.proactiveWarningBox}>
                            <AlertTriangle color="#D97706" size={14} />
                            <Text style={styles.proactiveWarningText}>
                                {proactiveStatus.type === 'late'
                                    ? `${t('late_warning', 'Late arrival')} (~${proactiveStatus.minutes}m). ${t('reason_required_prior_scan', 'Reason required before scanning.')}`
                                    : `${t('early_warning', 'Early departure')} (~${proactiveStatus.minutes}m). ${t('reason_required_prior_scan', 'Reason required before scanning.')}`}
                            </Text>
                        </View>
                    )}

                    {/* Contextual Smart Action Button */}
                    <TouchableOpacity
                        style={[
                            styles.clockButton,
                            shiftPhase === 'done' && styles.clockButtonDone,
                            shiftPhase === 'break' && styles.clockButtonBreak,
                        ]}
                        onPress={handleScanPress}
                        activeOpacity={0.85}
                    >
                        {shiftPhase === 'ready' && <QrCode color="#FFFFFF" size={20} />}
                        {shiftPhase === 'session1' && (isSplitShift ? <Coffee color="#FFFFFF" size={20} /> : <Moon color="#FFFFFF" size={20} />)}
                        {shiftPhase === 'break' && <Sun color="#FFFFFF" size={20} />}
                        {shiftPhase === 'session2' && <Moon color="#FFFFFF" size={20} />}
                        {shiftPhase === 'done' && <CheckCircle2 color="#FFFFFF" size={20} />}
                        <Text style={styles.clockButtonText}>
                            {shiftPhase === 'ready'
                                ? t('scan_clock_in_now', 'Scan Clock In Now')
                                : shiftPhase === 'session1'
                                ? isSplitShift
                                    ? t('scan_lunch_out', 'Scan Lunch Out')
                                    : t('scan_clock_out', 'Scan Clock Out')
                                : shiftPhase === 'break'
                                ? t('scan_afternoon_in', 'Scan Afternoon In')
                                : shiftPhase === 'session2'
                                ? t('scan_clock_out', 'Scan Clock Out')
                                : t('shift_completed', 'Shift Completed')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Dynamic Quick Access Menu matching PWA parity */}
                <Text style={styles.sectionTitle}>{t('quick_actions', 'Quick Actions')}</Text>
                <View style={styles.quickGrid}>
                    {quickActions.map((action) => {
                        const IconComponent = action.icon;
                        return (
                            <TouchableOpacity
                                key={action.id}
                                style={styles.gridTile}
                                onPress={() => navigation.navigate(action.route)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.tileIconContainer, { backgroundColor: action.bgColor }]}>
                                    <IconComponent color={action.iconColor} size={22} />
                                </View>
                                <Text style={styles.tileTitle}>{action.title}</Text>
                                <Text style={styles.tileSubtitle}>{action.subtitle}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Company Announcements Feed */}
                {announcements.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={styles.rowCentered}>
                                <Bell color={theme.colors.primary} size={18} />
                                <Text style={styles.sectionHeaderTitle}>
                                    {t('company_announcements', 'Company Announcements')}
                                </Text>
                            </View>
                        </View>

                        {announcements.slice(0, 3).map((item: any) => (
                            <TouchableOpacity
                                key={item.id || item.title}
                                style={styles.announcementCard}
                                onPress={() => navigation.navigate('AnnouncementDetail', { id: item.id })}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.announcementTitle}>
                                    {item.title || item.pwa_title}
                                </Text>
                                <Text style={styles.announcementSummary} numberOfLines={2}>
                                    {item.summary || item.content || item.description || t('tap_to_view_announcement', 'Tap to view announcement details.')}
                                </Text>
                                <View style={styles.announcementFooter}>
                                    <Text style={styles.announcementDate}>{item.created_at || t('company_news', 'Company News')}</Text>
                                    <ChevronRight color={theme.colors.textSecondary} size={16} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Celebrations Banner */}
                {celebration && (
                    <TouchableOpacity
                        style={styles.celebrationCard}
                        onPress={() => navigation.navigate('WishesInbox')}
                        activeOpacity={0.8}
                    >
                        <Gift color="#EC4899" size={26} />
                        <View style={styles.celebrationTextGroup}>
                            <Text style={styles.celebrationTitle}>
                                {celebration.message || celebration.title || celebration.milestone || t('work_celebration', 'Work Celebration!')}
                            </Text>
                            <Text style={styles.celebrationSubtitle}>
                                {t('tap_send_view_wishes', 'Tap to send or view celebratory wishes 🎉')}
                            </Text>
                        </View>
                        <ChevronRight color="#EC4899" size={18} />
                    </TouchableOpacity>
                )}
                </>
            )}

        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    topBanner: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    topBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: theme.spacing.xs,
    },
    topBannerTitle: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: theme.spacing.xs,
        flex: 1,
    },
    topBannerRightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    topBannerBtn: {
        backgroundColor: 'rgba(180, 83, 9, 0.6)',
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    topBannerBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    topBannerCloseBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.md + 4,
        paddingVertical: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.xs,
        marginBottom: theme.spacing.lg,
    },
    userProfileGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: theme.spacing.xs,
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: theme.borderRadius.full,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    avatarFallback: {
        width: 48,
        height: 48,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    greetingTextContainer: {
        marginLeft: theme.spacing.sm + 4,
        flex: 1,
        justifyContent: 'center',
    },
    greetingSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
        marginBottom: 2,
    },
    greetingTitle: {
        fontSize: 18,
        lineHeight: 26,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        paddingBottom: 2,
    },
    greetingRoleText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    headerActionsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginLeft: theme.spacing.xs + 2,
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        minWidth: 16,
        height: 16,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.status.danger,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 2,
    },
    notificationBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    clockCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg + 4,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        ...theme.shadows.xs,
    },
    clockHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginBottom: theme.spacing.md,
    },
    rowCentered: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    digitalClockText: {
        fontSize: 28,
        fontWeight: '900',
        color: theme.colors.textPrimary,
        letterSpacing: 1,
        marginVertical: theme.spacing.xs,
        textAlign: 'center',
        alignSelf: 'center',
    },
    timelineContainer: {
        width: '100%',
        marginVertical: theme.spacing.md,
        paddingTop: theme.spacing.xs,
        paddingBottom: theme.spacing.xs,
        position: 'relative',
        justifyContent: 'center',
    },
    timelineTrackBackground: {
        position: 'absolute',
        top: 18,
        height: 2,
        backgroundColor: theme.colors.border,
        zIndex: 1,
    },
    timelineTrackActive: {
        position: 'absolute',
        top: 18,
        height: 2,
        backgroundColor: theme.colors.status.success,
        zIndex: 2,
    },
    timelineTrackSplit: {
        left: '12.5%',
        right: '12.5%',
    },
    timelineTrackContinuous: {
        left: '25%',
        right: '25%',
    },
    timelineNodesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        zIndex: 3,
    },
    timelineNodeCol: {
        flex: 1,
        alignItems: 'center',
    },
    nodeCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    nodeCircleActive: {
        backgroundColor: theme.colors.status.success,
        borderColor: theme.colors.status.success,
        ...theme.shadows.xs,
    },
    nodeCircleCurrent: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 2,
    },
    nodeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.textSecondary,
        opacity: 0.35,
    },
    nodeDotCurrent: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.primary,
        opacity: 1,
    },
    nodeLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
        textAlign: 'center',
    },
    nodeLabelActive: {
        color: theme.colors.textPrimary,
        fontWeight: '900',
    },
    nodeLabelCurrent: {
        color: theme.colors.primary,
        fontWeight: '900',
    },
    nodeTime: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    nodeTimeActive: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    clockButton: {
        backgroundColor: theme.colors.primary,
        minHeight: 52,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.xs,
    },
    clockButtonBreak: {
        backgroundColor: '#F59E0B',
    },
    clockButtonDone: {
        backgroundColor: theme.colors.status.success,
    },
    proactiveWarningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        borderRadius: theme.borderRadius.sm,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 6,
        marginBottom: theme.spacing.xs + 2,
    },
    proactiveWarningText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#D97706',
        marginLeft: 6,
        flex: 1,
    },
    clockButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
        marginLeft: theme.spacing.sm,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm + 2,
    },
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    gridTile: {
        width: '48%',
        minHeight: 114,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    tileIconContainer: {
        width: 44,
        height: 44,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.sm + 2,
    },
    tileTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    tileSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    sectionContainer: {
        marginBottom: theme.spacing.lg,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm + 2,
    },
    sectionHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginLeft: theme.spacing.xs + 2,
    },
    announcementCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm + 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    announcementTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    announcementSummary: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    announcementFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.xs + 2,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    announcementDate: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    celebrationCard: {
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(236, 72, 153, 0.2)',
        marginBottom: theme.spacing.lg,
    },
    celebrationTextGroup: {
        flex: 1,
        marginLeft: theme.spacing.sm + 4,
    },
    celebrationTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#DB2777',
    },
    celebrationSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
}));
