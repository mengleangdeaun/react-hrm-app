import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { AlertCircle, Clock, Check } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppText } from '../AppText';
import { AppBottomSheet } from '../common/AppBottomSheet';
import { useAttendanceGuard, ReasonPresetItem } from '../../hooks/useAttendanceGuard';

export type { ReasonPresetItem };

interface AttendanceReasonModalProps {
    visible: boolean;
    reasonType?: 'late' | 'early_departure' | 'early' | string;
    delayMinutes?: number;
    isLoading?: boolean;
    submitLabel?: string;
    presets?: ReasonPresetItem[];
    onProceed: (reason: string) => void;
    onCancel: () => void;
}

export const AttendanceReasonModal: React.FC<AttendanceReasonModalProps> = ({
    visible,
    reasonType = 'late',
    delayMinutes = 0,
    isLoading = false,
    submitLabel,
    presets,
    onProceed,
    onCancel,
}) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;

    // Resilient fallback to bootstrap endpoint presets if not passed as prop
    const { reasonPresets: hookReasonPresets } = useAttendanceGuard();

    const isLate = reasonType === 'late';
    const isEarly = reasonType === 'early' || reasonType === 'early_departure';

    // Dynamic backend reason_presets directly from DB via /employee-app/bootstrap
    const activePresetsList = useMemo(() => {
        const sourceList = (Array.isArray(presets) && presets.length > 0)
            ? presets
            : (Array.isArray(hookReasonPresets) && hookReasonPresets.length > 0)
            ? hookReasonPresets
            : [];

        if (!Array.isArray(sourceList) || sourceList.length === 0) {
            return [];
        }

        return sourceList
            .filter((p) => {
                const isActive = p.is_active !== false;
                if (!isActive) return false;
                if (!p.type || p.type === 'both') return true;
                if (isLate && p.type === 'late') return true;
                if (isEarly && (p.type === 'early' || p.type === 'early_departure')) return true;
                return false;
            })
            .map((p) => ({
                id: String(p.id ?? p.reason_text),
                label: p.reason_text?.trim() || '',
            }))
            .filter((p) => p.label.length > 0);
    }, [presets, hookReasonPresets, isLate, isEarly]);

    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');

    // Reset fields whenever modal opens
    useEffect(() => {
        if (visible) {
            setSelectedPreset('');
            setCustomReason('');
        }
    }, [visible]);

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

    const title = isLate
        ? t('late_arrival_reason', 'Late Arrival Reason')
        : t('early_departure_reason', 'Early Departure Reason');

    const subtitle = delayMinutes > 0
        ? (isLate
            ? `${t('shift_delayed_by', 'Shift delayed by')} ~${delayMinutes} ${t('mins', 'mins')}`
            : `${t('departing_early_by', 'Departing')} ~${delayMinutes} ${t('mins_early', 'mins early')}`)
        : undefined;

    return (
        <AppBottomSheet
            visible={visible}
            onClose={onCancel}
            title={title}
            subtitle={subtitle}
            footer={
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
                            {submitLabel || (isLate ? t('proceed_to_scan', 'Proceed to Scan') : t('confirm_and_proceed', 'Confirm & Proceed'))}
                        </AppText>
                    )}
                </TouchableOpacity>
            }
        >
            {/* Policy note */}
            <View style={[styles.infoBox, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}>
                <AppText style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    {t('policy_reason_note', 'Company policy requires an authorized explanation for attendance adjustments.')}
                </AppText>
            </View>

            {/* Quick Presets from Backend DB */}
            {activePresetsList.length > 0 && (
                <View style={styles.presetsSection}>
                    <AppText style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
                        {t('quick_select_reason', 'Quick Select Reason:')}
                    </AppText>
                    <View style={styles.presetsGrid}>
                        {activePresetsList.map((item) => {
                            const active = selectedPreset === item.label;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.presetChip,
                                        {
                                            backgroundColor: active ? theme.colors.brand : theme.colors.surfaceSubtle,
                                            borderColor: active ? theme.colors.brand : theme.colors.border,
                                        },
                                    ]}
                                    onPress={() => handleSelectPreset(item.label)}
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
                                        {item.label}
                                    </AppText>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* Custom Reason Input */}
            <AppText style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
                {activePresetsList.length > 0
                    ? t('or_custom_explanation', 'Or specify custom explanation:')
                    : t('specify_reason_explanation', 'Specify reason explanation:')}
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
        </AppBottomSheet>
    );
};

const styles = StyleSheet.create({
    infoBox: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        marginBottom: 14,
    },
    infoText: {
        fontSize: 12,
        lineHeight: 17,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    presetsSection: {
        marginBottom: 4,
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
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    presetText: {
        fontSize: 13,
    },
    input: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    submitButton: {
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.45,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
