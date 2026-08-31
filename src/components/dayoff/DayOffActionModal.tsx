import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TextInput,
} from 'react-native';
import { AppText as Text } from '../AppText';
import { Check, X, AlertTriangle, MessageSquare } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { useTranslation } from '../../context/LanguageContext';
import { AppButton } from '../common/AppButton';
import { AppBottomSheet } from '../common/AppBottomSheet';

export interface DayOffActionModalProps {
    visible: boolean;
    mode: 'approve' | 'reject' | 'cancel' | null;
    isLoading?: boolean;
    onClose: () => void;
    onConfirm: (reason?: string) => void;
}

export const DayOffActionModal: React.FC<DayOffActionModalProps> = ({
    visible,
    mode,
    isLoading = false,
    onClose,
    onConfirm,
}) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;

    const [reason, setReason] = useState('');

    useEffect(() => {
        if (visible) {
            setReason('');
        }
    }, [visible]);

    if (!mode) return null;

    const config = {
        approve: {
            title: t('approve_request_title', 'Approve Day-Off Request'),
            message: t('approve_day_off_msg', "Are you sure you want to approve this day-off change? The employee's schedule will be updated immediately."),
            icon: <Check color={theme.colors.status.success} size={28} />,
            iconBg: theme.colors.status.successSubtle,
            confirmLabel: t('confirm_approval', 'Confirm Approval'),
            confirmVariant: 'primary' as const,
        },
        reject: {
            title: t('reject_request_title', 'Reject Day-Off Request'),
            message: t('reject_request_msg', 'Please provide a reason for rejecting this request. This will be shared with the employee.'),
            icon: <X color={theme.colors.status.danger} size={28} />,
            iconBg: theme.colors.status.dangerSubtle,
            confirmLabel: t('confirm_rejection', 'Confirm Rejection'),
            confirmVariant: 'destructive' as const,
        },
        cancel: {
            title: t('cancel_request_title', 'Cancel Request'),
            message: t('cancel_request_msg', 'Are you sure you want to cancel your day-off change request? This action cannot be undone.'),
            icon: <AlertTriangle color={theme.colors.status.warning} size={28} />,
            iconBg: theme.colors.status.warningSubtle,
            confirmLabel: t('yes_cancel', 'Yes, Cancel Request'),
            confirmVariant: 'destructive' as const,
        },
    }[mode];

    const handleConfirm = () => {
        if (mode === 'reject' && !reason.trim()) return;
        onConfirm(reason.trim());
    };

    return (
        <AppBottomSheet
            visible={visible}
            onClose={onClose}
            title={config.title}
            footer={
                <View style={styles.buttonGroup}>
                    <AppButton
                        title={config.confirmLabel}
                        onPress={handleConfirm}
                        variant={config.confirmVariant}
                        loading={isLoading}
                        disabled={isLoading || (mode === 'reject' && !reason.trim())}
                        style={styles.actionBtn}
                    />
                    <AppButton
                        title={t('cancel', 'Cancel')}
                        onPress={onClose}
                        variant="secondary"
                        disabled={isLoading}
                        style={styles.actionBtn}
                    />
                </View>
            }
        >
            {/* Visual Icon Circle */}
            <View style={styles.iconCenter}>
                <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
                    {config.icon}
                </View>
            </View>

            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
                {config.message}
            </Text>

            {/* Rejection Reason Text Area */}
            {mode === 'reject' && (
                <View style={styles.inputContainer}>
                    <View style={styles.inputHeader}>
                        <MessageSquare color={theme.colors.textSecondary} size={14} />
                        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                            {t('rejection_reason_required', 'Rejection Reason (Required)')}
                        </Text>
                    </View>
                    <TextInput
                        value={reason}
                        onChangeText={setReason}
                        placeholder={t('type_rejection_reason', 'Type rejection reason here...')}
                        placeholderTextColor={theme.colors.textMuted}
                        multiline
                        numberOfLines={3}
                        style={[
                            styles.textArea,
                            {
                                backgroundColor: theme.colors.surfaceSubtle,
                                color: theme.colors.textPrimary,
                                borderColor: theme.colors.border,
                            },
                        ]}
                    />
                </View>
            )}
        </AppBottomSheet>
    );
};

const styles = StyleSheet.create({
    iconCenter: {
        alignItems: 'center',
        marginVertical: 8,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 8,
    },
    inputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    textArea: {
        width: '100%',
        minHeight: 80,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        textAlignVertical: 'top',
    },
    buttonGroup: {
        width: '100%',
        gap: 8,
        paddingBottom: 4,
    },
    actionBtn: {
        width: '100%',
    },
});
