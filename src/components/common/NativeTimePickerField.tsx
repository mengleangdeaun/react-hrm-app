import React, { useState } from 'react';
import {
    View,
    TouchableOpacity,
    Modal,
    StyleSheet,
} from 'react-native';
import { AppText as Text } from '../AppText';
import * as Haptics from 'expo-haptics';
import { Clock, X, Check, ChevronUp, ChevronDown } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';

export interface NativeTimePickerFieldProps {
    label?: string;
    value: string; // HH:mm (24-hour format)
    onChange: (timeStr: string) => void;
    containerStyle?: any;
    error?: string;
}

const COMMON_PRESETS = ['08:00', '08:30', '09:00', '12:00', '13:00', '17:00', '17:30', '18:00'];

export const NativeTimePickerField: React.FC<NativeTimePickerFieldProps> = ({
    label,
    value,
    onChange,
    containerStyle,
    error,
}) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [modalVisible, setModalVisible] = useState(false);

    // Parse Initial HH and mm
    const initialParts = (value || '08:00').split(':');
    const [hours, setHours] = useState<number>(parseInt(initialParts[0], 10) || 8);
    const [minutes, setMinutes] = useState<number>(parseInt(initialParts[1], 10) || 0);

    const formatDisplay = (h: number, m: number) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const displayM = m < 10 ? `0${m}` : m;
        return `${displayH < 10 ? '0' : ''}${displayH}:${displayM} ${period}`;
    };

    const handleOpen = () => {
        const parts = (value || '08:00').split(':');
        setHours(parseInt(parts[0], 10) || 8);
        setMinutes(parseInt(parts[1], 10) || 0);
        setModalVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const handleConfirm = () => {
        const hStr = hours < 10 ? `0${hours}` : `${hours}`;
        const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
        onChange(`${hStr}:${mStr}`);
        setModalVisible(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    };

    const handlePreset = (preset: string) => {
        const parts = preset.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        setHours(h);
        setMinutes(m);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const stepHour = (delta: number) => {
        setHours((prev) => {
            let next = (prev + delta) % 24;
            if (next < 0) next += 24;
            return next;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const stepMinute = (delta: number) => {
        setMinutes((prev) => {
            let next = (prev + delta) % 60;
            if (next < 0) next += 60;
            return next;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    {label}
                </Text>
            )}

            <TouchableOpacity
                onPress={handleOpen}
                activeOpacity={0.75}
                style={[
                    styles.fieldWrapper,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: error ? theme.colors.status.danger : theme.colors.border,
                    },
                ]}
            >
                <View style={styles.iconContainer}>
                    <Clock color={theme.colors.primary} size={18} />
                </View>
                <Text
                    style={[
                        styles.fieldText,
                        {
                            color: value ? theme.colors.textPrimary : theme.colors.textDisabled,
                        },
                    ]}
                >
                    {value ? formatDisplay(hours, minutes) : 'Select Time'}
                </Text>
            </TouchableOpacity>

            {error && (
                <Text style={[styles.errorText, { color: theme.colors.status.danger }]}>
                    {error}
                </Text>
            )}

            {/* Native Time Picker Bottom Sheet Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity
                        style={styles.backdropDismiss}
                        activeOpacity={1}
                        onPress={() => setModalVisible(false)}
                    />

                    <View style={[styles.sheetContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        {/* Sheet Handle */}
                        <View style={styles.sheetHandle} />

                        {/* Sheet Header */}
                        <View style={styles.sheetHeader}>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={[styles.circleBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                            >
                                <X color={theme.colors.textPrimary} size={18} />
                            </TouchableOpacity>
                            <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
                                {label || 'Select Time'}
                            </Text>
                            <TouchableOpacity
                                onPress={handleConfirm}
                                style={[styles.circleBtn, { backgroundColor: theme.colors.primary }]}
                            >
                                <Check color="#FFFFFF" size={18} />
                            </TouchableOpacity>
                        </View>

                        {/* Quick Presets */}
                        <View style={styles.presetsWrapper}>
                            {COMMON_PRESETS.map((p) => {
                                const isCurrent = value === p;
                                return (
                                    <TouchableOpacity
                                        key={p}
                                        onPress={() => handlePreset(p)}
                                        style={[
                                            styles.presetChip,
                                            {
                                                backgroundColor: isCurrent ? theme.colors.primarySubtle : theme.colors.surfaceSubtle,
                                                borderColor: isCurrent ? theme.colors.primary : 'transparent',
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.presetText,
                                                { color: isCurrent ? theme.colors.primary : theme.colors.textPrimary },
                                            ]}
                                        >
                                            {p}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Stepper Controls for Hours & Minutes */}
                        <View style={styles.stepperContainer}>
                            {/* Hours Column */}
                            <View style={styles.stepperCol}>
                                <TouchableOpacity
                                    onPress={() => stepHour(1)}
                                    style={[styles.stepperArrowBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                                >
                                    <ChevronUp color={theme.colors.textPrimary} size={20} />
                                </TouchableOpacity>
                                <View style={[styles.stepperValueBox, { backgroundColor: theme.colors.surfaceSubtle }]}>
                                    <Text style={[styles.stepperValueText, { color: theme.colors.textPrimary }]}>
                                        {hours < 10 ? `0${hours}` : hours}
                                    </Text>
                                    <Text style={[styles.stepperUnitLabel, { color: theme.colors.textSecondary }]}>HR</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => stepHour(-1)}
                                    style={[styles.stepperArrowBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                                >
                                    <ChevronDown color={theme.colors.textPrimary} size={20} />
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.stepperColon, { color: theme.colors.textPrimary }]}>:</Text>

                            {/* Minutes Column */}
                            <View style={styles.stepperCol}>
                                <TouchableOpacity
                                    onPress={() => stepMinute(5)}
                                    style={[styles.stepperArrowBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                                >
                                    <ChevronUp color={theme.colors.textPrimary} size={20} />
                                </TouchableOpacity>
                                <View style={[styles.stepperValueBox, { backgroundColor: theme.colors.surfaceSubtle }]}>
                                    <Text style={[styles.stepperValueText, { color: theme.colors.textPrimary }]}>
                                        {minutes < 10 ? `0${minutes}` : minutes}
                                    </Text>
                                    <Text style={[styles.stepperUnitLabel, { color: theme.colors.textSecondary }]}>MIN</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => stepMinute(-5)}
                                    style={[styles.stepperArrowBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                                >
                                    <ChevronDown color={theme.colors.textPrimary} size={20} />
                                </TouchableOpacity>
                            </View>

                            {/* Period Badge (AM / PM) */}
                            <View style={[styles.periodBadge, { backgroundColor: theme.colors.primarySubtle }]}>
                                <Text style={[styles.periodText, { color: theme.colors.primary }]}>
                                    {hours >= 12 ? 'PM' : 'AM'}
                                </Text>
                            </View>
                        </View>

                        {/* Confirm Button */}
                        <TouchableOpacity
                            onPress={handleConfirm}
                            style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.confirmBtnText}>
                                Select {formatDisplay(hours, minutes)}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 14,
        width: '100%',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    fieldWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        paddingHorizontal: 12,
    },
    iconContainer: {
        marginRight: 10,
    },
    fieldText: {
        fontSize: 14,
        fontWeight: '600',
    },
    errorText: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
        marginLeft: 2,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'flex-end',
    },
    backdropDismiss: {
        flex: 1,
    },
    sheetContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        paddingHorizontal: 20,
        paddingBottom: 36,
        paddingTop: 10,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(150, 150, 150, 0.4)',
        alignSelf: 'center',
        marginBottom: 14,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    circleBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    presetsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 18,
        justifyContent: 'center',
    },
    presetChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    presetText: {
        fontSize: 12,
        fontWeight: '600',
    },
    stepperContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
    },
    stepperCol: {
        alignItems: 'center',
        gap: 6,
    },
    stepperArrowBtn: {
        width: 44,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperValueBox: {
        width: 64,
        height: 58,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperValueText: {
        fontSize: 26,
        fontWeight: '800',
        lineHeight: 30,
    },
    stepperUnitLabel: {
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    stepperColon: {
        fontSize: 28,
        fontWeight: '800',
    },
    periodBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        alignSelf: 'center',
    },
    periodText: {
        fontSize: 14,
        fontWeight: '800',
    },
    confirmBtn: {
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
