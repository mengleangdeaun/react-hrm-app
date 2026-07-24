import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    RefreshControl,
    Image,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppShell } from '../../components/common/AppShell';
import { DashboardSkeleton } from '../../components/common/Skeletons';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/client';
import {
    QrCode,
    Calendar,
    FileText,
    Activity,
    Bell,
    Gift,
    Award,
    Clock,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Sun,
    Moon,
    History,
    Settings,
    Sparkles,
    AlertTriangle,
} from 'lucide-react-native';
import { format } from 'date-fns';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { user } = useAuth();
    const { isDark, toggleTheme } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const [currentTime, setCurrentTime] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Bootstrap State
    const [employeeInfo, setEmployeeInfo] = useState<any>(null);
    const [attendance, setAttendance] = useState<any>(null);
    const [shiftData, setShiftData] = useState<any>(null);
    const [daysPresent, setDaysPresent] = useState<number>(0);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [celebration, setCelebration] = useState<any>(null);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    const [isClockedIn, setIsClockedIn] = useState(false);
    const [clockInTime, setClockInTime] = useState<string | null>(null);
    const [clockOutTime, setClockOutTime] = useState<string | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await apiClient.get('/employee-app/bootstrap');
            const data = response.data;

            if (data?.employee) {
                setEmployeeInfo(data.employee);
            }

            const att = data?.today_attendance || data?.todayShiftMerged?.attendance_today;
            if (att) {
                setAttendance(att);
                const isCIn = !!(att.clock_in || att.in1) && !(att.clock_out || att.out1);
                setIsClockedIn(isCIn);

                const cInRaw = att.clock_in || att.in1;
                const cOutRaw = att.clock_out || att.out1;
                setClockInTime(cInRaw ? String(cInRaw).substring(0, 5) : null);
                setClockOutTime(cOutRaw ? String(cOutRaw).substring(0, 5) : null);
            } else {
                setIsClockedIn(false);
                setClockInTime(null);
                setClockOutTime(null);
            }

            const shift = data?.today_shift || data?.todayShiftMerged?.shift;
            if (shift) {
                setShiftData(shift);
            }

            if (typeof data?.days_present_this_week === 'number') {
                setDaysPresent(data.days_present_this_week);
            }

            if (Array.isArray(data?.announcements)) {
                setAnnouncements(data.announcements);
            }

            if (data?.celebration || data?.celebrations) {
                setCelebration(data.celebration || data.celebrations);
            }

            if (typeof data?.unread_notifications_count === 'number') {
                setUnreadNotifications(data.unread_notifications_count);
            }
        } catch (error) {
            console.warn('Dashboard fetch error:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const topBannerAnnouncement = announcements.find(
        (item) => item.pwa_display_type === 'top_banner' || item.is_pinned || item.is_urgent
    );

    const displayName = employeeInfo?.full_name || user?.name || 'Employee';
    const displayRole = employeeInfo?.designation || user?.position || 'Staff';
    const shiftName = shiftData?.name || 'Standard Shift';
    const shiftSchedule = shiftData?.start_time && shiftData?.end_time
        ? `${shiftData.start_time.substring(0, 5)} - ${shiftData.end_time.substring(0, 5)}`
        : '08:00 - 17:00';

    return (
        <AppShell showHeader={false} refreshing={refreshing} onRefresh={onRefresh}>
            {topBannerAnnouncement && (
                <View style={styles.topBanner}>
                    <View style={styles.topBannerLeft}>
                        <AlertTriangle color="#FFFFFF" size={16} />
                        <Text style={styles.topBannerTitle} numberOfLines={1}>
                            {topBannerAnnouncement.title || topBannerAnnouncement.pwa_title}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('AnnouncementDetail', { id: topBannerAnnouncement.id })}
                        style={styles.topBannerBtn}
                    >
                        <Text style={styles.topBannerBtnText}>View</Text>
                    </TouchableOpacity>
                </View>
            )}

            {isLoading ? (
                <DashboardSkeleton />
            ) : (
                <>
                {/* User Greeting & Header Actions */}
                <View style={styles.headerRow}>
                    <View style={styles.userProfileGroup}>
                        {employeeInfo?.profile_image_url || user?.avatar ? (
                            <Image
                                source={{ uri: employeeInfo?.profile_image_url || user?.avatar }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarText}>
                                    {displayName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={styles.greetingTextContainer}>
                            <Text style={styles.greetingSubtitle}>
                                {getGreeting()}
                            </Text>
                            <Text style={styles.greetingTitle} numberOfLines={1}>
                                {displayName}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.headerActionsGroup}>
                        <TouchableOpacity
                            onPress={toggleTheme}
                            style={styles.iconButton}
                            activeOpacity={0.7}
                        >
                            {isDark ? <Sun color="#F59E0B" size={20} /> : <Moon color="#2563EB" size={20} />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => navigation.navigate('Notifications')}
                            activeOpacity={0.7}
                        >
                            <Bell color={theme.colors.textPrimary} size={20} />
                            {unreadNotifications > 0 && (
                                <View style={styles.notificationBadge}>
                                    <Text style={styles.notificationBadgeText}>
                                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Digital Clock & Geofenced Attendance Status Card */}
                <View style={styles.clockCard}>
                    <View style={styles.clockHeader}>
                        <View style={styles.rowCentered}>
                            <Clock color={theme.colors.primary} size={16} />
                            <Text style={styles.dateText}>
                                {format(currentTime, 'EEEE, dd MMM yyyy')}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.statusBadge,
                                isClockedIn
                                    ? styles.statusBadgeClockedIn
                                    : clockOutTime
                                    ? styles.statusBadgeClockedOut
                                    : styles.statusBadgeNotClockedIn,
                            ]}
                        >
                            {isClockedIn ? (
                                <CheckCircle2 color={theme.colors.status.success} size={13} />
                            ) : (
                                <XCircle color={clockOutTime ? theme.colors.primary : theme.colors.status.danger} size={13} />
                            )}
                            <Text
                                style={[
                                    styles.statusBadgeText,
                                    {
                                        color: isClockedIn
                                            ? theme.colors.status.success
                                            : clockOutTime
                                            ? theme.colors.primary
                                            : theme.colors.status.danger,
                                    },
                                ]}
                            >
                                {isClockedIn ? 'CLOCKED IN' : clockOutTime ? 'CLOCKED OUT' : 'NOT CLOCKED IN'}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.digitalClockText}>
                        {format(currentTime, 'hh:mm a')}
                    </Text>

                    {/* Attendance Info Details */}
                    <View style={styles.attendanceDetailsRow}>
                        <View>
                            <Text style={styles.detailLabel}>Clock In</Text>
                            <Text style={styles.detailValue}>
                                {clockInTime || '--:--'}
                            </Text>
                        </View>

                        <View style={styles.itemsCenter}>
                            <Text style={styles.detailLabel}>Clock Out</Text>
                            <Text style={styles.detailValue}>
                                {clockOutTime || '--:--'}
                            </Text>
                        </View>

                        {daysPresent > 0 && (
                            <View style={styles.itemsEnd}>
                                <Text style={styles.detailLabel}>This Week</Text>
                                <View style={styles.rowCentered}>
                                    <Sparkles color={theme.colors.status.success} size={12} />
                                    <Text style={styles.daysPresentText}>
                                        {daysPresent} Days
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.clockButton}
                        onPress={() => navigation.navigate('ScanTab')}
                        activeOpacity={0.85}
                    >
                        <QrCode color="#FFFFFF" size={20} />
                        <Text style={styles.clockButtonText}>
                            {isClockedIn ? 'Scan Clock Out' : 'Scan Clock In Now'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 8-Tile Quick Access Menu */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickGrid}>
                    <TouchableOpacity
                        style={styles.gridTile}
                        onPress={() => navigation.navigate('LeaveList')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.tileIconContainer, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
                            <Calendar color="#2563EB" size={22} />
                        </View>
                        <Text style={styles.tileTitle}>Leave Requests</Text>
                        <Text style={styles.tileSubtitle}>Apply & Balances</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.gridTile}
                        onPress={() => navigation.navigate('ActivityList')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.tileIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <Activity color="#10B981" size={22} />
                        </View>
                        <Text style={styles.tileTitle}>Activity Log</Text>
                        <Text style={styles.tileSubtitle}>Log Daily Tasks</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.gridTile}
                        onPress={() => navigation.navigate('HistoryTab')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.tileIconContainer, { backgroundColor: 'rgba(6, 182, 212, 0.1)' }]}>
                            <History color="#06B6D4" size={22} />
                        </View>
                        <Text style={styles.tileTitle}>Attendance Log</Text>
                        <Text style={styles.tileSubtitle}>Past Punch Records</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.gridTile}
                        onPress={() => navigation.navigate('CalendarTab')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.tileIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                            <Calendar color="#6366F1" size={22} />
                        </View>
                        <Text style={styles.tileTitle}>Schedule Calendar</Text>
                        <Text style={styles.tileSubtitle}>Shifts & Holidays</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.gridTile}
                        onPress={() => navigation.navigate('SubordinateNotices')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.tileIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                            <FileText color="#F59E0B" size={22} />
                        </View>
                        <Text style={styles.tileTitle}>Team Notices</Text>
                        <Text style={styles.tileSubtitle}>Subordinate Feed</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.gridTile}
                        onPress={() => navigation.navigate('QuizList')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.tileIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                            <Award color="#8B5CF6" size={22} />
                        </View>
                        <Text style={styles.tileTitle}>Quizzes</Text>
                        <Text style={styles.tileSubtitle}>Training & Tests</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.gridTile}
                        onPress={() => navigation.navigate('WishesInbox')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.tileIconContainer, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                            <Gift color="#EC4899" size={22} />
                        </View>
                        <Text style={styles.tileTitle}>Celebrations</Text>
                        <Text style={styles.tileSubtitle}>Wishes & Milestones</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.gridTile}
                        onPress={() => navigation.navigate('Settings')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.tileIconContainer, { backgroundColor: 'rgba(100, 116, 139, 0.1)' }]}>
                            <Settings color="#64748B" size={22} />
                        </View>
                        <Text style={styles.tileTitle}>App Settings</Text>
                        <Text style={styles.tileSubtitle}>Theme & Account</Text>
                    </TouchableOpacity>
                </View>

                {/* Company Announcements Feed */}
                {announcements.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={styles.rowCentered}>
                                <Bell color={theme.colors.primary} size={18} />
                                <Text style={styles.sectionHeaderTitle}>
                                    Company Announcements
                                </Text>
                            </View>
                        </View>

                        {announcements.slice(0, 3).map((item) => (
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
                                    {item.summary || item.content || item.description || 'Tap to view announcement details.'}
                                </Text>
                                <View style={styles.announcementFooter}>
                                    <Text style={styles.announcementDate}>{item.created_at || 'Company News'}</Text>
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
                                {celebration.message || celebration.title || celebration.milestone || 'Work Celebration!'}
                            </Text>
                            <Text style={styles.celebrationSubtitle}>
                                Tap to send or view celebratory wishes 🎉
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
    topBannerBtn: {
        backgroundColor: 'rgba(180, 83, 9, 0.5)',
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
    },
    greetingSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    greetingTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
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
        ...theme.shadows.sm,
    },
    clockHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    rowCentered: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginLeft: theme.spacing.xs + 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
    },
    statusBadgeClockedIn: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    statusBadgeClockedOut: {
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(37, 99, 235, 0.2)',
    },
    statusBadgeNotClockedIn: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        marginLeft: theme.spacing.xs,
    },
    digitalClockText: {
        fontSize: 28,
        fontWeight: '900',
        color: theme.colors.textPrimary,
        letterSpacing: 1,
        marginVertical: theme.spacing.xs,
    },
    attendanceDetailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: theme.spacing.sm,
        paddingTop: theme.spacing.sm + 2,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    detailLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginTop: 2,
    },
    itemsCenter: {
        alignItems: 'center',
    },
    itemsEnd: {
        alignItems: 'flex-end',
    },
    daysPresentText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.status.success,
        marginLeft: theme.spacing.xs,
    },
    clockButton: {
        backgroundColor: theme.colors.primary,
        height: 52,
        borderRadius: theme.borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.xs,
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
        marginBottom: theme.spacing.lg,
    },
    gridTile: {
        width: '48%',
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
