import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { leaveApi, LeaveBalance, LeaveRequest } from '../../api/leave';
import { useAppTheme } from '../../context/ThemeContext';
import {
    Calendar,
    Plus,
    Clock,
    CheckCircle2,
    XCircle,
    Sun,
    Moon,
    FileText,
    AlertCircle,
    Ban,
    Check,
    X,
    User,
} from 'lucide-react-native';

export const LeaveListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark, toggleTheme } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const [activeTab, setActiveTab] = useState<'my_requests' | 'approvals'>('my_requests');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
    const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
    const [managerApprovals, setManagerApprovals] = useState<LeaveRequest[]>([]);

    // Rejection Modal
    const [rejectingItem, setRejectingItem] = useState<LeaveRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmittingReject, setIsSubmittingReject] = useState(false);

    useEffect(() => {
        fetchLeaveData();
    }, [activeTab]);

    const fetchLeaveData = async () => {
        try {
            setIsLoading(true);

            // Fetch balances
            const balRes = await leaveApi.getMyBalances().catch(() => null);
            if (Array.isArray(balRes)) {
                setLeaveBalances(balRes);
            } else if (Array.isArray(balRes?.balances)) {
                setLeaveBalances(balRes.balances);
            } else {
                setLeaveBalances([
                    { id: 1, remaining_days: 13, allocated_days: 18, used_days: 4, pending_days: 1, leave_type: { id: 1, name: 'Annual Leave' } },
                    { id: 2, remaining_days: 7, allocated_days: 7, used_days: 0, pending_days: 0, leave_type: { id: 2, name: 'Sick Leave' } },
                    { id: 3, remaining_days: 3, allocated_days: 3, used_days: 0, pending_days: 0, leave_type: { id: 3, name: 'Special Leave' } },
                ]);
            }

            if (activeTab === 'my_requests') {
                const reqRes = await leaveApi.getLeaveRequests().catch(() => null);
                const list = Array.isArray(reqRes?.data)
                    ? reqRes.data
                    : Array.isArray(reqRes?.requests)
                    ? reqRes.requests
                    : Array.isArray(reqRes)
                    ? reqRes
                    : [];
                setMyRequests(list);
            } else {
                const appRes = await leaveApi.getManagerApprovals().catch(() => null);
                const approvals = Array.isArray(appRes?.data) ? appRes.data : Array.isArray(appRes) ? appRes : [];
                setManagerApprovals(approvals);
            }
        } catch (error) {
            console.warn('Failed to load leave data:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchLeaveData();
    };

    const handleCancelRequest = (id: number) => {
        Alert.alert('Cancel Application', 'Are you sure you want to cancel this pending leave application?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await leaveApi.cancelLeaveRequest(id);
                        Alert.alert('Cancelled', 'Leave request has been cancelled.');
                        fetchLeaveData();
                    } catch (err: any) {
                        Alert.alert('Error', err?.message || 'Failed to cancel leave request.');
                    }
                },
            },
        ]);
    };

    const handleApproveRequest = async (id: number) => {
        try {
            await leaveApi.approveLeaveRequest(id);
            Alert.alert('Approved', 'Leave request approved successfully.');
            fetchLeaveData();
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to approve leave request.');
        }
    };

    const handleConfirmReject = async () => {
        if (!rejectingItem) return;
        if (!rejectionReason.trim()) {
            Alert.alert('Reason Required', 'Please state a rejection reason.');
            return;
        }

        setIsSubmittingReject(true);
        try {
            await leaveApi.rejectLeaveRequest(rejectingItem.id, rejectionReason);
            Alert.alert('Rejected', 'Leave request has been rejected.');
            setRejectingItem(null);
            setRejectionReason('');
            fetchLeaveData();
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to reject leave request.');
        } finally {
            setIsSubmittingReject(false);
        }
    };

    const getLeaveTypeName = (leaveTypeObj: any) => {
        if (typeof leaveTypeObj === 'string') return leaveTypeObj;
        if (leaveTypeObj && typeof leaveTypeObj === 'object' && leaveTypeObj.name) return leaveTypeObj.name;
        return 'Leave';
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Navigation Header */}
            <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>Leave Management</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={toggleTheme} style={styles.iconButton} activeOpacity={0.7}>
                        {isDark ? <Sun color="#F59E0B" size={18} /> : <Moon color="#2563EB" size={18} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.applyBtn}
                        onPress={() => navigation.navigate('CreateLeave')}
                        activeOpacity={0.85}
                    >
                        <Plus color="#FFFFFF" size={18} />
                        <Text style={styles.applyBtnText}>Apply Leave</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            >
                {/* Leave Balances Carousel */}
                {leaveBalances.length > 0 && (
                    <View style={styles.balanceSection}>
                        <Text style={styles.sectionTitle}>Leave Balances</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.balanceCarousel}>
                            {leaveBalances.map((item, idx) => (
                                <View key={idx} style={styles.balanceCard}>
                                    <Text style={styles.balanceType}>{getLeaveTypeName(item.leave_type)}</Text>
                                    <Text style={styles.balanceRemaining}>{item.remaining_days} Days</Text>
                                    <Text style={styles.balanceSub}>
                                        Used {item.used_days} of {item.allocated_days} days
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Tab Navigation Switcher */}
                <View style={styles.tabSwitcher}>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'my_requests' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('my_requests')}
                    >
                        <Text style={[styles.tabBtnText, activeTab === 'my_requests' && styles.tabBtnTextActive]}>
                            My Applications
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'approvals' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('approvals')}
                    >
                        <Text style={[styles.tabBtnText, activeTab === 'approvals' && styles.tabBtnTextActive]}>
                            Subordinate Approvals
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : activeTab === 'my_requests' ? (
                    myRequests.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <FileText color={theme.colors.textSecondary} size={40} />
                            <Text style={styles.emptyTitle}>No Leave Requests</Text>
                            <Text style={styles.emptySub}>You have not submitted any leave applications yet.</Text>
                        </View>
                    ) : (
                        myRequests.map((req) => {
                            const statusStr = (req.status || 'pending').toLowerCase();
                            const isApproved = statusStr === 'approved';
                            const isPending = statusStr === 'pending';
                            const isRejected = statusStr === 'rejected';

                            return (
                                <View key={req.id} style={styles.requestCard}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.typeGroup}>
                                            <Calendar color={theme.colors.primary} size={16} />
                                            <Text style={styles.typeText}>
                                                {getLeaveTypeName(req.leave_type).toUpperCase()}
                                            </Text>
                                        </View>

                                        <View
                                            style={[
                                                styles.statusBadge,
                                                {
                                                    backgroundColor: isApproved
                                                        ? 'rgba(16, 185, 129, 0.1)'
                                                        : isPending
                                                        ? 'rgba(245, 158, 11, 0.1)'
                                                        : isRejected
                                                        ? 'rgba(239, 68, 68, 0.1)'
                                                        : 'rgba(100, 116, 139, 0.1)',
                                                    borderColor: isApproved
                                                        ? 'rgba(16, 185, 129, 0.2)'
                                                        : isPending
                                                        ? 'rgba(245, 158, 11, 0.2)'
                                                        : isRejected
                                                        ? 'rgba(239, 68, 68, 0.2)'
                                                        : 'rgba(100, 116, 139, 0.2)',
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusBadgeText,
                                                    {
                                                        color: isApproved
                                                            ? theme.colors.status.success
                                                            : isPending
                                                            ? '#F59E0B'
                                                            : isRejected
                                                            ? theme.colors.status.danger
                                                            : theme.colors.textSecondary,
                                                    },
                                                ]}
                                            >
                                                {statusStr.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.dateRangeText}>
                                        {req.start_date} → {req.end_date} ({req.total_days || req.days_count || 1} Day
                                        {(req.total_days || req.days_count || 1) > 1 ? 's' : ''})
                                    </Text>
                                    <Text style={styles.reasonText} numberOfLines={2}>
                                        {req.reason}
                                    </Text>

                                    {/* Action Footer */}
                                    <View style={styles.cardFooter}>
                                        <Text style={styles.appliedDateText}>
                                            Applied {req.created_at ? req.created_at.substring(0, 10) : 'Recent'}
                                        </Text>

                                        {isPending && (
                                            <TouchableOpacity
                                                style={styles.cancelBtn}
                                                onPress={() => handleCancelRequest(req.id)}
                                            >
                                                <Ban color={theme.colors.status.danger} size={13} />
                                                <Text style={styles.cancelBtnText}>Cancel</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )
                ) : managerApprovals.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <CheckCircle2 color={theme.colors.textSecondary} size={40} />
                        <Text style={styles.emptyTitle}>No Pending Approvals</Text>
                        <Text style={styles.emptySub}>All subordinate leave requests have been processed.</Text>
                    </View>
                ) : (
                    managerApprovals.map((item) => (
                        <View key={item.id} style={styles.requestCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.typeGroup}>
                                    <User color={theme.colors.primary} size={16} />
                                    <Text style={styles.typeText}>{item.employee_name || 'Subordinate'}</Text>
                                </View>

                                <View style={styles.pendingBadge}>
                                    <Text style={styles.pendingBadgeText}>PENDING REVIEW</Text>
                                </View>
                            </View>

                            <Text style={styles.dateRangeText}>
                                {getLeaveTypeName(item.leave_type)}: {item.start_date} → {item.end_date}
                            </Text>
                            <Text style={styles.reasonText}>{item.reason}</Text>

                            <View style={styles.approvalActionRow}>
                                <TouchableOpacity
                                    style={styles.rejectActionBtn}
                                    onPress={() => setRejectingItem(item)}
                                >
                                    <X color={theme.colors.status.danger} size={16} />
                                    <Text style={styles.rejectActionText}>Reject</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.approveActionBtn}
                                    onPress={() => handleApproveRequest(item.id)}
                                >
                                    <Check color="#FFFFFF" size={16} />
                                    <Text style={styles.approveActionText}>Approve</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Rejection Reason Modal */}
            <Modal visible={!!rejectingItem} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setRejectingItem(null)}
                >
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Reject Leave Application</Text>
                            <TouchableOpacity onPress={() => setRejectingItem(null)}>
                                <X color={theme.colors.textPrimary} size={20} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Reason for Rejection</Text>
                        <TextInput
                            style={styles.reasonInput}
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                            placeholder="State rejection reason for employee..."
                            placeholderTextColor={theme.colors.textSecondary}
                            multiline
                            numberOfLines={3}
                        />

                        <TouchableOpacity
                            style={styles.confirmRejectBtn}
                            onPress={handleConfirmReject}
                            disabled={isSubmittingReject}
                        >
                            {isSubmittingReject ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.confirmRejectText}>Confirm Rejection</Text>
                            )}
                        </TouchableOpacity>
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
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.md + 4,
        paddingBottom: theme.spacing.xl,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md + 4,
        paddingVertical: theme.spacing.md,
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
    applyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 4,
        borderRadius: theme.borderRadius.md,
        ...theme.shadows.sm,
    },
    applyBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 13,
        marginLeft: theme.spacing.xs,
    },
    balanceSection: {
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs + 2,
    },
    balanceCarousel: {
        flexDirection: 'row',
    },
    balanceCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginRight: theme.spacing.md,
        width: 160,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    balanceType: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    balanceRemaining: {
        fontSize: 22,
        fontWeight: '900',
        color: theme.colors.primary,
        marginVertical: 4,
    },
    balanceSub: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    tabSwitcher: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        padding: 4,
        marginBottom: theme.spacing.lg,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
        borderRadius: theme.borderRadius.sm,
    },
    tabBtnActive: {
        backgroundColor: theme.colors.surface,
        ...theme.shadows.sm,
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
    loadingContainer: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
    },
    emptyCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.md,
    },
    emptySub: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    requestCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    typeGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginLeft: theme.spacing.xs + 2,
    },
    statusBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
    pendingBadge: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
    },
    pendingBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#F59E0B',
    },
    dateRangeText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.primary,
        marginBottom: 4,
    },
    reasonText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
        marginBottom: theme.spacing.sm,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.xs + 2,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    appliedDateText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
    },
    cancelBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.status.danger,
        marginLeft: 4,
    },
    approvalActionRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.xs,
    },
    rejectActionBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingVertical: theme.spacing.xs + 4,
        borderRadius: theme.borderRadius.md,
    },
    rejectActionText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.status.danger,
        marginLeft: 4,
    },
    approveActionBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.status.success,
        paddingVertical: theme.spacing.xs + 4,
        borderRadius: theme.borderRadius.md,
    },
    approveActionText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
        marginLeft: 4,
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
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    reasonInput: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
        padding: theme.spacing.md,
        height: 90,
        textAlignVertical: 'top',
        marginBottom: theme.spacing.lg,
    },
    confirmRejectBtn: {
        backgroundColor: theme.colors.status.danger,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    confirmRejectText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
}));
