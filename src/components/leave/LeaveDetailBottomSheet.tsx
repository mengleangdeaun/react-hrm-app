import React, { FC } from 'react';
import { View, TouchableOpacity, Linking } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
    Calendar,
    Clock,
    AlertCircle,
    Paperclip,
    ExternalLink,
    Ban,
    Check,
    X,
} from 'lucide-react-native';
import { AppText as Text } from '../AppText';
import { StatusBadge } from '../common/StatusBadge';
import { AppBottomSheet } from '../common/AppBottomSheet';
import { LeaveRequest } from '../../api/leave';
import { formatDateDisplay, formatDateRangeDisplay } from '../../utils/dateTime';
import { getLeaveTypeName, getDurationTypeLabel } from './leaveUtils';

export interface LeaveDetailBottomSheetProps {
    visible: boolean;
    item: LeaveRequest | null;
    isManagerView?: boolean;
    t: (key: string, fallback?: string, params?: any) => string;
    onClose: () => void;
    onCancelRequest: (id: number) => void;
    onApproveRequest: (id: number) => void;
    onRejectRequest: (item: LeaveRequest) => void;
}

export const LeaveDetailBottomSheet: FC<LeaveDetailBottomSheetProps> = ({
    visible,
    item,
    isManagerView = false,
    t,
    onClose,
    onCancelRequest,
    onApproveRequest,
    onRejectRequest,
}) => {
    const { theme } = useUnistyles();
    const styles = stylesheet;

    if (!item) return null;

    const statusStr = (item.status || 'pending').toLowerCase();
    const isPending = statusStr === 'pending';
    const isRejected = statusStr === 'rejected';
    const typeName = getLeaveTypeName(item.leave_type, item, t('leave', 'Leave'));
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
                        accessibilityRole="button"
                        accessibilityLabel={t('reject', 'Reject')}
                    >
                        <X size={16} color={theme.colors.status.danger} />
                        <Text style={styles.detailRejectBtnText}>{t('reject', 'Reject')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.detailApproveBtn}
                        onPress={() => onApproveRequest(item.id)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={t('approve', 'Approve')}
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
                    accessibilityRole="button"
                    accessibilityLabel={t('cancel_leave_request', 'Cancel Leave Application')}
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
                        <StatusBadge status={statusStr} size="md" label={statusStr.toUpperCase()} />
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
                                    accessibilityRole="button"
                                    accessibilityLabel={`${t('document', 'Document')} #${idx + 1}`}
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

const stylesheet = StyleSheet.create((theme) => ({
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
        width: '100%',
    },
    detailManagerActionRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    detailRejectBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.status.dangerSubtle,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.status.dangerBorder,
        gap: 6,
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
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
        gap: 6,
    },
    detailApproveBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    detailCancelBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.status.dangerSubtle,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.status.dangerBorder,
        gap: 6,
    },
    detailCancelBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.status.danger,
    },
}));
