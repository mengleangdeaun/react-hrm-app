import React, { useState, useCallback, useMemo, memo } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    Pressable,
    RefreshControl,
    Alert,
    TextInput,
    Linking,
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
import { AppBottomSheet } from '../../components/common/AppBottomSheet';
import { AppButton } from '../../components/common/AppButton';
import { leaveApi, LeaveBalance, LeaveRequest } from '../../api/leave';
import { useAppTheme } from '../../context/ThemeContext';
import {
    Calendar,
    Plus,
    Clock,
    CheckCircle2,
    XCircle,
    FileText,
    AlertCircle,
    Ban,
    Check,
    X,
    Search,
    ChevronRight,
    Paperclip,
    ExternalLink,
    Filter,
} from 'lucide-react-native';
import { formatDateRangeDisplay, formatDateDisplay } from '../../utils/dateTime';
import { useTranslation } from '../../context/LanguageContext';

// Helper: Safely extract numbers from balance responses
const getRemainingDays = (item: any): number => {
    const val = item.remaining_days ?? item.balance ?? item.remaining ?? 0;
    return typeof val === 'number' ? val : parseFloat(val) || 0;
};

const getUsedDays = (item: any): number => {
    const val = item.used_days ?? item.total_taken ?? item.taken ?? 0;
    return typeof val === 'number' ? val : parseFloat(val) || 0;
};

const getAllocatedDays = (item: any): number => {
    const val = item.allocated_days ?? item.total_accrued ?? item.allowed ?? 0;
    return typeof val === 'number' ? val : parseFloat(val) || 0;
};

const getLeaveTypeName = (leaveTypeObj: any, item?: any, fallback = 'Leave'): string => {
    const target = leaveTypeObj || item?.leave_type || item?.leaveType;
    if (typeof target === 'string') return target;
    if (target && typeof target === 'object' && (target.name || target.title)) {
        return target.name || target.title;
    }
    return fallback;
};

const getLeaveTypeId = (item: any): number | null => {
    if (!item) return null;
    if (typeof item.leave_type_id === 'number') return item.leave_type_id;
    const lType = item.leave_type || item.leaveType;
    if (typeof lType === 'object' && lType?.id) return lType.id;
    if (typeof item.id === 'number') return item.id;
    return null;
};

const getDurationTypeLabel = (
    durationType?: string,
    startTime?: string,
    endTime?: string,
    t?: (k: string, f: string) => string
): string => {
    const tr = t || ((_: string, f: string) => f);
    switch (durationType) {
        case 'first_half':
            return tr('morning', 'Morning (Half Day)');
        case 'second_half':
            return tr('afternoon', 'Afternoon (Half Day)');
        case 'custom_time':
            return startTime && endTime ? `${startTime} - ${endTime}` : tr('custom_hours', 'Custom Hours');
        case 'multi_day':
            return tr('multi_day', 'Multi-Day');
        case 'full_day':
        default:
            return tr('full_day', 'Full Day');
    }
};

// Status Styling Lookup
const getStatusMeta = (status: string, styles: any) => {
    switch (status.toLowerCase()) {
        case 'approved':
            return {
                badgeStyle: styles.statusBadgeApproved,
                textStyle: styles.statusBadgeTextApproved,
                icon: CheckCircle2,
            };
        case 'rejected':
            return {
                badgeStyle: styles.statusBadgeRejected,
                textStyle: styles.statusBadgeTextRejected,
                icon: XCircle,
            };
        case 'cancelled':
            return {
                badgeStyle: styles.statusBadgeCancelled,
                textStyle: styles.statusBadgeTextCancelled,
                icon: Ban,
            };
        case 'pending':
        default:
            return {
                badgeStyle: styles.statusBadgePending,
                textStyle: styles.statusBadgeTextPending,
                icon: Clock,
            };
    }
};

// -------------------------------------------------------------
// Component: Leave Balance Carousel Card with Visual Progress
// -------------------------------------------------------------
interface LeaveBalanceCardProps {
    item: LeaveBalance;
    isSelected: boolean;
    styles: any;
    theme: any;
    t: (key: string, fallback?: string, params?: any) => string;
    onPress: (typeId: number | null) => void;
}

const LeaveBalanceCard = memo(({ item, isSelected, styles, theme, t, onPress }: LeaveBalanceCardProps) => {
    const remaining = getRemainingDays(item);
    const used = getUsedDays(item);
    const allocated = getAllocatedDays(item);
    const progressPercent = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
    const typeName = getLeaveTypeName(item.leave_type, item, t('leave', 'Leave'));
    const typeId = getLeaveTypeId(item);

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(isSelected ? null : typeId);
    }, [isSelected, typeId, onPress]);

    return (
        <Pressable
            style={[styles.balanceCard, isSelected && styles.balanceCardSelected]}
            onPress={handlePress}
            android_ripple={{ color: theme.colors.primarySubtle }}
        >
            <View style={styles.balanceCardTop}>
                <Text style={[styles.balanceType, isSelected && styles.balanceTypeSelected]} numberOfLines={1}>
                    {typeName.toUpperCase()}
                </Text>
                {isSelected && (
                    <View style={styles.activeFilterDot}>
                        <Check color="#FFFFFF" size={10} strokeWidth={3} />
                    </View>
                )}
            </View>

            <View style={styles.balanceNumberRow}>
                <Text style={[styles.balanceRemaining, isSelected && styles.balanceRemainingSelected]}>
                    {remaining}
                </Text>
                <Text style={styles.balanceDaysLabel}>
                    {remaining === 1 ? t('day_left', 'Day left') : t('days_left', 'Days left')}
                </Text>
            </View>

            <View style={styles.balanceProgressContainer}>
                <View style={styles.balanceProgressTrack}>
                    <View
                        style={[
                            styles.balanceProgressBar,
                            { width: `${progressPercent}%` },
                            isSelected && styles.balanceProgressBarSelected,
                        ]}
                    />
                </View>
            </View>

            <Text style={styles.balanceSub} numberOfLines={1}>
                {t('used_days_of_total', `Used ${used} of ${allocated} days`)}
            </Text>
        </Pressable>
    );
});

// -------------------------------------------------------------
// Component: My Leave Request Card (Clean, Tappable to Inspect)
// -------------------------------------------------------------
interface MyLeaveCardProps {
    req: LeaveRequest;
    styles: any;
    theme: any;
    t: (key: string, fallback?: string, params?: any) => string;
    onOpenDetail: (req: LeaveRequest) => void;
}

const MyLeaveRequestCard = memo(({ req, styles, theme, t, onOpenDetail }: MyLeaveCardProps) => {
    const statusStr = (req.status || 'pending').toLowerCase();
    const isRejected = statusStr === 'rejected';

    const typeName = getLeaveTypeName(req.leave_type, req, t('leave', 'Leave'));
    const statusMeta = getStatusMeta(statusStr, styles);

    const handlePressCard = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onOpenDetail(req);
    }, [req, onOpenDetail]);

    const daysCount = req.total_days || req.days_count || 1;
    const durationLabel = getDurationTypeLabel(req.duration_type, req.start_time, req.end_time, t);

    return (
        <Pressable
            style={styles.requestCard}
            onPress={handlePressCard}
            android_ripple={{ color: theme.colors.surfaceSubtle }}
        >
            <View style={styles.cardHeader}>
                <View style={styles.typeGroup}>
                    <Calendar color={theme.colors.primary} size={15} />
                    <Text style={styles.typeText} numberOfLines={1}>
                        {typeName.toUpperCase()}
                    </Text>
                </View>

                <View style={[styles.statusBadge, statusMeta.badgeStyle]}>
                    <Text style={[styles.statusBadgeText, statusMeta.textStyle]}>
                        {statusStr.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View style={styles.dateRow}>
                <Text style={styles.dateRangeText}>
                    {formatDateRangeDisplay(req.start_date, req.end_date)}
                </Text>
                <View style={styles.durationPill}>
                    <Text style={styles.durationPillText}>
                        {daysCount} {daysCount > 1 ? t('days', 'Days') : t('day', 'Day')}
                    </Text>
                </View>
            </View>

            {req.duration_type && req.duration_type !== 'full_day' && (
                <View style={styles.durationTypeTag}>
                    <Clock size={11} color={theme.colors.textSecondary} />
                    <Text style={styles.durationTypeTagText}>{durationLabel}</Text>
                </View>
            )}

            <Text style={styles.reasonText} numberOfLines={2}>
                {req.reason}
            </Text>

            {/* Rejection Notice Banner */}
            {isRejected && req.rejection_reason && (
                <View style={styles.rejectionNoticeBox}>
                    <AlertCircle size={14} color={theme.colors.status.danger} />
                    <Text style={styles.rejectionNoticeText} numberOfLines={2}>
                        <Text style={styles.rejectionNoticeTitle}>{t('rejection_reason', 'Rejection Reason')}: </Text>
                        {req.rejection_reason}
                    </Text>
                </View>
            )}

            {/* Attachments Preview Pill */}
            {req.attachments && req.attachments.length > 0 && (
                <View style={styles.attachmentChip}>
                    <Paperclip size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.attachmentChipText}>
                        {req.attachments.length} {req.attachments.length > 1 ? t('attachments', 'attachments') : t('attachment', 'attachment')}
                    </Text>
                </View>
            )}

            {/* Card Footer: Applied Date + Details Action */}
            <View style={styles.cardFooter}>
                <Text style={styles.appliedDateText}>
                    {t('applied', 'Applied')} {formatDateDisplay(req.created_at)}
                </Text>

                <View style={styles.viewDetailPill}>
                    <Text style={styles.viewDetailPillText}>{t('view_details', 'View Details')}</Text>
                    <ChevronRight size={14} color={theme.colors.primary} />
                </View>
            </View>
        </Pressable>
    );
});

// -------------------------------------------------------------
// Component: Manager Subordinate Approval Card
// -------------------------------------------------------------
interface ManagerApprovalCardProps {
    item: LeaveRequest;
    styles: any;
    theme: any;
    t: (key: string, fallback?: string, params?: any) => string;
    onApprove: (id: number) => void;
    onReject: (item: LeaveRequest) => void;
    onOpenDetail: (req: LeaveRequest) => void;
}

const ManagerApprovalCard = memo(({ item, styles, theme, t, onApprove, onReject, onOpenDetail }: ManagerApprovalCardProps) => {
    const typeName = getLeaveTypeName(item.leave_type, item, t('leave', 'Leave'));
    const employeeName = item.employee?.full_name || item.employee_name || t('subordinate', 'Subordinate');
    const employeeInitials = employeeName
        .split(' ')
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'EMP';

    const daysCount = item.total_days || item.days_count || 1;
    const durationLabel = getDurationTypeLabel(item.duration_type, item.start_time, item.end_time, t);

    const handlePressCard = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onOpenDetail(item);
    }, [item, onOpenDetail]);

    const handleApprove = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onApprove(item.id);
    }, [item.id, onApprove]);

    const handleReject = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onReject(item);
    }, [item, onReject]);

    return (
        <View style={styles.requestCard}>
            <Pressable
                style={styles.cardPressableArea}
                onPress={handlePressCard}
                android_ripple={{ color: theme.colors.surfaceSubtle }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.employeeHeaderGroup}>
                        <View style={styles.employeeAvatarCircle}>
                            <Text style={styles.employeeAvatarText}>{employeeInitials}</Text>
                        </View>
                        <View style={styles.employeeInfo}>
                            <Text style={styles.employeeName} numberOfLines={1}>{employeeName}</Text>
                            <Text style={styles.employeeSubText}>{typeName}</Text>
                        </View>
                    </View>

                    <View style={styles.pendingBadge}>
                        <Clock size={11} color={theme.colors.status.warning} />
                        <Text style={styles.pendingBadgeText}>{t('pending_review', 'PENDING REVIEW')}</Text>
                    </View>
                </View>

                <View style={styles.dateRow}>
                    <Text style={styles.dateRangeText}>
                        {formatDateRangeDisplay(item.start_date, item.end_date)}
                    </Text>
                    <View style={styles.durationPill}>
                        <Text style={styles.durationPillText}>
                            {daysCount} {daysCount > 1 ? t('days', 'Days') : t('day', 'Day')}
                        </Text>
                    </View>
                </View>

                {item.duration_type && item.duration_type !== 'full_day' && (
                    <View style={styles.durationTypeTag}>
                        <Clock size={11} color={theme.colors.textSecondary} />
                        <Text style={styles.durationTypeTagText}>{durationLabel}</Text>
                    </View>
                )}

                <Text style={styles.reasonText} numberOfLines={2}>{item.reason}</Text>

                {item.attachments && item.attachments.length > 0 && (
                    <View style={styles.attachmentChip}>
                        <Paperclip size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.attachmentChipText}>
                            {item.attachments.length} {item.attachments.length > 1 ? t('attachments', 'attachments') : t('attachment', 'attachment')}
                        </Text>
                    </View>
                )}
            </Pressable>

            {/* Sibling Card Actions Row */}
            <View style={styles.approvalActionRow}>
                <TouchableOpacity
                    style={styles.rejectActionBtn}
                    onPress={handleReject}
                    activeOpacity={0.8}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <X color={theme.colors.status.danger} size={15} />
                    <Text style={styles.rejectActionText}>{t('reject', 'Reject')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.approveActionBtn}
                    onPress={handleApprove}
                    activeOpacity={0.85}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Check color="#FFFFFF" size={15} />
                    <Text style={styles.approveActionText}>{t('approve', 'Approve')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

// -------------------------------------------------------------
// Component: Leave Detail Inspection Bottom Sheet
// -------------------------------------------------------------
interface LeaveDetailSheetProps {
    item: LeaveRequest | null;
    visible: boolean;
    styles: any;
    theme: any;
    isManagerView: boolean;
    t: (key: string, fallback?: string, params?: any) => string;
    onClose: () => void;
    onCancelRequest: (id: number) => void;
    onApproveRequest: (id: number) => void;
    onRejectRequest: (item: LeaveRequest) => void;
}

const LeaveDetailSheet: React.FC<LeaveDetailSheetProps> = ({
    item,
    visible,
    styles,
    theme,
    isManagerView,
    t,
    onClose,
    onCancelRequest,
    onApproveRequest,
    onRejectRequest,
}) => {
    if (!item) return null;

    const statusStr = (item.status || 'pending').toLowerCase();
    const isPending = statusStr === 'pending';
    const isRejected = statusStr === 'rejected';
    const typeName = getLeaveTypeName(item.leave_type, item, t('leave', 'Leave'));
    const statusMeta = getStatusMeta(statusStr, styles);
    const daysCount = item.total_days || item.days_count || 1;
    const durationLabel = getDurationTypeLabel(item.duration_type, item.start_time, item.end_time, t);

    const handleAttachmentPress = (url: string) => {
        if (!url) return;
        Linking.canOpenURL(url).then((supported: boolean) => {
            if (supported) Linking.openURL(url);
        }).catch(() => null);
    };

    const footerNode = isPending ? (
        <View style={styles.detailFooterContainer}>
            {isManagerView ? (
                <View style={styles.detailManagerActionRow}>
                    <TouchableOpacity
                        style={styles.detailRejectBtn}
                        onPress={() => {
                            onClose();
                            onRejectRequest(item);
                        }}
                        activeOpacity={0.85}
                    >
                        <X size={16} color={theme.colors.status.danger} />
                        <Text style={styles.detailRejectBtnText}>{t('reject', 'Reject')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.detailApproveBtn}
                        onPress={() => onApproveRequest(item.id)}
                        activeOpacity={0.85}
                    >
                        <Check size={16} color="#FFFFFF" />
                        <Text style={styles.detailApproveBtnText}>{t('approve', 'Approve')}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.detailCancelBtn}
                    onPress={() => onCancelRequest(item.id)}
                    activeOpacity={0.85}
                >
                    <Ban size={18} color={theme.colors.status.danger} />
                    <Text style={styles.detailCancelBtnText}>{t('cancel_leave_request', 'Cancel Leave Application')}</Text>
                </TouchableOpacity>
            )}
        </View>
    ) : null;

    return (
        <AppBottomSheet
            visible={visible}
            onClose={onClose}
            title={t('leave_details', 'Leave Details')}
            subtitle={typeName}
            footer={footerNode}
        >
            <View style={styles.detailBody}>
                {/* Header Status Hero */}
                <View style={styles.detailHeroCard}>
                    <View style={styles.detailHeroTop}>
                        <View style={[styles.statusBadge, statusMeta.badgeStyle]}>
                            <Text style={[styles.statusBadgeText, statusMeta.textStyle]}>
                                {statusStr.toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.detailDaysHeroPill}>
                            <Text style={styles.detailDaysHeroText}>
                                {daysCount} {daysCount > 1 ? t('days', 'Days') : t('day', 'Day')}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.detailHeroDateRange}>
                        {formatDateRangeDisplay(item.start_date, item.end_date)}
                    </Text>
                    <Text style={styles.detailHeroDurationLabel}>{durationLabel}</Text>
                </View>

                {/* Subordinate Information (If Manager View) */}
                {isManagerView && (
                    <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>{t('applicant_employee', 'Applicant')}</Text>
                        <View style={styles.detailEmployeeRow}>
                            <View style={styles.employeeAvatarCircle}>
                                <Text style={styles.employeeAvatarText}>
                                    {(item.employee?.full_name || item.employee_name || 'E').slice(0, 2).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.employeeInfo}>
                                <Text style={styles.employeeName}>
                                    {item.employee?.full_name || item.employee_name || t('subordinate', 'Subordinate')}
                                </Text>
                                {item.employee_id && (
                                    <Text style={styles.employeeSubText}>{t('id', 'ID')}: {item.employee_id}</Text>
                                )}
                            </View>
                        </View>
                    </View>
                )}

                {/* Date and Time Breakdown Grid */}
                <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('schedule_details', 'Schedule & Timeline')}</Text>
                    <View style={styles.detailGrid}>
                        <View style={styles.detailGridItem}>
                            <Text style={styles.detailGridLabel}>{t('start_date', 'Start Date')}</Text>
                            <Text style={styles.detailGridValue}>{formatDateDisplay(item.start_date)}</Text>
                        </View>
                        <View style={styles.detailGridItem}>
                            <Text style={styles.detailGridLabel}>{t('end_date', 'End Date')}</Text>
                            <Text style={styles.detailGridValue}>{formatDateDisplay(item.end_date)}</Text>
                        </View>
                        {item.start_time && item.end_time && (
                            <View style={styles.detailGridItem}>
                                <Text style={styles.detailGridLabel}>{t('time_range', 'Time Window')}</Text>
                                <Text style={styles.detailGridValue}>{item.start_time} - {item.end_time}</Text>
                            </View>
                        )}
                        <View style={styles.detailGridItem}>
                            <Text style={styles.detailGridLabel}>{t('applied_on', 'Applied On')}</Text>
                            <Text style={styles.detailGridValue}>{formatDateDisplay(item.created_at)}</Text>
                        </View>
                    </View>
                </View>

                {/* Reason Section */}
                <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('reason_for_application', 'Reason for Application')}</Text>
                    <View style={styles.detailReasonBox}>
                        <Text style={styles.detailReasonText}>{item.reason}</Text>
                    </View>
                </View>

                {/* Rejection Notice Section (if rejected) */}
                {isRejected && (
                    <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>{t('rejection_details', 'Rejection Details')}</Text>
                        <View style={styles.detailRejectionBox}>
                            <AlertCircle size={18} color={theme.colors.status.danger} />
                            <View style={styles.detailRejectionContent}>
                                <Text style={styles.detailRejectionTitle}>{t('application_rejected', 'Application Rejected')}</Text>
                                <Text style={styles.detailRejectionText}>
                                    {item.rejection_reason || t('no_rejection_reason_provided', 'No specific rejection explanation was recorded.')}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Attachments Section */}
                {item.attachments && item.attachments.length > 0 && (
                    <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>{t('supporting_documents', 'Supporting Documents')}</Text>
                        <View style={styles.detailAttachmentsList}>
                            {item.attachments.map((attUrl, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.detailAttachmentItem}
                                    onPress={() => handleAttachmentPress(attUrl)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.detailAttachmentLeft}>
                                        <Paperclip size={16} color={theme.colors.primary} />
                                        <Text style={styles.detailAttachmentName} numberOfLines={1}>
                                            {t('document', 'Document')} #{idx + 1}
                                        </Text>
                                    </View>
                                    <ExternalLink size={14} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        </AppBottomSheet>
    );
};

// -------------------------------------------------------------
// Main Screen: LeaveListScreen
// -------------------------------------------------------------
export const LeaveListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { isDark } = useAppTheme();
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
        queryKey: ['leaveBalances'],
        queryFn: async () => {
            const balRes = await leaveApi.getMyBalances().catch(() => null);
            if (Array.isArray(balRes)) return balRes;
            if (Array.isArray(balRes?.balances)) return balRes.balances;
            return [];
        },
        staleTime: 1000 * 60 * 5,
    });

    // Query 2: Subordinate Approvals count query for tab badge
    const { data: managerApprovals = [] } = useQuery<LeaveRequest[]>({
        queryKey: ['managerApprovalsList'],
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
        queryKey: ['leaveRequests', activeTab],
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
        queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
        queryClient.invalidateQueries({ queryKey: ['managerApprovalsList'] });
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
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setDetailItem(null);
                refetch();
                queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
                Alert.alert(t('cancelled', 'Cancelled'), t('leave_cancelled_desc', 'Leave application cancelled successfully.'));
            } catch (err: any) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setDetailItem(null);
                refetch();
                queryClient.invalidateQueries({ queryKey: ['managerApprovalsList'] });
                queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
                Alert.alert(t('approved', 'Approved'), t('leave_approved_desc', 'Leave request approved successfully.'));
            } catch (err: any) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setRejectingItem(null);
            setRejectionReason('');
            refetch();
            queryClient.invalidateQueries({ queryKey: ['managerApprovalsList'] });
            queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
            Alert.alert(t('rejected', 'Rejected'), t('leave_rejected_desc', 'Leave request has been rejected.'));
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
                        styles={styles}
                        theme={theme}
                        t={t}
                        onOpenDetail={setDetailItem}
                    />
                );
            }
            return (
                <ManagerApprovalCard
                    item={item}
                    styles={styles}
                    theme={theme}
                    t={t}
                    onApprove={handleApproveRequest}
                    onReject={setRejectingItem}
                    onOpenDetail={setDetailItem}
                />
            );
        },
        [activeTab, styles, theme, t, handleApproveRequest]
    );

    const listHeader = useMemo(() => (
        <View style={styles.listHeader}>
            {/* Top Tab Switcher with Manager Pending Badge */}
            <View style={styles.tabSwitcher}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'my_requests' && styles.tabBtnActive]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                                styles={styles}
                                theme={theme}
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
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            <LeaveDetailSheet
                item={detailItem}
                visible={!!detailItem}
                styles={styles}
                theme={theme}
                isManagerView={activeTab === 'approvals'}
                t={t}
                onClose={() => setDetailItem(null)}
                onCancelRequest={handleCancelRequest}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={(req) => setRejectingItem(req)}
            />

            {/* Manager Rejection Reason Bottom Sheet */}
            <AppBottomSheet
                visible={!!rejectingItem}
                onClose={() => {
                    setRejectingItem(null);
                    setRejectionReason('');
                }}
                title={t('reject_leave_app', 'Reject Leave Application')}
                subtitle={
                    rejectingItem
                        ? `${t('employee', 'Employee')}: ${rejectingItem.employee?.full_name || rejectingItem.employee_name || t('colleague', 'Colleague')}`
                        : undefined
                }
                footer={
                    <View style={styles.modalActionButtonsGroup}>
                        <AppButton
                            title={t('confirm_rejection', 'Confirm Rejection')}
                            onPress={handleConfirmReject}
                            variant="destructive"
                            loading={isSubmittingReject}
                            disabled={isSubmittingReject || !rejectionReason.trim()}
                        />
                        <AppButton
                            title={t('cancel', 'Cancel')}
                            onPress={() => {
                                setRejectingItem(null);
                                setRejectionReason('');
                            }}
                            variant="secondary"
                            disabled={isSubmittingReject}
                        />
                    </View>
                }
            >
                <View style={styles.rejectionModalContent}>
                    <Text style={styles.inputLabel}>{t('reason_for_rejection', 'Reason for Rejection')}</Text>
                    <TextInput
                        style={styles.reasonInput}
                        value={rejectionReason}
                        onChangeText={(txt: string) => setRejectionReason(txt)}
                        placeholder={t('state_rejection_reason', 'State rejection reason for employee...')}
                        placeholderTextColor={theme.colors.textDisabled}
                        multiline
                        numberOfLines={3}
                        maxLength={250}
                    />
                    <Text style={styles.charCounter}>{rejectionReason.length} / 250</Text>
                </View>
            </AppBottomSheet>
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
    balanceCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        width: 165,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    balanceCardSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
    },
    balanceCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    balanceType: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.colors.textSecondary,
        flex: 1,
    },
    balanceTypeSelected: {
        color: theme.colors.primary,
    },
    activeFilterDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
    balanceNumberRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        marginVertical: 4,
    },
    balanceRemaining: {
        fontSize: 24,
        fontWeight: '900',
        color: theme.colors.textPrimary,
    },
    balanceRemainingSelected: {
        color: theme.colors.primary,
    },
    balanceDaysLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    balanceProgressContainer: {
        marginVertical: 6,
    },
    balanceProgressTrack: {
        height: 5,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.surfaceSubtle,
        overflow: 'hidden',
    },
    balanceProgressBar: {
        height: '100%',
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.primary,
    },
    balanceProgressBarSelected: {
        backgroundColor: theme.colors.primary,
    },
    balanceSub: {
        fontSize: 11,
        color: theme.colors.textSecondary,
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

    // Request Card
    requestCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.screenGutter,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardPressableArea: {
        padding: 0,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs + 2,
    },
    typeGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    typeText: {
        fontSize: 13,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        marginLeft: 6,
        letterSpacing: 0.3,
    },

    // Status Badges
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 3,
        borderRadius: theme.borderRadius.full,
        gap: 4,
    },
    statusBadgePending: {
        backgroundColor: theme.colors.status.warningSubtle,
        borderWidth: 1,
        borderColor: theme.colors.status.warningBorder,
    },
    statusBadgeTextPending: {
        color: theme.colors.status.warning,
    },
    statusBadgeApproved: {
        backgroundColor: theme.colors.status.successSubtle,
        borderWidth: 1,
        borderColor: theme.colors.status.successBorder,
    },
    statusBadgeTextApproved: {
        color: theme.colors.status.success,
    },
    statusBadgeRejected: {
        backgroundColor: theme.colors.status.dangerSubtle,
        borderWidth: 1,
        borderColor: theme.colors.status.dangerBorder,
    },
    statusBadgeTextRejected: {
        color: theme.colors.status.danger,
    },
    statusBadgeCancelled: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    statusBadgeTextCancelled: {
        color: theme.colors.textSecondary,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.status.warningSubtle,
        borderWidth: 1,
        borderColor: theme.colors.status.warningBorder,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 3,
        borderRadius: theme.borderRadius.full,
        gap: 4,
    },
    pendingBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: theme.colors.status.warning,
        letterSpacing: 0.3,
    },

    // Card Details
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
        marginBottom: 4,
    },
    dateRangeText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    durationPill: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.full,
    },
    durationPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    durationTypeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    durationTypeTagText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    reasonText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
        marginVertical: 4,
    },

    // In-card Rejection Notice
    rejectionNoticeBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: theme.colors.status.dangerSubtle,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        marginTop: 4,
        marginBottom: 6,
        gap: 6,
        borderWidth: 1,
        borderColor: theme.colors.status.dangerBorder,
    },
    rejectionNoticeText: {
        fontSize: 12,
        color: theme.colors.status.danger,
        flex: 1,
        lineHeight: 16,
    },
    rejectionNoticeTitle: {
        fontWeight: '800',
    },

    // In-card Attachment Chip
    attachmentChip: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.sm,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginVertical: 4,
        gap: 4,
    },
    attachmentChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },

    // Card Footer: Applied Date + Details View
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.xs + 4,
        marginTop: theme.spacing.xs,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    appliedDateText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    viewDetailPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    viewDetailPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },

    // Manager View Specific Card Elements
    employeeHeaderGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    employeeAvatarCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: theme.colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    employeeAvatarText: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.primary,
    },
    employeeInfo: {
        flex: 1,
    },
    employeeName: {
        fontSize: 13,
        fontWeight: '800',
        color: theme.colors.textPrimary,
    },
    employeeSubText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    approvalActionRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        paddingTop: theme.spacing.sm,
        marginTop: theme.spacing.xs,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    rejectActionBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.status.dangerSubtle,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.status.dangerBorder,
        gap: 4,
    },
    rejectActionText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.status.danger,
    },
    approveActionBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.status.success,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        gap: 4,
    },
    approveActionText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Detail Bottom Sheet
    detailBody: {
        paddingTop: theme.spacing.xs,
        paddingBottom: theme.spacing.lg,
    },
    detailHeroCard: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    detailHeroTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    detailDaysHeroPill: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    detailDaysHeroText: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.textPrimary,
    },
    detailHeroDateRange: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    detailHeroDurationLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    detailSection: {
        marginBottom: theme.spacing.md,
    },
    detailSectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: theme.spacing.xs + 2,
    },
    detailEmployeeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    detailGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    detailGridItem: {
        width: '48%',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.sm + 2,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    detailGridLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    detailGridValue: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    detailReasonBox: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    detailReasonText: {
        fontSize: 13,
        color: theme.colors.textPrimary,
        lineHeight: 20,
    },
    detailRejectionBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: theme.colors.status.dangerSubtle,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.status.dangerBorder,
    },
    detailRejectionContent: {
        flex: 1,
    },
    detailRejectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: theme.colors.status.danger,
        marginBottom: 2,
    },
    detailRejectionText: {
        fontSize: 12,
        color: theme.colors.status.danger,
        lineHeight: 18,
    },
    detailAttachmentsList: {
        gap: theme.spacing.xs + 2,
    },
    detailAttachmentItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.sm + 2,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    detailAttachmentLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flex: 1,
    },
    detailAttachmentName: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    detailFooterContainer: {
        paddingTop: theme.spacing.sm,
    },
    detailCancelBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.status.dangerSubtle,
        paddingVertical: 14,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.status.dangerBorder,
        gap: 8,
    },
    detailCancelBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: theme.colors.status.danger,
    },
    detailManagerActionRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    detailRejectBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.status.dangerSubtle,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.status.dangerBorder,
        gap: 4,
    },
    detailRejectBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.status.danger,
    },
    detailApproveBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.status.success,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: 4,
    },
    detailApproveBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    modalActionButtonsGroup: {
        gap: theme.spacing.sm,
        paddingTop: theme.spacing.xs,
    },

    // Rejection Modal
    rejectionModalContent: {
        paddingTop: theme.spacing.xs,
        paddingBottom: theme.spacing.md,
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
        height: 95,
        textAlignVertical: 'top',
        fontSize: 13,
    },
    charCounter: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        textAlign: 'right',
        marginTop: 4,
        marginBottom: theme.spacing.sm,
    },
}));
