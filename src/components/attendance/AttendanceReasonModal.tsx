import React, { useState } from 'react';
import {
    View,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { AlertCircle, Clock, Check, X } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppText } from '../AppText';

interface AttendanceReasonModalProps {
    visible: boolean;
    reasonType?: 'late' | 'early_departure' | string;
    delayMinutes?: number;
    isLoading?: boolean;
    onProceed: (reason: string) => void;
    onCancel: () => void;
}

const LATE_PRESETS = [
    { key: 'preset_heavy_traffic', fallback: 'Heavy Traffic' },
    { key: 'preset_vehicle_breakdown', fallback: 'Vehicle Breakdown' },
    { key: 'preset_severe_weather', fallback: 'Severe Weather' },
    { key: 'preset_personal_emergency', fallback: 'Personal Emergency' },
    { key: 'preset_public_transport', fallback: 'Public Transport Delay' },
    { key: 'preset_client_meeting', fallback: 'Client Meeting' },
];

const EARLY_PRESETS = [
    { key: 'preset_medical_appointment', fallback: 'Medical Appointment' },
    { key: 'preset_family_emergency', fallback: 'Family Emergency' },
    { key: 'preset_client_visit', fallback: 'Approved Client Visit' },
    { key: 'preset_feeling_unwell', fallback: 'Feeling Unwell' },
    { key: 'preset_personal_matter', fallback: 'Personal Matter' },
];

export const AttendanceReasonModal: React.FC<AttendanceReasonModalProps> = ({
    visible,
    reasonType = 'late',
    delayMinutes = 0,
    isLoading = false,
    onProceed,
    onCancel,
}) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;

    const isLate = reasonType === 'late';
    const presets = isLate ? LATE_PRESETS : EARLY_PRESETS;

    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');

    const handleSelectPreset = (presetLabel: string) => {
        if (selectedPreset === presetLabel) {
            setSelectedPreset('');
            setCustomReason('');
        } else {
            setSelectedPreset(presetLabel);
            setCustomReason(presetLabel);
        }
    };

    const finalReason = customReason.trim();
    const canSubmit = finalReason.length > 0;

    const handleSubmit = () => {
        if (!canSubmit || isLoading) return;
        onProceed(finalReason);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onCancel}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalBackdrop}
            >
                <View style={[styles.sheetContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View style={styles.headerLeft}>
                            <View
                                style={[
                                    styles.iconBadge,
                                    {
                                        backgroundColor: isLate
                                            ? 'rgba(234, 88, 12, 0.15)'
                                            : 'rgba(225, 29, 72, 0.15)',
                                    },
                                ]}
                            >
                                {isLate ? (
                                    <Clock color="#EA580C" size={20} />
                                ) : (
                                    <AlertCircle color="#E11D48" size={20} />
                                )}
                            </View>
                            <View style={styles.headerTitleGroup}>
                                <AppText style={[styles.title, { color: theme.colors.textPrimary }]}>
                                    {isLate
                                        ? t('late_arrival_reason', 'Late Arrival Reason')
                                        : t('early_departure_reason', 'Early Departure Reason')}
                                </AppText>
                                {delayMinutes > 0 && (
                                    <AppText style={styles.subtitle}>
                                        {isLate
                                            ? `${t('shift_delayed_by', 'Shift delayed by')} ~${delayMinutes} ${t('mins', 'mins')}`
                                            : `${t('departing_early_by', 'Departing')} ~${delayMinutes} ${t('mins_early', 'mins early')}`}
                                    </AppText>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                            onPress={onCancel}
                            disabled={isLoading}
                        >
                            <X color={theme.colors.textSecondary} size={18} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollBody}
                    >
                        {/* Policy note */}
                        <View style={[styles.infoBox, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}>
                            <AppText style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                                {t('policy_reason_note', 'Company policy requires an authorized explanation for attendance adjustments.')}
                            </AppText>
                        </View>

                        {/* Quick Presets */}
                        <AppText style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
                            {t('quick_select_reason', 'Quick Select Reason:')}
                        </AppText>
                        <View style={styles.presetsGrid}>
                            {presets.map((item) => {
                                const localizedLabel = t(item.key, item.fallback);
                                const active = selectedPreset === localizedLabel;
                                return (
                                    <TouchableOpacity
                                        key={item.key}
                                        style={[
                                            styles.presetChip,
                                            {
                                                backgroundColor: active ? theme.colors.brand : theme.colors.surfaceSubtle,
                                                borderColor: active ? theme.colors.brand : theme.colors.border,
                                            },
                                        ]}
                                        onPress={() => handleSelectPreset(localizedLabel)}
                                        activeOpacity={0.7}
                                    >
                                        {active && <Check size={14} color="#FFFFFF" style={{ marginRight: 4 }} />}
                                        <AppText
                                            style={[
                                                styles.presetText,
                                                { color: active ? '#FFFFFF' : theme.colors.textPrimary },
                                                active && { fontWeight: '700' },
                                            ]}
                                        >
                                            {localizedLabel}
                                        </AppText>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Custom Reason Input */}
                        <AppText style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
                            {t('or_custom_explanation', 'Or specify custom explanation:')}
                        </AppText>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: theme.colors.surfaceSubtle,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.textPrimary,
                                },
                            ]}
                            placeholder={t('enter_detailed_reason', 'Enter detailed reason here...')}
                            placeholderTextColor={theme.colors.textDisabled}
                            multiline
                            numberOfLines={3}
                            value={customReason}
                            onChangeText={(text: string) => {
                                setCustomReason(text);
                                setSelectedPreset('');
                            }}
                            maxLength={300}
                        />

                        {/* Action Buttons */}
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                { backgroundColor: theme.colors.brand },
                                !canSubmit && styles.submitButtonDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={!canSubmit || isLoading}
                            activeOpacity={0.85}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <AppText style={styles.submitButtonText}>
                                    {t('submit_record_attendance', 'Submit & Record Attendance')}
                                </AppText>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onCancel}
                            disabled={isLoading}
                        >
                            <AppText style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>
                                {t('cancel', 'Cancel')}
                            </AppText>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    sheetContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        maxHeight: '88%',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    headerTitleGroup: {
        flex: 1,
    },
    iconBadge: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 12,
        color: '#EA580C',
        fontWeight: '600',
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    scrollBody: {
        paddingBottom: 16,
    },
    infoBox: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    infoText: {
        fontSize: 12,
        lineHeight: 16,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 10,
        marginTop: 4,
    },
    presetsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    presetChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        minHeight: 36,
    },
    presetText: {
        fontSize: 13,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    submitButton: {
        borderRadius: 16,
        paddingVertical: 14,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    cancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 4,
        minHeight: 40,
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
