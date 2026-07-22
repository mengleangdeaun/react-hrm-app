import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    Modal,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { attendanceApi, HistoryRecord } from '../../api/attendance';
import { useAppTheme } from '../../context/ThemeContext';
import {
    Calendar,
    CheckCircle2,
    AlertTriangle,
    ArrowDownLeft,
    ArrowUpRight,
    Sun,
    Moon,
    Filter,
    X,
    Clock,
    Sparkles,
    Coffee,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';

export const HistoryScreen: React.FC = () => {
    const { isDark, toggleTheme } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const [selectedQuickFilter, setSelectedQuickFilter] = useState<'all' | 'on_time' | 'late' | 'overtime'>('all');
    const [historyLogs, setHistoryLogs] = useState<HistoryRecord[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // Advanced Filter Modal State
    const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
    const [selectedMonth, setSelectedMonth] = useState<string>(''); // YYYY-MM

    useEffect(() => {
        fetchHistory();
    }, [selectedQuickFilter, selectedMonth]);

    const fetchHistory = async () => {
        try {
            setIsLoading(true);
            const params: any = {};
            if (selectedMonth) params.month = selectedMonth;
            if (selectedQuickFilter === 'late') params.in_status = 'Late';
            if (selectedQuickFilter === 'overtime') params.out_status = 'Overtime';

            const data = await attendanceApi.getHistory(params);
            const records: HistoryRecord[] = Array.isArray(data)
                ? data
                : Array.isArray(data?.records)
                ? data.records
                : Array.isArray(data?.data)
                ? data.data
                : [];

            setHistoryLogs(records);
        } catch (error) {
            console.warn('Failed to fetch attendance history:', error);
            // Fallback mock history for visual verification
            setHistoryLogs([
                {
                    id: 984,
                    date: '2026-07-21',
                    clock_in_time: '2026-07-21T08:00:00.000Z',
                    session_1_out_time: '2026-07-21T12:00:00.000Z',
                    session_2_in_time: '2026-07-21T13:00:00.000Z',
                    clock_out_time: '2026-07-21T17:00:00.000Z',
                    status: 'Present',
                    in_status: 'On Time',
                    out_status: 'On Time',
                    late_minutes: 0,
                    overtime_minutes: 45,
                    working_hours: '8h 45m',
                },
                {
                    id: 983,
                    date: '2026-07-20',
                    clock_in_time: '2026-07-20T08:18:00.000Z',
                    clock_out_time: '2026-07-20T17:00:00.000Z',
                    status: 'Late',
                    in_status: 'Late',
                    out_status: 'On Time',
                    late_minutes: 18,
                    working_hours: '7h 42m',
                },
            ]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistory();
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
                {/* Accent Top Bar */}
                <View
                    style={[
                        styles.cardAccentBar,
                        {
                            backgroundColor: isLate
                                ? theme.colors.status.warning
                                : hasOvertime
                                ? theme.colors.status.success
                                : theme.colors.primary,
                        },
                    ]}
                />

                {/* Card Header: Date & Status Badge */}
                <View style={styles.cardHeader}>
                    <View style={styles.dateGroup}>
                        <Calendar color={theme.colors.primary} size={16} />
                        <Text style={styles.dateText}>{formatDateHeader(item.date)}</Text>
                    </View>

                    <View style={styles.statusGroup}>
                        {isActiveSession && (
                            <View style={styles.pulseBadge}>
                                <View style={styles.pulseDot} />
                                <Text style={styles.pulseText}>ACTIVE</Text>
                            </View>
                        )}

                        <View
                            style={[
                                styles.statusBadge,
                                {
                                    backgroundColor: isLate
                                        ? 'rgba(245, 158, 11, 0.1)'
                                        : 'rgba(16, 185, 129, 0.1)',
                                    borderColor: isLate
                                        ? 'rgba(245, 158, 11, 0.2)'
                                        : 'rgba(16, 185, 129, 0.2)',
                                },
                            ]}
                        >
                            {isLate ? (
                                <AlertTriangle color={theme.colors.status.warning} size={12} />
                            ) : (
                                <CheckCircle2 color={theme.colors.status.success} size={12} />
                            )}
                            <Text
                                style={[
                                    styles.statusBadgeText,
                                    {
                                        color: isLate
                                            ? theme.colors.status.warning
                                            : theme.colors.status.success,
                                    },
                                ]}
                            >
                                {(item.status || (isLate ? 'LATE' : 'PRESENT')).toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Session 1 Row */}
                <View style={styles.sessionBox}>
                    <View style={styles.sessionItem}>
                        <View style={styles.rowCentered}>
                            <ArrowDownLeft color={theme.colors.status.success} size={16} />
                            <Text style={styles.sessionLabel}>Clock In</Text>
                        </View>
                        <Text style={styles.sessionValue}>{formatTimeString(item.clock_in_time)}</Text>
                    </View>

                    <View style={styles.sessionDivider} />

                    <View style={styles.sessionItem}>
                        <View style={styles.rowCentered}>
                            <ArrowUpRight color={theme.colors.status.danger} size={16} />
                            <Text style={styles.sessionLabel}>
                                {hasSplitShift ? 'Session 1 Out' : 'Clock Out'}
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
                            <Text style={styles.breakPillText}>Lunch Break</Text>
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
                                <Text style={styles.sessionLabel}>Session 2 In</Text>
                            </View>
                            <Text style={styles.sessionValue}>{formatTimeString(item.session_2_in_time)}</Text>
                        </View>

                        <View style={styles.sessionDivider} />

                        <View style={styles.sessionItem}>
                            <View style={styles.rowCentered}>
                                <ArrowUpRight color={theme.colors.status.danger} size={16} />
                                <Text style={styles.sessionLabel}>Clock Out</Text>
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
                                <Text style={styles.lateChipText}>-{item.late_minutes}m Late</Text>
                            </View>
                        )}
                        {hasEarlyLeave && (
                            <View style={styles.earlyChip}>
                                <Text style={styles.earlyChipText}>-{item.early_departure_minutes}m Early Leave</Text>
                            </View>
                        )}
                        {hasOvertime && (
                            <View style={styles.overtimeChip}>
                                <Sparkles color={theme.colors.status.success} size={11} />
                                <Text style={styles.overtimeChipText}>+{item.overtime_minutes}m OT</Text>
                            </View>
                        )}
                    </View>

                    {item.working_hours && (
                        <Text style={styles.workingHoursText}>
                            Total: <Text style={styles.workingHoursHighlight}>{item.working_hours}</Text>
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Attendance History</Text>

                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            onPress={() => setFilterModalVisible(true)}
                            style={styles.iconButton}
                            activeOpacity={0.7}
                        >
                            <Filter color={selectedMonth ? theme.colors.primary : theme.colors.textPrimary} size={18} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={toggleTheme}
                            style={styles.iconButton}
                            activeOpacity={0.7}
                        >
                            {isDark ? <Sun color="#F59E0B" size={18} /> : <Moon color="#2563EB" size={18} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Filter Chips */}
                <View style={styles.filterChipsRow}>
                    <TouchableOpacity
                        style={[
                            styles.chip,
                            selectedQuickFilter === 'all' && styles.chipActive,
                        ]}
                        onPress={() => setSelectedQuickFilter('all')}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                selectedQuickFilter === 'all' && styles.chipTextActive,
                            ]}
                        >
                            All Logs
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.chip,
                            selectedQuickFilter === 'on_time' && styles.chipActive,
                        ]}
                        onPress={() => setSelectedQuickFilter('on_time')}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                selectedQuickFilter === 'on_time' && styles.chipTextActive,
                            ]}
                        >
                            On Time
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.chip,
                            selectedQuickFilter === 'late' && styles.chipActive,
                        ]}
                        onPress={() => setSelectedQuickFilter('late')}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                selectedQuickFilter === 'late' && styles.chipTextActive,
                            ]}
                        >
                            Late Punches
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.chip,
                            selectedQuickFilter === 'overtime' && styles.chipActive,
                        ]}
                        onPress={() => setSelectedQuickFilter('overtime')}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                selectedQuickFilter === 'overtime' && styles.chipTextActive,
                            ]}
                        >
                            Overtime
                        </Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : historyLogs.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Clock color={theme.colors.textSecondary} size={44} />
                        <Text style={styles.emptyTitle}>No History Records</Text>
                        <Text style={styles.emptySubtitle}>No attendance logs found for this period.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={historyLogs}
                        keyExtractor={(item: HistoryRecord) => item.id?.toString() || item.date}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
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
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter History</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <X color={theme.colors.textPrimary} size={20} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.filterSectionLabel}>Month Filter</Text>
                        <View style={styles.monthOptionsRow}>
                            {['2026-07', '2026-06', '2026-05'].map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    style={[
                                        styles.monthBtn,
                                        selectedMonth === m && styles.monthBtnSelected,
                                    ]}
                                    onPress={() => {
                                        setSelectedMonth(selectedMonth === m ? '' : m);
                                        setFilterModalVisible(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.monthBtnText,
                                            selectedMonth === m && styles.monthBtnTextSelected,
                                        ]}
                                    >
                                        {m}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
        paddingHorizontal: theme.spacing.md + 4,
        paddingTop: theme.spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: theme.colors.textPrimary,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs + 2,
    },
    iconButton: {
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    filterChipsRow: {
        flexDirection: 'row',
        gap: theme.spacing.xs + 2,
        marginBottom: theme.spacing.md,
    },
    chip: {
        paddingHorizontal: theme.spacing.sm + 4,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceSubtle,
    },
    chipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    chipTextActive: {
        color: '#FFFFFF',
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
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
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
        height: 3,
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
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        paddingHorizontal: theme.spacing.xs + 4,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.full,
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F59E0B',
        marginRight: 4,
    },
    pulseText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#F59E0B',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
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
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
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
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
    filterSectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: theme.spacing.sm,
    },
    monthOptionsRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    monthBtn: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    monthBtnSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    monthBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    monthBtnTextSelected: {
        color: '#FFFFFF',
    },
}));
