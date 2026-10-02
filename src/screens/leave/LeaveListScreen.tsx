import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    TextInput,
    Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { AppText as Text } from '../../components/AppText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../../components/common/AppShell';
import { HeaderIconButton } from '../../components/common/AppHeader';
import { LeaveListSkeleton } from '../../components/common/Skeletons';
import { EmptyState } from '../../components/common/EmptyState';
import { leaveApi, LeaveBalance, LeaveRequest } from '../../api/leave';
import { queryKeys } from '../../api/queryKeys';
import {
    Plus,
    CheckCircle2,
    FileText,
    Search,
    X,
    Filter,
} from 'lucide-react-native';
import { useTranslation } from '../../context/LanguageContext';
import {
    LeaveBalanceCard,
    MyLeaveRequestCard,
    ManagerApprovalCard,
    LeaveDetailBottomSheet,
    LeaveRejectionBottomSheet,
    getLeaveTypeId,
    getLeaveTypeName,
} from '../../components/leave';

// -------------------------------------------------------------
// Main Screen: LeaveListScreen
// -------------------------------------------------------------
export const LeaveListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'my_requests' | 'approvals'>('my_requests');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Detail Modal State
    const [detailItem, setDetailItem] = useState<LeaveRequest | null>(null);

    // Manager Rejection Modal State
    const [rejectingItem, setRejectingItem] = useState<LeaveRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmittingReject, setIsSubmittingReject] = useState(false);

    // Query 1: Balances
    const { data: leaveBalances = [] } = useQuery<LeaveBalance[]>({
        queryKey: queryKeys.leave.balances,
        queryFn: async () => {
            const balRes = await leaveApi.getMyBalances().catch(() => null);
            if (Array.isArray(balRes)) return balRes;
            if (Array.isArray(balRes?.balances)) return balRes.balances;
            return [];
        },
        staleTime: 1000 * 60 * 5,
    });

    // Query 2: Subordinate Approvals query for tab badge and approvals list
    const { data: managerApprovals = [] } = useQuery<LeaveRequest[]>({
        queryKey: queryKeys.leave.approvals,
        queryFn: async () => {
            const appRes = await leaveApi.getManagerApprovals().catch(() => null);
            return Array.isArray(appRes?.data) ? appRes.data : Array.isArray(appRes) ? appRes : [];
        },
        staleTime: 1000 * 60 * 3,
    });

    const pendingApprovalsCount = useMemo(() => {
        return managerApprovals.filter(
            (req) => (req.status || 'pending').toLowerCase() === 'pending'
        ).length;
    }, [managerApprovals]);

    // Query 3: Primary Tab Data
    const {
        data: leaveRequests = [],
        isLoading,
        isFetching,
        refetch,
    } = useQuery<LeaveRequest[]>({
        queryKey: queryKeys.leave.requests(activeTab),
        queryFn: async () => {
            if (activeTab === 'my_requests') {
                const reqRes = await leaveApi.getLeaveRequests().catch(() => null);
                return Array.isArray(reqRes?.data)
                    ? reqRes.data
                    : Array.isArray(reqRes?.requests)
                    ? reqRes.requests
                    : Array.isArray(reqRes)
                    ? reqRes
                    : [];
            } else {
                return managerApprovals;
            }
        },
        staleTime: 1000 * 60 * 3,
    });

    const onRefresh = useCallback(() => {
        refetch();
        queryClient.invalidateQueries({ queryKey: queryKeys.leave.balances });
        queryClient.invalidateQueries({ queryKey: queryKeys.leave.approvals });
    }, [refetch, queryClient]);

    // Filter computation
    const filteredRequests = useMemo(() => {
        return leaveRequests.filter((item) => {
            // Status filter
            const status = (item.status || 'pending').toLowerCase();
            if (statusFilter !== 'all' && status !== statusFilter) {
                return false;
            }

            // Leave type filter
            if (selectedLeaveTypeId !== null) {
                const itemTypeId = getLeaveTypeId(item);
                if (itemTypeId !== selectedLeaveTypeId) {
                    return false;
                }
            }

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const reason = (item.reason || '').toLowerCase();
                const empName = (item.employee?.full_name || item.employee_name || '').toLowerCase();
                const typeName = getLeaveTypeName(item.leave_type, item, '').toLowerCase();
                if (!reason.includes(q) && !empName.includes(q) && !typeName.includes(q)) {
                    return false;
                }
            }

            return true;
        });
    }, [leaveRequests, statusFilter, selectedLeaveTypeId, searchQuery]);

    // Status filter count badges
    const statusCounts = useMemo(() => {
        const counts = { all: 0, pending: 0, approved: 0, rejected: 0 };
        leaveRequests.forEach((item) => {
            if (selectedLeaveTypeId !== null) {
                const itemTypeId = getLeaveTypeId(item);
                if (itemTypeId !== selectedLeaveTypeId) return;
            }
            counts.all += 1;
            const s = (item.status || 'pending').toLowerCase();
            if (s === 'pending') counts.pending += 1;
            else if (s === 'approved') counts.approved += 1;
            else if (s === 'rejected') counts.rejected += 1;
        });
        return counts;
    }, [leaveRequests, selectedLeaveTypeId]);

    const activeFilterLeaveTypeName = useMemo(() => {
        if (selectedLeaveTypeId === null) return null;
        const found = leaveBalances.find((b) => getLeaveTypeId(b) === selectedLeaveTypeId);
        return found ? getLeaveTypeName(found.leave_type, found) : t('selected_type', 'Selected Type');
    }, [selectedLeaveTypeId, leaveBalances, t]);

    // Standard Confirmation Dialog for Cancellation (Works on iOS, Android, and Web)
    const handleCancelRequest = useCallback((id: number) => {
        const title = t('cancel_application', 'Cancel Application');
        const message = t('cancel_leave_confirm', 'Are you sure you want to cancel this pending leave application?');

        const executeCancel = async () => {
            try {
                await leaveApi.cancelLeaveRequest(id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                setDetailItem(null);
                refetch();
                queryClient.invalidateQueries({ queryKey: queryKeys.leave.all });
                Alert.alert(t('cancelled', 'Cancelled'), t('leave_cancelled_desc', 'Leave application cancelled successfully.'));
            } catch (err: any) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
                Alert.alert(t('error', 'Error'), err?.message || t('fail_cancel_leave', 'Failed to cancel leave request.'));
            }
        };

        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
                executeCancel();
            }
            return;
        }

        Alert.alert(
            title,
            message,
            [
                { text: t('no', 'No'), style: 'cancel' },
                {
                    text: t('yes_cancel', 'Yes, Cancel'),
                    style: 'destructive',
                    onPress: executeCancel,
                },
            ]
        );
    }, [t, refetch, queryClient]);

    // Standard Confirmation Dialog for Approval
    const handleApproveRequest = useCallback((id: number) => {
        const title = t('approve_leave', 'Approve Leave Request');
        const message = t('approve_leave_confirm', 'Are you sure you want to approve this leave request?');

        const executeApprove = async () => {
            try {
                await leaveApi.approveLeaveRequest(id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                setDetailItem(null);
                refetch();
                queryClient.invalidateQueries({ queryKey: queryKeys.leave.approvals });
                queryClient.invalidateQueries({ queryKey: queryKeys.leave.balances });
                Alert.alert(t('approved', 'Approved'), t('leave_approved_desc', 'Leave request approved successfully.'));
            } catch (err: any) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
                Alert.alert(t('error', 'Error'), err?.message || t('fail_approve_leave', 'Failed to approve leave request.'));
            }
        };

        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
                executeApprove();
            }
            return;
        }

        Alert.alert(
            title,
            message,
            [
                { text: t('cancel', 'Cancel'), style: 'cancel' },
                {
                    text: t('approve', 'Approve'),
                    style: 'default',
                    onPress: executeApprove,
                },
            ]
        );
    }, [t, refetch, queryClient]);

    // Manager Rejection Handler
    const handleConfirmReject = useCallback(async () => {
        if (!rejectingItem) return;
        if (!rejectionReason.trim()) {
            Alert.alert(t('reason_required', 'Reason Required'), t('state_rejection_reason', 'Please state a rejection reason.'));
            return;
        }

        setIsSubmittingReject(true);
        try {
            await leaveApi.rejectLeaveRequest(rejectingItem.id, rejectionReason);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            setRejectingItem(null);
            setRejectionReason('');
            refetch();
            queryClient.invalidateQueries({ queryKey: queryKeys.leave.approvals });
            queryClient.invalidateQueries({ queryKey: queryKeys.leave.balances });
            Alert.alert(t('rejected', 'Rejected'), t('leave_rejected_desc', 'Leave request has been rejected.'));
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            Alert.alert(t('error', 'Error'), err?.message || t('fail_reject_leave', 'Failed to reject leave request.'));
        } finally {
            setIsSubmittingReject(false);
        }
    }, [rejectingItem, rejectionReason, t, refetch, queryClient]);

    const headerRight = (
        <HeaderIconButton
            icon={<Plus color={theme.colors.brand} size={20} />}
            onPress={() => navigation.navigate('CreateLeave')}
            accessibilityLabel="Create leave request"
        />
    );

    const keyExtractor = useCallback((item: LeaveRequest) => String(item.id), []);

    const renderItem = useCallback(
        ({ item }: { item: LeaveRequest }) => {
            if (activeTab === 'my_requests') {
                return (
                    <MyLeaveRequestCard
                        req={item}
                        t={t}
                        onOpenDetail={setDetailItem}
                    />
                );
            }
            return (
                <ManagerApprovalCard
                    item={item}
                    t={t}
                    onApprove={handleApproveRequest}
                    onReject={setRejectingItem}
                    onOpenDetail={setDetailItem}
                />
            );
        },
        [activeTab, t, handleApproveRequest]
    );

    const listHeader = useMemo(() => (
        <View style={styles.listHeader}>
            {/* Top Tab Switcher with Manager Pending Badge */}
            <View style={styles.tabSwitcher}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'my_requests' && styles.tabBtnActive]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setActiveTab('my_requests');
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabBtnText, activeTab === 'my_requests' && styles.tabBtnTextActive]}>
                        {t('my_applications', 'My Applications')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'approvals' && styles.tabBtnActive]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setActiveTab('approvals');
                    }}
                    activeOpacity={0.8}
                >
                    <View style={styles.tabBtnRow}>
                        <Text style={[styles.tabBtnText, activeTab === 'approvals' && styles.tabBtnTextActive]}>
                            {t('subordinate_approvals', 'Subordinate Approvals')}
                        </Text>
                        {pendingApprovalsCount > 0 && (
                            <View style={styles.tabApprovalsBadge}>
                                <Text style={styles.tabApprovalsBadgeText}>{pendingApprovalsCount}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {/* Leave Balances Carousel Summary (Shown on My Applications) */}
            {activeTab === 'my_requests' && leaveBalances.length > 0 && (
                <View style={styles.balanceSection}>
                    <View style={styles.balanceSectionHeader}>
                        <Text style={styles.sectionTitle}>{t('leave_balances', 'Leave Balances')}</Text>
                        {selectedLeaveTypeId !== null && (
                            <TouchableOpacity
                                onPress={() => setSelectedLeaveTypeId(null)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Text style={styles.resetFilterText}>{t('show_all', 'Show All')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.balanceCarousel}
                        contentContainerStyle={styles.balanceCarouselContent}
                    >
                        {leaveBalances.map((item, idx) => (
                            <LeaveBalanceCard
                                key={idx}
                                item={item}
                                isSelected={selectedLeaveTypeId === getLeaveTypeId(item)}
                                t={t}
                                onPress={setSelectedLeaveTypeId}
                            />
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Search Input Bar */}
            <View style={styles.searchBarContainer}>
                <View style={styles.searchBar}>
                    <Search size={16} color={theme.colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={(txt: string) => setSearchQuery(txt)}
                        placeholder={
                            activeTab === 'my_requests'
                                ? t('search_leaves_placeholder', 'Search reason or leave type...')
                                : t('search_approvals_placeholder', 'Search employee or reason...')
                        }
                        placeholderTextColor={theme.colors.textDisabled}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <X size={15} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Status Filter Chips Row */}
            <View style={styles.statusChipsRow}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statusChipsContent}
                >
                    <TouchableOpacity
                        style={[styles.statusChip, statusFilter === 'all' && styles.statusChipActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            setStatusFilter('all');
                        }}
                    >
                        <Text style={[styles.statusChipText, statusFilter === 'all' && styles.statusChipTextActive]}>
                            {t('all', 'All')}
                        </Text>
                        <View style={[styles.statusChipBadge, statusFilter === 'all' && styles.statusChipBadgeActive]}>
                            <Text style={[styles.statusChipBadgeText, statusFilter === 'all' && styles.statusChipBadgeTextActive]}>
                                {statusCounts.all}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.statusChip, statusFilter === 'pending' && styles.statusChipActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            setStatusFilter('pending');
                        }}
                    >
                        <View style={styles.statusChipDotPending} />
                        <Text style={[styles.statusChipText, statusFilter === 'pending' && styles.statusChipTextActive]}>
                            {t('pending', 'Pending')}
                        </Text>
                        <View style={[styles.statusChipBadge, statusFilter === 'pending' && styles.statusChipBadgeActive]}>
                            <Text style={[styles.statusChipBadgeText, statusFilter === 'pending' && styles.statusChipBadgeTextActive]}>
                                {statusCounts.pending}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.statusChip, statusFilter === 'approved' && styles.statusChipActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            setStatusFilter('approved');
                        }}
                    >
                        <View style={styles.statusChipDotApproved} />
                        <Text style={[styles.statusChipText, statusFilter === 'approved' && styles.statusChipTextActive]}>
                            {t('approved', 'Approved')}
                        </Text>
                        <View style={[styles.statusChipBadge, statusFilter === 'approved' && styles.statusChipBadgeActive]}>
                            <Text style={[styles.statusChipBadgeText, statusFilter === 'approved' && styles.statusChipBadgeTextActive]}>
                                {statusCounts.approved}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.statusChip, statusFilter === 'rejected' && styles.statusChipActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            setStatusFilter('rejected');
                        }}
                    >
                        <View style={styles.statusChipDotRejected} />
                        <Text style={[styles.statusChipText, statusFilter === 'rejected' && styles.statusChipTextActive]}>
                            {t('rejected', 'Rejected')}
                        </Text>
                        <View style={[styles.statusChipBadge, statusFilter === 'rejected' && styles.statusChipBadgeActive]}>
                            <Text style={[styles.statusChipBadgeText, statusFilter === 'rejected' && styles.statusChipBadgeTextActive]}>
                                {statusCounts.rejected}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Active Leave Type Filter Banner */}
            {activeFilterLeaveTypeName && (
                <View style={styles.activeFilterBanner}>
                    <View style={styles.activeFilterBannerLeft}>
                        <Filter size={13} color={theme.colors.primary} />
                        <Text style={styles.activeFilterBannerText}>
                            {t('filtered_by', 'Filtered by')}: <Text style={styles.activeFilterBannerBold}>{activeFilterLeaveTypeName}</Text>
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.activeFilterBannerClose}
                        onPress={() => setSelectedLeaveTypeId(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <X size={13} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    ), [
        styles,
        theme,
        t,
        activeTab,
        pendingApprovalsCount,
        leaveBalances,
        selectedLeaveTypeId,
        searchQuery,
        statusFilter,
        statusCounts,
        activeFilterLeaveTypeName,
    ]);

    const emptyStateComponent = useMemo(() => {
        if (isLoading) {
            return <LeaveListSkeleton />;
        }

        const isFiltered = statusFilter !== 'all' || selectedLeaveTypeId !== null || searchQuery.trim().length > 0;

        if (isFiltered) {
            return (
                <View style={styles.emptyContainer}>
                    <EmptyState
                        icon={<Search color={theme.colors.textSecondary} size={36} />}
                        title={t('no_matching_requests', 'No Matching Requests')}
                        description={t('adjust_filters_desc', 'Try changing your search keywords or resetting filters.')}
                        actionTitle={t('reset_filters', 'Reset Filters')}
                        onAction={() => {
                            setStatusFilter('all');
                            setSelectedLeaveTypeId(null);
                            setSearchQuery('');
                        }}
                    />
                </View>
            );
        }

        if (activeTab === 'my_requests') {
            return (
                <View style={styles.emptyContainer}>
                    <EmptyState
                        icon={<FileText color={theme.colors.textSecondary} size={36} />}
                        title={t('no_leave_requests', 'No Leave Requests')}
                        description={t('no_leave_requests_desc', 'You have not submitted any leave applications yet.')}
                        actionTitle={t('apply_leave', 'Apply Leave')}
                        onAction={() => navigation.navigate('CreateLeave')}
                    />
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <EmptyState
                    icon={<CheckCircle2 color={theme.colors.status.success} size={36} />}
                    title={t('no_pending_approvals', 'No Pending Approvals')}
                    description={t('no_pending_approvals_desc', 'All subordinate leave requests have been processed.')}
                />
            </View>
        );
    }, [isLoading, statusFilter, selectedLeaveTypeId, searchQuery, activeTab, styles, theme, t, navigation]);

    return (
        <AppShell
            title={t('leave_requests', 'Leave Requests')}
            onBack={() => navigation.goBack()}
            headerRight={headerRight}
            scrollable={false}
        >
            <FlashList
                data={isLoading ? [] : filteredRequests}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                estimatedItemSize={140}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(16, insets.bottom + 12) }]}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={listHeader}
                ListEmptyComponent={emptyStateComponent}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.brand}
                    />
                }
            />

            {/* Leave Detail Inspection Bottom Sheet */}
            <LeaveDetailBottomSheet
                visible={!!detailItem}
                item={detailItem}
                isManagerView={activeTab === 'approvals'}
                t={t}
                onClose={() => setDetailItem(null)}
                onCancelRequest={handleCancelRequest}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={(req) => setRejectingItem(req)}
            />

            {/* Manager Rejection Reason Bottom Sheet */}
            <LeaveRejectionBottomSheet
                visible={!!rejectingItem}
                rejectingItem={rejectingItem}
                rejectionReason={rejectionReason}
                isSubmitting={isSubmittingReject}
                t={t}
                onChangeReason={setRejectionReason}
                onClose={() => {
                    setRejectingItem(null);
                    setRejectionReason('');
                }}
                onConfirmReject={handleConfirmReject}
            />
        </AppShell>
    );
};

// -------------------------------------------------------------
// Stylesheet Definition (Unistyles with Full Light/Dark Palette)
// -------------------------------------------------------------
const stylesheet = StyleSheet.create((theme) => ({
    listHeader: {
        paddingTop: theme.spacing.sm,
    },
    scrollContent: {
        flexGrow: 1,
        paddingTop: theme.spacing.xs,
        paddingBottom: theme.spacing.xl,
    },
    emptyContainer: {
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
        paddingHorizontal: theme.spacing.screenGutter,
        alignSelf: 'stretch',
        alignItems: 'center',
    },

    // Tab Switcher
    tabSwitcher: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        padding: 4,
        marginHorizontal: theme.spacing.screenGutter,
        marginBottom: theme.spacing.md,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.borderRadius.sm,
    },
    tabBtnActive: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    tabBtnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tabBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    tabBtnTextActive: {
        fontWeight: '700',
        color: theme.colors.primary,
    },
    tabApprovalsBadge: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: theme.borderRadius.full,
        minWidth: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabApprovalsBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FFFFFF',
    },

    // Balances Carousel
    balanceSection: {
        marginBottom: theme.spacing.md,
    },
    balanceSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.screenGutter,
        marginBottom: theme.spacing.xs + 2,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        letterSpacing: 0.2,
    },
    resetFilterText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    balanceCarousel: {
        flexDirection: 'row',
    },
    balanceCarouselContent: {
        paddingHorizontal: theme.spacing.screenGutter,
        gap: theme.spacing.sm + 2,
    },

    // Search Bar
    searchBarContainer: {
        paddingHorizontal: theme.spacing.screenGutter,
        marginBottom: theme.spacing.sm,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        height: 42,
        gap: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.textPrimary,
        paddingVertical: 0,
    },

    // Status Chips
    statusChipsRow: {
        marginBottom: theme.spacing.sm,
    },
    statusChipsContent: {
        paddingHorizontal: theme.spacing.screenGutter,
        gap: theme.spacing.xs + 2,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.full,
        gap: 6,
    },
    statusChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    statusChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    statusChipTextActive: {
        color: '#FFFFFF',
    },
    statusChipBadge: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: theme.borderRadius.full,
        minWidth: 18,
        alignItems: 'center',
    },
    statusChipBadgeActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    statusChipBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.colors.textSecondary,
    },
    statusChipBadgeTextActive: {
        color: '#FFFFFF',
    },
    statusChipDotPending: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: theme.colors.status.warning,
    },
    statusChipDotApproved: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: theme.colors.status.success,
    },
    statusChipDotRejected: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: theme.colors.status.danger,
    },

    // Active Filter Banner
    activeFilterBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.primarySubtle,
        borderRadius: theme.borderRadius.md,
        marginHorizontal: theme.spacing.screenGutter,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    activeFilterBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    activeFilterBannerText: {
        fontSize: 12,
        color: theme.colors.textPrimary,
    },
    activeFilterBannerBold: {
        fontWeight: '800',
        color: theme.colors.primary,
    },
    activeFilterBannerClose: {
        padding: 4,
    },
}));
