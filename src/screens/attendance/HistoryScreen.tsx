import React, { useState, useRef, useCallback, memo } from 'react';
import {
    View,
    TouchableOpacity,
    RefreshControl,
    Modal,
    ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { AppText as Text } from '../../components/AppText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { AppShell } from '../../components/common/AppShell';
import { HeaderIconButton } from '../../components/common/AppHeader';
import { AttendanceHistorySkeleton } from '../../components/common/Skeletons';
import { EmptyState } from '../../components/common/EmptyState';
import { AppBottomSheet } from '../../components/common/AppBottomSheet';
import { StatusBadge } from '../../components/common/StatusBadge';
import { attendanceApi, HistoryRecord } from '../../api/attendance';
import { queryKeys } from '../../api/queryKeys';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../context/ThemeContext';
import {
    Calendar,
    Check,
    CheckCircle2,
    AlertTriangle,
    ArrowDownLeft,
    ArrowUpRight,
    Filter,
    X,
    Clock,
    Sparkles,
    Coffee,
    LayoutList,
    AlarmClockCheck,
    AlarmClockOff,
    LogOut,
    Timer,
    Hourglass,
} from 'lucide-react-native';
import { format, formatDateDisplay, formatTimeDisplay } from '../../utils/dateTime';

import { useTranslation } from '../../context/LanguageContext';

interface HistoryItemCardProps {
    item: HistoryRecord;
    theme: any;
    styles: any;
    t: (key: string, fallback: string) => string;
    locale?: string;
}

const HistoryItemCard = memo(({ item, theme, styles, t, locale }: HistoryItemCardProps) => {
    const hasSplitShift = !!(item.session_1_out_time || item.session_2_in_time);

    return (
        <View style={styles.card}>
            {/* Card Header: Date & Status */}
            <View style={styles.cardHeader}>
                <View style={styles.dateGroup}>
                    <Calendar color={theme.colors.primary} size={16} />
                    <Text style={styles.dateText}>{formatDateDisplay(item.date, 'full', 'N/A', locale)}</Text>
                </View>
                <StatusBadge status={item.status || item.in_status || 'present'} size="sm" />
            </View>

            {/* Session 1 Row */}
            <View style={styles.sessionBox}>
                <View style={styles.sessionItem}>
                    <View style={styles.rowCentered}>
                        <ArrowDownLeft color={theme.colors.status.success} size={16} />
                        <Text style={styles.sessionLabel}>{t('clock_in', 'Clock In')}</Text>
                    </View>
                    <Text style={styles.sessionValue}>{formatTimeDisplay(item.clock_in_time)}</Text>
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
                        {formatTimeDisplay(hasSplitShift ? item.session_1_out_time : item.clock_out_time)}
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
                <View style={styles.sessionBox}>
                    <View style={styles.sessionItem}>
                        <View style={styles.rowCentered}>
                            <ArrowDownLeft color={theme.colors.status.success} size={16} />
                            <Text style={styles.sessionLabel}>{t('session_2_in', 'Session 2 In')}</Text>
                        </View>
                        <Text style={styles.sessionValue}>{formatTimeDisplay(item.session_2_in_time)}</Text>
                    </View>

                    <View style={styles.sessionDivider} />

                    <View style={styles.sessionItem}>
                        <View style={styles.rowCentered}>
                            <ArrowUpRight color={theme.colors.status.danger} size={16} />
                            <Text style={styles.sessionLabel}>{t('clock_out', 'Clock Out')}</Text>
                        </View>
                        <Text style={styles.sessionValue}>{formatTimeDisplay(item.clock_out_time)}</Text>
                    </View>
                </View>
            )}

            {/* Footer: Working Hours Total */}
            {item.working_hours && (
                <View style={styles.cardFooter}>
                    <Text style={styles.workingHoursText}>
                        {t('total', 'Total')}: <Text style={styles.workingHoursHighlight}>{item.working_hours}</Text>
                    </Text>
                </View>
            )}

        </View>
    );
});

export const AUDIT_CATEGORIES = [
    { id: 'all',              keyName: 'all_logs',      fallback: 'All Logs',      icon: LayoutList },
    { id: 'early_in',        keyName: 'early_in',      fallback: 'Early In',      icon: AlarmClockCheck,  key: 'in_status',  value: 'Early' },
    { id: 'late_in',         keyName: 'late_in',       fallback: 'Late In',       icon: AlarmClockOff,    key: 'in_status',  value: 'Late' },
    { id: 'early_departure', keyName: 'early_depart',  fallback: 'Early Depart',  icon: LogOut,           key: 'out_status', value: 'Early' },
    { id: 'stay_late',       keyName: 'stay_late',     fallback: 'Stay Late',     icon: Timer,            key: 'out_status', value: 'Stay Late' },
    { id: 'overtime',        keyName: 'overtime',      fallback: 'Overtime',      icon: Hourglass,        key: 'out_status', value: 'Overtime' },
];

export const HistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { isDark, primaryColor } = useAppTheme();
    const { t, locale } = useTranslation();
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
        isError,
        error,
        refetch,
    } = useQuery<HistoryRecord[]>({
        queryKey: queryKeys.attendance.history(selectedMonth, selectedQuickFilter),
        queryFn: async () => {
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
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const onRefresh = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
    }, [queryClient]);

    // Advanced Filter Modal Draft State
    const [draftQuickFilter, setDraftQuickFilter] = useState<string>('all');
    const [draftMonth, setDraftMonth] = useState<string>('');
    const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);

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

    const keyExtractor = useCallback((item: HistoryRecord) => item.id?.toString() || item.date, []);

    const renderItem = useCallback(
        ({ item }: { item: HistoryRecord }) => (
            <HistoryItemCard item={item} theme={theme} styles={styles} t={t} locale={locale} />
        ),
        [theme, styles, t, locale]
    );

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
        <View style={styles.tabBarContainer}>
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
        </View>
    );

    const listHeader = (
        <View style={selectedMonth ? styles.listHeaderActive : styles.listHeaderSpacer}>
            {Boolean(selectedMonth) && (
                <View style={styles.activeMonthChip}>
                    <Clock color="#FFFFFF" size={14} />
                    <Text style={styles.activeMonthChipText}>
                        {formatDateDisplay(selectedMonth + '-01', 'monthYear', 'N/A', locale)}
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
            )}
        </View>
    );

    const emptyStateComponent = isLoading ? (
        <AttendanceHistorySkeleton />
    ) : isError ? (
        <View style={styles.emptyContainer}>
            <EmptyState
                icon={<AlertTriangle color={theme.colors.status.danger} size={36} />}
                title={t('failed_to_load_history', 'Failed to Load History')}
                description={
                    error instanceof Error
                        ? error.message
                        : t('network_error_retry', 'Please check your connection and try again.')
                }
                actionTitle={t('retry', 'Retry')}
                onAction={() => refetch()}
            />
        </View>
    ) : (
        <View style={styles.emptyContainer}>
            <EmptyState
                icon={<Clock color={theme.colors.textSecondary} size={36} />}
                title={t('no_history_records', 'No History Records')}
                description={t('no_attendance_logs_period', 'No attendance logs found for this period.')}
                actionTitle={selectedMonth ? t('clear_filter', 'Clear Filter') : undefined}
                onAction={selectedMonth ? () => setSelectedMonth('') : undefined}
            />
        </View>
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
                <FlashList
                    data={isLoading ? [] : historyLogs}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    estimatedItemSize={140}
                    contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(16, insets.bottom + 8) }]}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={listHeader}
                    ListEmptyComponent={emptyStateComponent}
                    refreshControl={
                        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                    }
                />
            </View>

            {/* Filter Sheet Modal */}
            <AppBottomSheet
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                title={t('filter_history', 'Filter History')}
                headerRight={
                    (draftQuickFilter !== 'all' || draftMonth) ? (
                        <TouchableOpacity onPress={handleResetFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={styles.resetBtnText}>{t('reset_all', 'Reset All')}</Text>
                        </TouchableOpacity>
                    ) : undefined
                }
                footer={
                    <TouchableOpacity
                        style={styles.applyFilterBtn}
                        onPress={handleApplyFilters}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.applyFilterBtnText}>{t('apply_filter', 'Apply Filter')}</Text>
                    </TouchableOpacity>
                }
            >
                {/* Review Month Picker */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.monthPillsRow}
                    contentContainerStyle={styles.monthPillsContent}
                >
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

                {/* Status Category Selection */}
                <View style={styles.filterSectionHeaderRow}>
                    <Text style={styles.filterSectionLabel}>{t('status_category', 'Status Category')}</Text>
                </View>
                <View style={styles.categoryChipGrid}>
                    {AUDIT_CATEGORIES.map((f) => {
                        const isSel = draftQuickFilter === f.id;
                        const CatIcon = f.icon;
                        return (
                            <TouchableOpacity
                                key={f.id}
                                style={[
                                    styles.categoryChip,
                                    isSel
                                        ? { backgroundColor: primaryColor, borderColor: primaryColor }
                                        : { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border },
                                ]}
                                onPress={() => {
                                    setDraftQuickFilter(f.id);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                }}
                                activeOpacity={0.75}
                            >
                                <CatIcon
                                    color={isSel ? '#FFFFFF' : theme.colors.textSecondary}
                                    size={14}
                                />
                                <Text
                                    style={[
                                        styles.categoryChipLabel,
                                        { color: isSel ? '#FFFFFF' : theme.colors.textPrimary },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {t(f.keyName, f.fallback)}
                                </Text>

                            </TouchableOpacity>
                        );
                    })}
                </View>
            </AppBottomSheet>
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
    listHeaderSpacer: {
        height: theme.spacing.screenGutter,
    },
    listHeaderActive: {
        paddingTop: theme.spacing.screenGutter,
    },
    activeMonthChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 4,
        borderRadius: theme.borderRadius.full,
        alignSelf: 'flex-start',
        marginHorizontal: theme.spacing.screenGutter,
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
    emptyContainer: {
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.xxl,
        paddingHorizontal: theme.spacing.screenGutter,
        alignSelf: 'stretch',
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
        flexGrow: 1,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.lg,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.cardPadding,
        marginHorizontal: theme.spacing.screenGutter,
        marginBottom: theme.spacing.screenGutter,
        borderWidth: 1,
        borderColor: theme.colors.border,
        position: 'relative',
        overflow: 'hidden',
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
        paddingTop: theme.spacing.sm + 2,
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
        marginBottom: theme.spacing.sm,
        marginHorizontal: -20,
    },
    monthPillsContent: {
        paddingHorizontal: 20,
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: 'transparent',
    },
    filterOptionText: {
        fontSize: 15,
        color: theme.colors.textPrimary,
        fontWeight: '500',
    },
    filterOptionTextSelected: {
        fontWeight: '700',
    },
    filterSectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs + 4,
        marginTop: theme.spacing.sm,
    },
    filterActiveBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    categoryChipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: theme.spacing.md,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
    },
    categoryChipLabel: {
        fontSize: 13,
        fontWeight: '600',
        flexShrink: 1,
    },
    applyFilterBtn: {
        backgroundColor: theme.colors.primary,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 0,
        width: '100%',
    },
    applyFilterBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
}));
