import React, { memo, useCallback } from 'react';
import { View, Pressable, TouchableOpacity } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import {
    Calendar,
    Clock,
    AlertCircle,
    Paperclip,
    ChevronRight,
    Check,
    X,
} from 'lucide-react-native';
import { AppText as Text } from '../AppText';
import { StatusBadge } from '../common/StatusBadge';
import { LeaveRequest } from '../../api/leave';
import { formatDateDisplay, formatDateRangeDisplay } from '../../utils/dateTime';
import { getLeaveTypeName, getDurationTypeLabel } from './leaveUtils';

// -------------------------------------------------------------
// Component: My Leave Request Card
// -------------------------------------------------------------
export interface MyLeaveCardProps {
    req: LeaveRequest;
    t: (key: string, fallback?: string, params?: any) => string;
    onOpenDetail: (req: LeaveRequest) => void;
}

export const MyLeaveRequestCard = memo(({ req, t, onOpenDetail }: MyLeaveCardProps) => {
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const statusStr = (req.status || 'pending').toLowerCase();
    const isRejected = statusStr === 'rejected';
    const typeName = getLeaveTypeName(req.leave_type, req, t('leave', 'Leave'));

    const handlePressCard = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onOpenDetail(req);
    }, [req, onOpenDetail]);

    const daysCount = req.total_days || req.days_count || 1;
    const durationLabel = getDurationTypeLabel(req.duration_type, req.start_time, req.end_time, t);

    return (
        <Pressable
            style={styles.requestCard}
            onPress={handlePressCard}
            android_ripple={{ color: theme.colors.surfaceSubtle }}
            accessibilityRole="button"
            accessibilityLabel={`${typeName}, ${statusStr}, ${daysCount} days`}
        >
            <View style={styles.cardHeader}>
                <View style={styles.typeGroup}>
                    <Calendar color={theme.colors.primary} size={15} />
                    <Text style={styles.typeText} numberOfLines={1}>
                        {typeName.toUpperCase()}
                    </Text>
                </View>

                <StatusBadge status={statusStr} size="sm" label={statusStr.toUpperCase()} />
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
export interface ManagerApprovalCardProps {
    item: LeaveRequest;
    t: (key: string, fallback?: string, params?: any) => string;
    onApprove: (id: number) => void;
    onReject: (item: LeaveRequest) => void;
    onOpenDetail: (req: LeaveRequest) => void;
}

export const ManagerApprovalCard = memo(({ item, t, onApprove, onReject, onOpenDetail }: ManagerApprovalCardProps) => {
    const { theme } = useUnistyles();
    const styles = stylesheet;

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

    return (
        <Pressable
            style={styles.requestCard}
            onPress={() => onOpenDetail(item)}
            android_ripple={{ color: theme.colors.surfaceSubtle }}
            accessibilityRole="button"
            accessibilityLabel={`Approval request from ${employeeName}: ${typeName}, ${daysCount} days`}
        >
            <View style={styles.cardHeader}>
                <View style={styles.employeeHeaderGroup}>
                    <View style={styles.employeeAvatarCircle}>
                        <Text style={styles.employeeAvatarText}>{employeeInitials}</Text>
                    </View>
                    <View style={styles.employeeInfo}>
                        <Text style={styles.employeeName} numberOfLines={1}>{employeeName}</Text>
                        <Text style={styles.employeeSubText} numberOfLines={1}>
                            {typeName.toUpperCase()} • {daysCount} {daysCount > 1 ? t('days', 'Days') : t('day', 'Day')}
                        </Text>
                    </View>
                </View>

                <StatusBadge status={item.status || 'pending'} size="sm" />
            </View>

            <View style={styles.dateRow}>
                <Text style={styles.dateRangeText}>
                    {formatDateRangeDisplay(item.start_date, item.end_date)}
                </Text>
                <View style={styles.durationPill}>
                    <Text style={styles.durationPillText}>{durationLabel}</Text>
                </View>
            </View>

            <Text style={styles.reasonText} numberOfLines={2}>
                {item.reason}
            </Text>

            {item.attachments && item.attachments.length > 0 && (
                <View style={styles.attachmentChip}>
                    <Paperclip size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.attachmentChipText}>
                        {item.attachments.length} {item.attachments.length > 1 ? t('attachments', 'attachments') : t('attachment', 'attachment')}
                    </Text>
                </View>
            )}

            {/* Quick Manager Actions */}
            <View style={styles.approvalActionRow}>
                <TouchableOpacity
                    style={styles.rejectActionBtn}
                    onPress={() => onReject(item)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={t('reject', 'Reject')}
                >
                    <X size={15} color={theme.colors.status.danger} />
                    <Text style={styles.rejectActionText}>{t('reject', 'Reject')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.approveActionBtn}
                    onPress={() => onApprove(item.id)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={t('approve', 'Approve')}
                >
                    <Check size={15} color="#FFFFFF" />
                    <Text style={styles.approveActionText}>{t('approve', 'Approve')}</Text>
                </TouchableOpacity>
            </View>
        </Pressable>
    );
});

const stylesheet = StyleSheet.create((theme) => ({
    requestCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.cardPadding,
        marginHorizontal: theme.spacing.screenGutter,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: (theme.colors as any).borderSubtle || theme.colors.border,
        ...theme.shadows.xs,
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
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.xs + 4,
        marginTop: theme.spacing.xs,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: (theme.colors as any).divider || theme.colors.border,
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
}));
