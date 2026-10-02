import React, { FC } from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppBottomSheet } from '../common/AppBottomSheet';
import { AppButton } from '../common/AppButton';
import { AppInput } from '../common/AppInput';
import { LeaveRequest } from '../../api/leave';

export interface LeaveRejectionBottomSheetProps {
    visible: boolean;
    rejectingItem: LeaveRequest | null;
    rejectionReason: string;
    isSubmitting: boolean;
    t: (key: string, fallback?: string, params?: any) => string;
    onChangeReason: (text: string) => void;
    onClose: () => void;
    onConfirmReject: () => void;
}

export const LeaveRejectionBottomSheet: FC<LeaveRejectionBottomSheetProps> = ({
    visible,
    rejectingItem,
    rejectionReason,
    isSubmitting,
    t,
    onChangeReason,
    onClose,
    onConfirmReject,
}) => {
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const employeeName =
        rejectingItem?.employee?.full_name ||
        rejectingItem?.employee_name ||
        t('colleague', 'Colleague');

    return (
        <AppBottomSheet
            visible={visible}
            onClose={onClose}
            title={t('reject_leave_app', 'Reject Leave Application')}
            subtitle={
                rejectingItem
                    ? `${t('employee', 'Employee')}: ${employeeName}`
                    : undefined
            }
            footer={
                <View style={styles.modalActionButtonsGroup}>
                    <AppButton
                        title={t('confirm_rejection', 'Confirm Rejection')}
                        onPress={onConfirmReject}
                        variant="destructive"
                        loading={isSubmitting}
                        disabled={isSubmitting || !rejectionReason.trim()}
                    />
                    <AppButton
                        title={t('cancel', 'Cancel')}
                        onPress={onClose}
                        variant="secondary"
                        disabled={isSubmitting}
                    />
                </View>
            }
        >
            <View style={styles.rejectionModalContent}>
                <AppInput
                    label={t('reason_for_rejection', 'Reason for Rejection')}
                    value={rejectionReason}
                    onChangeText={(text) => {
                        if (text.length <= 250) {
                            onChangeReason(text);
                        }
                    }}
                    placeholder={t('state_rejection_reason', 'State rejection reason for employee...')}
                    placeholderTextColor={theme.colors.textDisabled}
                    multiline
                    numberOfLines={3}
                    helperText={`${rejectionReason.length} / 250`}
                />
            </View>
        </AppBottomSheet>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    rejectionModalContent: {
        paddingTop: theme.spacing.xs,
        paddingBottom: theme.spacing.md,
    },
    modalActionButtonsGroup: {
        gap: theme.spacing.sm,
        width: '100%',
    },
}));
