import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Clock, X } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../context/LanguageContext';
import { AttendanceClockInResponse } from '../types';

interface AttendanceSuccessViewProps {
    punchResult: AttendanceClockInResponse | null;
    onReturnToDashboard: () => void;
    onViewHistory: () => void;
}

export const AttendanceSuccessView: React.FC<AttendanceSuccessViewProps> = ({
    punchResult,
    onReturnToDashboard,
    onViewHistory,
}) => {
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    return (
        <SafeAreaView {...({ style: styles.fullScreenSuccess } as any)}>
            {/* Clean Top Bar */}
            <View style={styles.successTopBar}>
                <TouchableOpacity
                    style={styles.successCloseBtn}
                    onPress={onReturnToDashboard}
                    activeOpacity={0.7}
                    accessibilityLabel={t('close', 'Close')}
                >
                    <X color={theme.colors.textSecondary} size={22} />
                </TouchableOpacity>
            </View>

            {/* Centered Success Confirmation Body */}
            <View style={styles.successBody}>
                <View style={styles.successBadgeOuter}>
                    <View style={styles.successBadgeMiddle}>
                        <View style={styles.successBadgeInner}>
                            <CheckCircle2 color="#10B981" size={48} />
                        </View>
                    </View>
                </View>

                <AppText style={styles.successTitle}>
                    {t('attendance_recorded', 'Attendance Recorded!')}
                </AppText>

                {Boolean(punchResult?.message) && (
                    <AppText style={styles.successSubtitle}>
                        {punchResult?.message}
                    </AppText>
                )}

                {/* Formatted Timestamp Pill */}
                {Boolean(punchResult?.time) && (
                    <View style={styles.timePill}>
                        <Clock size={16} color="#059669" style={{ marginRight: 6 }} />
                        <AppText style={styles.timePillText}>
                            {punchResult?.time}
                        </AppText>
                    </View>
                )}

                <AppText style={styles.autoReturnHint}>
                    {t('returning_to_dashboard', 'Returning to dashboard in a moment...')}
                </AppText>
            </View>

            {/* Bottom Actions */}
            <View style={styles.successActions}>
                <TouchableOpacity
                    style={styles.primarySuccessBtn}
                    onPress={onReturnToDashboard}
                    activeOpacity={0.85}
                >
                    <AppText style={styles.primarySuccessBtnText}>
                        {t('back_to_dashboard', 'Back to Dashboard')}
                    </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondarySuccessBtn}
                    onPress={onViewHistory}
                    activeOpacity={0.8}
                >
                    <AppText style={styles.secondarySuccessBtnText}>
                        {t('view_attendance_history', 'View Attendance History')}
                    </AppText>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    fullScreenSuccess: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    successTopBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingTop: 12,
    },
    successCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: (theme.colors as any).surfaceSubtle || theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successBody: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    successBadgeOuter: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successBadgeMiddle: {
        width: 86,
        height: 86,
        borderRadius: 43,
        backgroundColor: 'rgba(16, 185, 129, 0.16)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successBadgeInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    timePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.10)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.25)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 16,
    },
    timePillText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#059669',
    },
    autoReturnHint: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    successActions: {
        gap: 12,
        width: '100%',
    },
    primarySuccessBtn: {
        backgroundColor: theme.colors.brand,
        paddingVertical: 15,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    primarySuccessBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    secondarySuccessBtn: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: 14,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    secondarySuccessBtnText: {
        color: theme.colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
}));
