import React, { useState, useRef } from 'react';
import {
    View,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Modal,
    ScrollView,
    Animated,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../../components/common/AppShell';
import { HeaderIconButton } from '../../components/common/AppHeader';
import { AttendanceHistorySkeleton } from '../../components/common/Skeletons';
import { attendanceApi, HistoryRecord } from '../../api/attendance';
import { useAppTheme } from '../../context/ThemeContext';
import {
    Calendar,
    CheckCircle2,
    AlertTriangle,
    ArrowDownLeft,
    ArrowUpRight,
    Filter,
    X,
    Clock,
    Sparkles,
    Coffee,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';

import { useTranslation } from '../../context/LanguageContext';

export const AUDIT_CATEGORIES = [
    { id: 'all', keyName: 'all_logs', fallback: 'All Logs' },
    { id: 'early_in', keyName: 'early_in', fallback: 'Early In', key: 'in_status', value: 'Early' },
    { id: 'late_in', keyName: 'late_in', fallback: 'Late In', key: 'in_status', value: 'Late' },
    { id: 'early_departure', keyName: 'early_depart', fallback: 'Early Depart', key: 'out_status', value: 'Early' },
    { id: 'stay_late', keyName: 'stay_late', fallback: 'Stay Late', key: 'out_status', value: 'Stay Late' },
    { id: 'overtime', keyName: 'overtime', fallback: 'Overtime', key: 'out_status', value: 'Overtime' },
];

export const HistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const queryClient = useQueryClient();

    // Applied Filters
    const currentMonthStr = format(new Date(), 'yyyy-MM');
    const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>(''); // YYYY-MM

    // 5-Minute In-Memory & Persistent Caching for Attendance History
    const {
        data: historyLogs = [],
        isLoading,
        isFetching,
    } = useQuery<HistoryRecord[]>({
        queryKey: ['attendanceHistory', selectedMonth, selectedQuickFilter],
        queryFn: async () => {
            try {
                const params: any = {};
                if (selectedMonth) params.month = selectedMonth;

                const categoryObj = AUDIT_CATEGORIES.find((c) => c.id === selectedQuickFilter);
                if (categoryObj && (categoryObj as any).key && (categoryObj as any).value) {
                    params[(categoryObj as any).key] = (categoryObj as any).value;
                }

                const data = await attendanceApi.getHistory(params);
                const records: HistoryRecord[] = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.records)
                    ? data.records
                    : Array.isArray(data?.data)
                    ? data.data
                    : [];

                return records;
            } catch (error) {
                console.warn('Failed to fetch attendance history:', error);
                return [];
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    const onRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ['attendanceHistory'] });
    };

    // Advanced Filter Modal Draft State
    const [draftQuickFilter, setDraftQuickFilter] = useState<string>('all');
    const [draftMonth, setDraftMonth] = useState<string>('');
    const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);

    // Smart Animated Tab Bar Scroll Hide/Show State
    const tabBarAnim = useRef(new Animated.Value(1)).current;
    const isTabBarHiddenRef = useRef<boolean>(false);
    const lastScrollY = useRef<number>(0);

    const handleScroll = (event: any) => {
        const currentY = event?.nativeEvent?.contentOffset?.y || 0;
        const diff = currentY - lastScrollY.current;

        if (Math.abs(diff) < 8) return;

        if (currentY <= 20) {
            if (isTabBarHiddenRef.current) {
                isTabBarHiddenRef.current = false;
                Animated.timing(tabBarAnim, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: false,
                }).start();
            }
        } else if (diff > 12) {
            // Scroll down -> hide smoothly
            if (!isTabBarHiddenRef.current) {
                isTabBarHiddenRef.current = true;
                Animated.timing(tabBarAnim, {
                    toValue: 0,
                    duration: 220,
                    useNativeDriver: false,
                }).start();
            }
        } else if (diff < -12) {
            // Scroll up -> show smoothly
            if (isTabBarHiddenRef.current) {
                isTabBarHiddenRef.current = false;
                Animated.timing(tabBarAnim, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: false,
                }).start();
            }
        }

        lastScrollY.current = currentY;
    };

    const openFilterModal = () => {
        setDraftQuickFilter(selectedQuickFilter);
        setDraftMonth(selectedMonth);
        setFilterModalVisible(true);
    };

    const handleApplyFilters = () => {
        setSelectedQuickFilter(draftQuickFilter);
        setSelectedMonth(draftMonth);
        setFilterModalVisible(false);
    };

    const handleResetFilters = () => {
        setDraftQuickFilter('all');
        setDraftMonth('');
        setSelectedQuickFilter('all');
        setSelectedMonth('');
        setFilterModalVisible(false);
    };

    const getMonthOptions = () => {
        const months = [];
        const now = new Date();
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = format(d, 'yyyy-MM');
            const label = format(d, 'MMMM yyyy');
            months.push({ value, label });
        }
        return months;
    };

    const formatTimeString = (isoOrTimeStr?: string | null) => {
        if (!isoOrTimeStr) return '--:--';
        try {
            if (isoOrTimeStr.includes('T')) {
                return format(parseISO(isoOrTimeStr), 'hh:mm a');
            }
            return isoOrTimeStr.substring(0, 5);
        } catch (e) {
            return String(isoOrTimeStr).substring(0, 5);
        }
    };

    const formatDateHeader = (dateStr: string) => {
        try {
            return format(parseISO(dateStr), 'EEEE, dd MMM yyyy');
        } catch (e) {
            return dateStr;
        }
    };

    const renderItem = ({ item }: { item: HistoryRecord }) => {
        const isLate = (item.late_minutes || 0) > 0 || item.in_status?.toLowerCase() === 'late';
        const hasOvertime = (item.overtime_minutes || 0) > 0;
        const hasEarlyLeave = (item.early_departure_minutes || 0) > 0;
        const isActiveSession = item.clock_in_time && !item.clock_out_time;

        const hasSplitShift = !!(item.session_1_out_time || item.session_2_in_time);

        return (
            <View style={styles.card}>
                {/* Card Header: Date */}
                <View style={styles.cardHeader}>
                    <View style={styles.dateGroup}>
                        <Calendar color={theme.colors.primary} size={16} />
                        <Text style={styles.dateText}>{formatDateHeader(item.date)}</Text>
                    </View>
                </View>

                {/* Session 1 Row */}
                <View style={styles.sessionBox}>
                    <View style={styles.sessionItem}>
                        <View style={styles.rowCentered}>
                            <ArrowDownLeft color={theme.colors.status.success} size={16} />
                            <Text style={styles.sessionLabel}>{t('clock_in', 'Clock In')}</Text>
                        </View>
                        <Text style={styles.sessionValue}>{formatTimeString(item.clock_in_time)}</Text>
                    </View>

                    <View style={styles.sessionDivider} />

                    <View style={styles.sessionItem}>
                        <View style={styles.rowCentered}>
                            <ArrowUpRight color={theme.colors.status.danger} size={16} />
                            <Text style={styles.sessionLabel}>
                                {hasSplitShift ? t('session_1_out', 'Session 1 Out') : t('clock_out', 'Clock Out')}
                            </Text>
                        </View>
                        <Text style={styles.sessionValue}>
                            {formatTimeString(hasSplitShift ? item.session_1_out_time : item.clock_out_time)}
                        </Text>
                    </View>
                </View>

                {/* Split Shift / Break Indicator */}
                {hasSplitShift && (
                    <View style={styles.splitBreakRow}>
                        <View style={styles.breakLine} />
                        <View style={styles.breakPill}>
                            <Coffee color={theme.colors.textSecondary} size={12} />
                            <Text style={styles.breakPillText}>{t('lunch_break', 'Lunch Break')}</Text>
                        </View>
                        <View style={styles.breakLine} />
                    </View>
                )}

                {/* Session 2 Row (If Split Shift) */}
                {hasSplitShift && (
                    <View style={[styles.sessionBox, { marginTop: theme.spacing.xs }]}>
                        <View style={styles.sessionItem}>
                            <View style={styles.rowCentered}>
                                <ArrowDownLeft color={theme.colors.status.success} size={16} />
                                <Text style={styles.sessionLabel}>{t('session_2_in', 'Session 2 In')}</Text>
                            </View>
                            <Text style={styles.sessionValue}>{formatTimeString(item.session_2_in_time)}</Text>
                        </View>

                        <View style={styles.sessionDivider} />

                        <View style={styles.sessionItem}>
                            <View style={styles.rowCentered}>
                                <ArrowUpRight color={theme.colors.status.danger} size={16} />
                                <Text style={styles.sessionLabel}>{t('clock_out', 'Clock Out')}</Text>
                            </View>
                            <Text style={styles.sessionValue}>{formatTimeString(item.clock_out_time)}</Text>
                        </View>
                    </View>
                )}

                {/* Footer Metrics & Deficit Chips */}
                <View style={styles.cardFooter}>
                    <View style={styles.rowCentered}>
                        {isLate && (
                            <View style={styles.lateChip}>
                                <Text style={styles.lateChipText}>-{item.late_minutes}m {t('late', 'Late')}</Text>
                            </View>
                        )}
                        {hasEarlyLeave && (
                            <View style={styles.earlyChip}>
                                <Text style={styles.earlyChipText}>-{item.early_departure_minutes}m {t('early_leave', 'Early Leave')}</Text>
                            </View>
                        )}
                        {hasOvertime && (
                            <View style={styles.overtimeChip}>
                                <Sparkles color={theme.colors.status.success} size={11} />
                                <Text style={styles.overtimeChipText}>+{item.overtime_minutes}m {t('ot', 'OT')}</Text>
                            </View>
                        )}
                    </View>

                    {item.working_hours && (
                        <Text style={styles.workingHoursText}>
                            {t('total', 'Total')}: <Text style={styles.workingHoursHighlight}>{item.working_hours}</Text>
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    const headerRight = (
        <HeaderIconButton
            icon={
                <Filter
                    color={
                        selectedMonth || selectedQuickFilter !== 'all'
                            ? theme.colors.brand
                            : theme.colors.textPrimary
                    }
                    size={18}
                />
            }
            onPress={openFilterModal}
            accessibilityLabel="Filter history"
        />
    );

    const subHeader = (
        <Animated.View
            style={[
                styles.tabBarContainer,
                {
                    opacity: tabBarAnim,
                    height: tabBarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 44],
                    }),
                    marginBottom: tabBarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 16],
                    }),
                    transform: [
                        {
                            translateY: tabBarAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-10, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabBarScrollContent}
            >
                {AUDIT_CATEGORIES.map((tab) => {
                    const isActive = selectedQuickFilter === tab.id;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.tabItem, isActive && styles.tabItemActive]}
                            onPress={() => setSelectedQuickFilter(tab.id)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                                {t(tab.keyName, tab.fallback)}
                            </Text>
                            {isActive && <View style={styles.tabIndicator} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );

    return (
        <AppShell
            title={t('attendance_history', 'Attendance History')}
            onBack={() => navigation?.goBack()}
            headerRight={headerRight}
            subHeader={subHeader}
            scrollable={false}
        >
            <View style={styles.container}>
                {/* Active Month Filter Chip Banner */}
                {selectedMonth ? (
                    <View style={styles.activeMonthChip}>
                        <Clock color="#FFFFFF" size={14} />
                        <Text style={styles.activeMonthChipText}>
                            {format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setSelectedMonth('')}
                            style={styles.activeMonthCloseBtn}
                            activeOpacity={0.7}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <X color="#FFFFFF" size={12} />
                        </TouchableOpacity>
                    </View>
                ) : null}

                {isLoading ? (
                    <AttendanceHistorySkeleton />
                ) : historyLogs.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Clock color={theme.colors.textSecondary} size={44} />
                        <Text style={styles.emptyTitle}>{t('no_history_records', 'No History Records')}</Text>
                        <Text style={styles.emptySubtitle}>{t('no_attendance_logs_period', 'No attendance logs found for this period.')}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={historyLogs}
                        keyExtractor={(item: HistoryRecord) => item.id?.toString() || item.date}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        refreshControl={
                            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                        }
                    />
                )}
            </View>

            {/* Filter Sheet Modal */}
            <Modal visible={filterModalVisible} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setFilterModalVisible(false)}
                >
                    <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('filter_history', 'Filter History')}</Text>
                            {(draftQuickFilter !== 'all' || draftMonth) ? (
                                <TouchableOpacity onPress={handleResetFilters}>
                                    <Text style={styles.resetBtnText}>{t('reset_all', 'Reset All')}</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                    <X color={theme.colors.textPrimary} size={20} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Review Month Picker */}
                        <Text style={styles.filterSectionLabel}>{t('review_month', 'Review Month')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthPillsRow}>
                            {getMonthOptions().map((m) => {
                                const isSel = draftMonth === m.value;
                                return (
                                    <TouchableOpacity
                                        key={m.value}
                                        style={[styles.monthPill, isSel && styles.monthPillSelected]}
                                        onPress={() => setDraftMonth(m.value)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.monthPillText, isSel && styles.monthPillTextSelected]}>
                                            {m.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Quick Filter Selection */}
                        <Text style={styles.filterSectionLabel}>Status Category</Text>
                        <View style={styles.quickFilterCol}>
                            {AUDIT_CATEGORIES.map((f) => {
                                const isSel = draftQuickFilter === f.id;
                                return (
                                    <TouchableOpacity
                                        key={f.id}
                                        style={[styles.filterOption, isSel && styles.filterOptionSelected]}
                                        onPress={() => setDraftQuickFilter(f.id)}
                                    >
                                        <Text style={[styles.filterOptionText, isSel && styles.filterOptionTextSelected]}>
                                            {t(f.keyName, f.fallback)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            style={styles.applyFilterBtn}
                            onPress={handleApplyFilters}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.applyFilterBtnText}>Apply Filter</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
    },
    iconButton: {
        width: 36,
        height: 36,
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabBarContainer: {
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        overflow: 'hidden',
    },
    tabBarScrollContent: {
        paddingHorizontal: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
    },
    tabItem: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm + 4,
        position: 'relative',
    },
    tabItemActive: {},
    tabItemText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    tabItemTextActive: {
        color: theme.colors.primary,
        fontWeight: '800',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: theme.spacing.md,
        right: theme.spacing.md,
        height: 2.5,
        backgroundColor: theme.colors.primary,
    },
    activeMonthChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 4,
        borderRadius: theme.borderRadius.full,
        alignSelf: 'flex-start',
        marginBottom: theme.spacing.md,
        gap: 8,
        ...theme.shadows.sm,
    },
    activeMonthChipText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    activeMonthCloseBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.sm,
    },
    emptySubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    listContent: {
        paddingBottom: theme.spacing.xl,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg + 4,
        padding: theme.spacing.md + 2,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        position: 'relative',
        overflow: 'hidden',
        ...theme.shadows.sm,
    },
    cardAccentBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm + 2,
    },
    dateGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginLeft: theme.spacing.xs + 2,
    },
    statusGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    pulseBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.xs + 4,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.full,
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.status.warning,
        marginRight: 4,
    },
    pulseText: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.colors.status.warning,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        marginLeft: 4,
    },
    sessionBox: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm + 2,
        alignItems: 'center',
    },
    sessionItem: {
        flex: 1,
    },
    sessionDivider: {
        width: 1,
        height: '80%',
        backgroundColor: theme.colors.border,
        marginHorizontal: theme.spacing.sm,
    },
    rowCentered: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sessionLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginLeft: 4,
    },
    sessionValue: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginTop: 2,
    },
    splitBreakRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: theme.spacing.xs,
    },
    breakLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.border,
    },
    breakPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.full,
        marginHorizontal: theme.spacing.xs,
    },
    breakPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        marginLeft: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: theme.spacing.sm + 2,
        paddingTop: theme.spacing.xs + 2,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    lateChip: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.xs + 4,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
        marginRight: theme.spacing.xs,
    },
    lateChipText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.status.warning,
    },
    earlyChip: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.xs + 4,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
        marginRight: theme.spacing.xs,
    },
    earlyChipText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.status.danger,
    },
    overtimeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.xs + 4,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
    },
    overtimeChipText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.status.success,
        marginLeft: 2,
    },
    workingHoursText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    workingHoursHighlight: {
        fontWeight: '700',
        color: theme.colors.primary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.lg + 4,
        borderTopRightRadius: theme.borderRadius.lg + 4,
        padding: theme.spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    resetBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.status.danger,
        textTransform: 'uppercase',
    },
    filterSectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: theme.spacing.xs + 2,
    },
    monthPillsRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing.md,
    },
    monthPill: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 4,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.xs + 2,
    },
    monthPillSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    monthPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    monthPillTextSelected: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    quickFilterCol: {
        marginBottom: theme.spacing.md,
    },
    filterOption: {
        paddingVertical: theme.spacing.sm + 2,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    filterOptionSelected: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
    },
    filterOptionText: {
        fontSize: 14,
        color: theme.colors.textPrimary,
    },
    filterOptionTextSelected: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    applyFilterBtn: {
        backgroundColor: theme.colors.primary,
        height: 48,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.md,
        ...theme.shadows.sm,
    },
    applyFilterBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
}));
